namespace DomainDrivenRest.Annotations;

/// <summary>
/// Names the feature slice a controller, endpoint or type belongs to.
///
/// Only needed when the namespace convention doesn't already say it — a type under
/// <c>…Features.Orders…</c> or <c>…OrdersFeature…</c> is attributed automatically.
/// Applying this wins over the convention.
/// </summary>
[AttributeUsage(
    AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface | AttributeTargets.Enum,
    Inherited = false)]
public sealed class FeatureAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}
