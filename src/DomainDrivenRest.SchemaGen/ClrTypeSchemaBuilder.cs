using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using DomainDrivenRest.Abstractions;
using DomainDrivenRest.SystemTextJson;

namespace DomainDrivenRest.SchemaGen;

/// <summary>
/// Walks a CLR <see cref="Type"/> and produces a <see cref="TypeSchema"/> tree describing
/// exactly how the app's own <see cref="JsonSerializerOptions"/> will (de)serialize it.
/// Must always be given the app's real, registered JsonSerializerOptions (from MVC's or
/// minimal API's JsonOptions) rather than a fresh default instance, so the emitted schema
/// can never drift from actual runtime serialization behavior.
/// </summary>
public sealed class ClrTypeSchemaBuilder
{
    private readonly JsonSerializerOptions jsonOptions;

    public ClrTypeSchemaBuilder(JsonSerializerOptions jsonOptions)
    {
        // GetTypeInfo requires a resolver to be configured; ASP.NET Core's own JsonOptions
        // always has one, but a bare `new JsonSerializerOptions()` (e.g. in tests) does not.
        this.jsonOptions = jsonOptions.TypeInfoResolver is null
            ? new JsonSerializerOptions(jsonOptions) { TypeInfoResolver = new DefaultJsonTypeInfoResolver() }
            : jsonOptions;
    }

    private static readonly HashSet<Type> NumericTypes =
    [
        typeof(byte), typeof(sbyte), typeof(short), typeof(ushort),
        typeof(int), typeof(uint), typeof(long), typeof(ulong),
        typeof(float), typeof(double), typeof(decimal),
    ];

    /// <summary>
    /// Builds the schema for <paramref name="type"/> and every type it transitively
    /// references, returning a flat deduplicated table keyed by schema Id. The entry
    /// point's own Id is <see cref="SchemaId"/>.
    /// </summary>
    public IReadOnlyDictionary<string, TypeSchema> BuildDocument(Type type, out string rootId)
    {
        var table = new Dictionary<string, TypeSchema>();
        var inProgress = new HashSet<Type>();
        Build(type, table, inProgress);
        rootId = SchemaId(type);
        return table;
    }

    public TypeSchemaRef BuildRef(Type type, Dictionary<string, TypeSchema> table)
    {
        var inProgress = new HashSet<Type>();
        Build(type, table, inProgress);
        return new TypeSchemaRef { Ref = SchemaId(type) };
    }

    private static string SchemaId(Type type) => type.FullName ?? type.Name;

    private void Build(Type type, Dictionary<string, TypeSchema> table, HashSet<Type> inProgress)
    {
        var id = SchemaId(type);
        if (table.ContainsKey(id) || inProgress.Contains(type))
        {
            return;
        }

        // Nullable<T>: unwrap and build the underlying type; callers mark Nullable on the ref site.
        var underlying = Nullable.GetUnderlyingType(type);
        if (underlying is not null)
        {
            Build(underlying, table, inProgress);
            return;
        }

        inProgress.Add(type);

        JsonTypeInfo? typeInfo = TryGetTypeInfo(type);

        if (type.IsEnum)
        {
            table[id] = BuildEnumSchema(type, id, typeInfo);
        }
        else if (IsDictionary(type, out var valueType))
        {
            Build(valueType, table, inProgress);
            table[id] = new TypeSchema
            {
                Id = id,
                Kind = SchemaKind.Dictionary,
                ClrTypeName = type.FullName ?? type.Name,
                AdditionalProperties = new TypeSchemaRef { Ref = SchemaId(valueType) },
            };
        }
        else if (IsCollection(type, out var itemType))
        {
            Build(itemType, table, inProgress);
            table[id] = new TypeSchema
            {
                Id = id,
                Kind = SchemaKind.Array,
                ClrTypeName = type.FullName ?? type.Name,
                Items = new TypeSchemaRef { Ref = SchemaId(itemType) },
            };
        }
        else if (TryGetPrimitiveType(type, out var primitiveType))
        {
            table[id] = new TypeSchema
            {
                Id = id,
                Kind = SchemaKind.Primitive,
                ClrTypeName = type.FullName ?? type.Name,
                PrimitiveType = primitiveType,
            };
        }
        else if (typeInfo is { Kind: JsonTypeInfoKind.Object } && HasOnlyRecognizedConverter(typeInfo))
        {
            table[id] = BuildObjectSchema(type, id, typeInfo, table, inProgress);
        }
        else
        {
            // Unrecognized custom converter or unsupported shape: degrade gracefully to an
            // opaque raw-JSON field rather than guessing at its structure incorrectly.
            table[id] = new TypeSchema
            {
                Id = id,
                Kind = SchemaKind.Primitive,
                ClrTypeName = type.FullName ?? type.Name,
                PrimitiveType = "json",
            };
        }

        inProgress.Remove(type);
    }

