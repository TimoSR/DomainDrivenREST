using System.Text.Json;
using DomainDrivenRest.Abstractions;
using Xunit;

namespace DomainDrivenRest.SchemaGen.Tests;

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
        var prioritySchema = table[priorityRef.Ref!];

        Assert.True(prioritySchema.IsStringEnum);
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
    public void Recursive_type_does_not_cause_infinite_loop_and_dedupes_via_table()
    {
        var table = Build(typeof(TreeNode), out var rootId);
        var root = table[rootId];
        var childrenRef = root.Properties!.Single(p => p.Name == "Children").Schema;
        var childrenSchema = table[childrenRef.Ref!];

        Assert.Equal(SchemaKind.Array, childrenSchema.Kind);
        Assert.Equal(rootId, childrenSchema.Items!.Ref);
        Assert.Single(table.Keys, k => k == rootId);
    }
}
