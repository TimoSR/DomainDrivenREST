using System.Text.Json;
using DomainDrivenRest.Features.SchemaDiscovery.Application;
using DomainDrivenRest.Features.SchemaDiscovery.Critical;
using DomainDrivenRest.Features.SchemaDiscovery.Domain;
using DomainDrivenRest.Features.SchemaDiscovery.Tests.Unit.Domain;
using Xunit;

namespace DomainDrivenRest.Features.SchemaDiscovery.Tests.Unit.Application;

public class ClrTypeSchemaBuilderTests
{
    private static IReadOnlyDictionary<string, TypeSchema> Build(Type type, out string rootId, JsonSerializerOptions? options = null)
    {
        var builder = new ClrTypeSchemaBuilder(options ?? new JsonSerializerOptions());
        return builder.BuildDocument(type, out rootId);
    }

    [Fact]
    public void Builds_object_schema_with_nested_properties()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var root = table[rootId];

        Assert.Equal(SchemaKind.Object, root.Kind);
        Assert.NotNull(root.Properties);
        Assert.Contains(root.Properties!, p => p.Name == "CustomerName");
        Assert.Contains(root.Properties!, p => p.Name == "ShippingAddress");
    }

    [Fact]
    public void Marks_Required_attribute_property_as_required()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var customerName = table[rootId].Properties!.Single(p => p.Name == "CustomerName");

        Assert.True(customerName.Required);
    }

    [Fact]
    public void Extracts_Range_rule()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var quantity = table[rootId].Properties!.Single(p => p.Name == "Quantity");

        Assert.NotNull(quantity.Rules);
        Assert.Equal(1, quantity.Rules!.Minimum);
        Assert.Equal(100, quantity.Rules!.Maximum);
    }

    [Fact]
    public void Extracts_RegularExpression_rule()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var currency = table[rootId].Properties!.Single(p => p.Name == "CurrencyCode");

        Assert.Equal("^[A-Z]{3}$", currency.Rules!.Pattern);
    }

    [Fact]
    public void Numeric_enum_is_not_marked_as_string_enum()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var statusRef = table[rootId].Properties!.Single(p => p.Name == "Status").Schema;
        var statusSchema = table[statusRef.Ref!];

        Assert.Equal(SchemaKind.Enum, statusSchema.Kind);
        Assert.False(statusSchema.IsStringEnum);
        Assert.Equal(3, statusSchema.EnumMembers!.Count);
    }

    [Fact]
    public void JsonStringEnumConverter_enum_is_marked_as_string_enum()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var priorityRef = table[rootId].Properties!.Single(p => p.Name == "Priority").Schema;

        Assert.True(table[priorityRef.Ref!].IsStringEnum);
    }

    [Fact]
    public void Nested_object_type_is_present_in_schema_table()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var addressRef = table[rootId].Properties!.Single(p => p.Name == "ShippingAddress").Schema;

        Assert.True(table.ContainsKey(addressRef.Ref!));
        Assert.Equal(SchemaKind.Object, table[addressRef.Ref!].Kind);
    }

    [Fact]
    public void List_property_becomes_array_schema_with_item_type()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var tagsRef = table[rootId].Properties!.Single(p => p.Name == "Tags").Schema;
        var tagsSchema = table[tagsRef.Ref!];

        Assert.Equal(SchemaKind.Array, tagsSchema.Kind);
        Assert.Equal("string", table[tagsSchema.Items!.Ref!].PrimitiveType);
    }

    [Fact]
    public void Dictionary_property_becomes_dictionary_schema_with_value_type()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var metadataRef = table[rootId].Properties!.Single(p => p.Name == "Metadata").Schema;
        var metadataSchema = table[metadataRef.Ref!];

        Assert.Equal(SchemaKind.Dictionary, metadataSchema.Kind);
        Assert.Equal("integer", table[metadataSchema.AdditionalProperties!.Ref!].PrimitiveType);
    }

    [Fact]
    public void Nullable_value_type_property_is_not_required()
    {
        var table = Build(typeof(CreateOrderRequest), out var rootId);
        var optionalQuantity = table[rootId].Properties!.Single(p => p.Name == "OptionalQuantity");

        Assert.False(optionalQuantity.Required);
    }

    [Fact]
    public void Property_initializer_is_reported_as_the_default()
    {
        var table = Build(typeof(DefaultsShape), out var rootId);
        var properties = table[rootId].Properties!;

        Assert.Equal(1L, Convert.ToInt64(properties.Single(p => p.Name == "Quantity").DefaultValue));
        Assert.Equal("pending", properties.Single(p => p.Name == "Label").DefaultValue);
    }

    [Fact]
    public void Numeric_enum_default_is_reported_as_its_number()
    {
        var table = Build(typeof(DefaultsShape), out var rootId);
        var status = table[rootId].Properties!.Single(p => p.Name == "Status");

        Assert.Equal((long)Status.Archived, Convert.ToInt64(status.DefaultValue));
    }

    [Fact]
    public void String_enum_default_is_reported_as_its_member_name()
    {
        var table = Build(typeof(DefaultsShape), out var rootId);
        var priority = table[rootId].Properties!.Single(p => p.Name == "Priority");

        Assert.Equal(nameof(Priority.High), priority.DefaultValue);
    }

    [Fact]
    public void Properties_with_no_initializer_report_no_default()
    {
        var table = Build(typeof(DefaultsShape), out var rootId);
        var properties = table[rootId].Properties!;

        Assert.Null(properties.Single(p => p.Name == "Untouched").DefaultValue);
        // Structural members are built by the form, not carried as a default value.
        Assert.Null(properties.Single(p => p.Name == "Nested").DefaultValue);
    }

    [Fact]
    public void ReadOnlyDictionary_is_a_dictionary_not_an_array_of_pairs()
    {
        var table = Build(typeof(ReadOnlyShape), out var rootId);
        var metadataRef = table[rootId].Properties!.Single(p => p.Name == "Metadata").Schema;
        var metadataSchema = table[metadataRef.Ref!];

        Assert.Equal(SchemaKind.Dictionary, metadataSchema.Kind);
        Assert.Equal(PrimitiveTypeNames.Integer, table[metadataSchema.AdditionalProperties!.Ref!].PrimitiveType);
    }

    [Fact]
    public void ReadOnlyList_is_an_array()
    {
        var table = Build(typeof(ReadOnlyShape), out var rootId);
        var tagsRef = table[rootId].Properties!.Single(p => p.Name == "Tags").Schema;
        var tagsSchema = table[tagsRef.Ref!];

        Assert.Equal(SchemaKind.Array, tagsSchema.Kind);
        Assert.Equal(PrimitiveTypeNames.String, table[tagsSchema.Items!.Ref!].PrimitiveType);
    }

    [Fact]
    public void Recursive_type_does_not_cause_infinite_loop_and_dedupes_via_table()
    {
        var table = Build(typeof(TreeNode), out var rootId);
        var childrenRef = table[rootId].Properties!.Single(p => p.Name == "Children").Schema;
        var childrenSchema = table[childrenRef.Ref!];

        Assert.Equal(SchemaKind.Array, childrenSchema.Kind);
        Assert.Equal(rootId, childrenSchema.Items!.Ref);
        Assert.Single(table.Keys, k => k == rootId);
    }
}