    private JsonTypeInfo? TryGetTypeInfo(Type type)
    {
        try
        {
            return jsonOptions.GetTypeInfo(type);
        }
        catch
        {
            return null;
        }
    }

    private bool HasOnlyRecognizedConverter(JsonTypeInfo typeInfo)
    {
        // The default object converter (no explicit [JsonConverter] on the type) is what
        // we know how to introspect property-by-property. Anything else (a user-supplied
        // custom converter for the whole type) is opaque to us.
        var converterTypeName = typeInfo.Converter.GetType().Name;
        return converterTypeName.Contains("ObjectConverter", StringComparison.Ordinal)
            || converterTypeName.Contains("ObjectDefaultConverter", StringComparison.Ordinal);
    }

    private TypeSchema BuildEnumSchema(Type type, string id, JsonTypeInfo? typeInfo)
    {
        var isStringEnum = typeInfo?.Converter is not null
            && typeInfo.Converter.GetType().Name.Contains("EnumConverter", StringComparison.Ordinal)
            && jsonOptions.Converters.Any(c => c.GetType().Name.Contains("JsonStringEnumConverter", StringComparison.Ordinal))
            || type.GetCustomAttribute<System.Text.Json.Serialization.JsonConverterAttribute>() is { ConverterType: not null } attr
                && attr.ConverterType!.Name.Contains("JsonStringEnumConverter", StringComparison.Ordinal);

        var names = Enum.GetNames(type);
        var members = names.Select(n => new EnumMember
        {
            Name = n,
            Value = Convert.ChangeType(Enum.Parse(type, n), Enum.GetUnderlyingType(type)),
        }).ToList();

        return new TypeSchema
        {
            Id = id,
            Kind = SchemaKind.Enum,
            ClrTypeName = type.FullName ?? type.Name,
            EnumMembers = members,
            IsStringEnum = isStringEnum,
        };
    }

