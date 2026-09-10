using DomainDrivenRest.Annotations;
using DomainDrivenRest.Features.SchemaDiscovery.Infrastructure;
using DomainDrivenRest.Shared.Configuration;
using Xunit;

// Fixtures declared in real namespaces, so the resolver is exercised through Type.Namespace
// exactly as it will be at runtime.
namespace Fixtures.App.Features.Orders.Domain
{
    internal sealed class OrderFixture;
}

namespace Fixtures.App.FactoringFeature.Domain
{
    internal sealed class FactoringFixture;
}

namespace Fixtures.App.Controllers
{
    internal sealed class UnsliceableFixture;

    [Feature("Payments")]
    internal sealed class AttributedFixture;
}

namespace DomainDrivenRest.Features.SchemaDiscovery.Tests.Unit.Application
{
    public class ConventionFeatureResolverTests
    {
        private static ConventionFeatureResolver Resolver(DomainDrivenRestOptions? options = null) =>
            new(options ?? new DomainDrivenRestOptions());

        [Fact]
        public void Reads_the_segment_after_Features() =>
            Assert.Equal("Orders", Resolver().Resolve(typeof(Fixtures.App.Features.Orders.Domain.OrderFixture)));

        [Fact]
        public void Trims_the_Feature_suffix_off_a_slice_named_segment() =>
            Assert.Equal("Factoring", Resolver().Resolve(typeof(Fixtures.App.FactoringFeature.Domain.FactoringFixture)));

        [Fact]
        public void Returns_null_when_the_namespace_says_nothing() =>
            Assert.Null(Resolver().Resolve(typeof(Fixtures.App.Controllers.UnsliceableFixture)));

        [Fact]
        public void Feature_attribute_wins_over_the_namespace() =>
            Assert.Equal("Payments", Resolver().Resolve(typeof(Fixtures.App.Controllers.AttributedFixture)));

        [Fact]
        public void Host_resolver_is_consulted_before_the_namespace_convention()
        {
            var options = new DomainDrivenRestOptions { FeatureResolver = _ => "FromHost" };

            Assert.Equal("FromHost", Resolver(options).Resolve(typeof(Fixtures.App.Features.Orders.Domain.OrderFixture)));
        }

        [Fact]
        public void Host_resolver_returning_null_falls_through_to_the_convention()
        {
            var options = new DomainDrivenRestOptions { FeatureResolver = _ => null };

            Assert.Equal("Orders", Resolver(options).Resolve(typeof(Fixtures.App.Features.Orders.Domain.OrderFixture)));
        }

        [Fact]
        public void Explicit_attribute_still_beats_a_host_resolver()
        {
            var options = new DomainDrivenRestOptions { FeatureResolver = _ => "FromHost" };

            Assert.Equal("Payments", Resolver(options).Resolve(typeof(Fixtures.App.Controllers.AttributedFixture)));
        }
    }
}
