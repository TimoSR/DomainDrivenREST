import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="app"><main className="placeholder" role="alert"><h2>The workspace encountered a problem</h2><p>Reload to reconnect to your API. Your saved request history will remain available.</p><button className="primary-action" onClick={() => window.location.reload()}>Reload workspace</button></main></div>;
    return this.props.children;
  }
}