    private TypeSchema BuildObjectSchema(
        Type type, string id, JsonTypeInfo typeInfo, Dictionary<string, TypeSchema> table, HashSet<Type> inProgress)
    {
        var properties = new List<PropertySchema>();

        foreach (var jsonProperty in typeInfo.Properties)
        {
            if (jsonProperty.Get is null && jsonProperty.Set is null)
            {
                continue;
            }

            var clrProperty = type.GetProperty(
                jsonProperty.Name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
                ?? type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                    .FirstOrDefault(p => string.Equals(p.Name, jsonProperty.Name, StringComparison.OrdinalIgnoreCase));

            var propertyType = jsonProperty.PropertyType;
            var isNullableValueType = Nullable.GetUnderlyingType(propertyType) is not null;
            var hasRequiredAttribute = clrProperty?.GetCustomAttribute<RequiredAttribute>() is not null;
            var isRequiredReferenceType = !propertyType.IsValueType && !IsNullableReferenceType(clrProperty);

            Build(propertyType, table, inProgress);

            var rules = clrProperty is not null ? ExtractRules(clrProperty) : null;
            var uiHint = clrProperty?.GetCustomAttribute<SchemaHintAttribute>()?.Kind.ToString();

            properties.Add(new PropertySchema
            {
                Name = jsonProperty.Name,
                ClrPropertyName = clrProperty?.Name ?? jsonProperty.Name,
                Schema = new TypeSchemaRef { Ref = SchemaId(Nullable.GetUnderlyingType(propertyType) ?? propertyType) },
                Required = jsonProperty.IsRequired || hasRequiredAttribute || (!isNullableValueType && isRequiredReferenceType),
                Rules = rules,
                UiHint = uiHint,
            });
        }

        return new TypeSchema
        {
            Id = id,
            Kind = SchemaKind.Object,
            ClrTypeName = type.FullName ?? type.Name,
            Properties = properties,
        };
    }

    /// <summary>True if the reference-typed property is annotated nullable (or unknown, when no CLR property could be resolved).</summary>
    private static bool IsNullableReferenceType(PropertyInfo? property)
    {
        if (property is null || property.PropertyType.IsValueType)
        {
            return true;
        }

        var context = new NullabilityInfoContext();
        var info = context.Create(property);
        return info.ReadState != NullabilityState.NotNull;
    }

    private static ValidationRules? ExtractRules(PropertyInfo property)
    {
        var attributes = property.GetCustomAttributes<ValidationAttribute>(inherit: true).ToList();
        if (attributes.Count == 0)
        {
            return null;
        }

        double? min = null, max = null;
        int? minLength = null, maxLength = null;
        string? pattern = null;
        string[]? allowedValues = null;

        foreach (var attribute in attributes)
        {
            switch (attribute)
            {
                case RangeAttribute range:
                    min = Convert.ToDouble(range.Minimum);
                    max = Convert.ToDouble(range.Maximum);
                    break;
                case StringLengthAttribute stringLength:
                    maxLength = stringLength.MaximumLength;
                    minLength = stringLength.MinimumLength > 0 ? stringLength.MinimumLength : null;
                    break;
                case MinLengthAttribute minLen:
                    minLength = minLen.Length;
                    break;
                case MaxLengthAttribute maxLen:
                    maxLength = maxLen.Length;
                    break;
                case RegularExpressionAttribute regex:
                    pattern = regex.Pattern;
                    break;
            }
        }

        if (min is null && max is null && minLength is null && maxLength is null && pattern is null && allowedValues is null)
        {
            return null;
        }

        return new ValidationRules
        {
            Minimum = min,
            Maximum = max,
            MinLength = minLength,
            MaxLength = maxLength,
            Pattern = pattern,
            AllowedValues = allowedValues,
        };
    }

    private static bool TryGetPrimitiveType(Type type, out string primitiveType)
    {
        if (type == typeof(string)) { primitiveType = "string"; return true; }
        if (type == typeof(bool)) { primitiveType = "boolean"; return true; }
        if (type == typeof(Guid)) { primitiveType = "guid"; return true; }
        if (type == typeof(DateTime) || type == typeof(DateTimeOffset)) { primitiveType = "date-time"; return true; }
        if (type == typeof(DateOnly)) { primitiveType = "date"; return true; }
        if (type == typeof(TimeOnly) || type == typeof(TimeSpan)) { primitiveType = "time"; return true; }
        if (NumericTypes.Contains(type))
        {
            primitiveType = type == typeof(float) || type == typeof(double) || type == typeof(decimal)
                ? "number"
                : "integer";
            return true;
        }

        primitiveType = "";
        return false;
    }

    private static bool IsCollection(Type type, out Type itemType)
    {
        if (type != typeof(string) && type.IsArray)
        {
            itemType = type.GetElementType()!;
            return true;
        }

        var enumerableInterface = type.GetInterfaces().Prepend(type)
            .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEnumerable<>));

        if (type != typeof(string) && enumerableInterface is not null && !IsDictionary(type, out _))
        {
            itemType = enumerableInterface.GetGenericArguments()[0];
            return true;
        }

        itemType = typeof(object);
        return false;
    }

    private static bool IsDictionary(Type type, out Type valueType)
    {
        var dictInterface = type.GetInterfaces().Prepend(type)
            .FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IDictionary<,>));

        if (dictInterface is not null)
        {
            var args = dictInterface.GetGenericArguments();
            if (args[0] == typeof(string))
            {
                valueType = args[1];
                return true;
            }
        }

        valueType = typeof(object);
        return false;
    }
}
