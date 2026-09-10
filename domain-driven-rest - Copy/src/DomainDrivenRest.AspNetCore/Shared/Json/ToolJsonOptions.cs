using System.Text.Json;
using System.Text.Json.Serialization;

namespace DomainDrivenRest.Shared.Json;

/// <summary>
/// Wire format for the tool's OWN diagnostic endpoints — deliberately separate from
/// <see cref="AppJsonSerializerOptions"/>, which describes the host app and must never be
/// altered. The frontend expects string enum names (SchemaKind, ParameterLocation)
/// regardless of how the consuming app configures its own JSON output.
/// </summary>
public static class ToolJsonOptions
{
    public static readonly JsonSerializerOptions Instance = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
}
