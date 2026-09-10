using System.Runtime.CompilerServices;

// Feature tests live inside their slice but compile into the test assembly, so they need
// the same visibility they would have had in-place.
[assembly: InternalsVisibleTo("DomainDrivenRest.Tests")]
