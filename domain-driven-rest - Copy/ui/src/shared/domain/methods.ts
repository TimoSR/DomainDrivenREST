const METHOD_VARS: Record<string, string> = {
  GET: "var(--accent)",
  POST: "var(--success)",
  PUT: "var(--warn)",
  PATCH: "var(--accent-2)",
  DELETE: "var(--danger)",
  HEAD: "var(--t3)",
  OPTIONS: "var(--t3)",
};

export function methodColor(method: string): string {
  return METHOD_VARS[method.toUpperCase()] ?? "var(--t3)";
}

/** DELETE is too wide for the rail's pill; everything else fits. */
export function methodLabel(method: string): string {
  const upper = method.toUpperCase();
  return upper === "DELETE" ? "DEL" : upper;
}

/** Methods that carry a body get a filled pill; the rest get a tinted outline. */
export function methodIsSolid(method: string): boolean {
  return method.toUpperCase() === "POST";
}

export function statusColor(status: number): string {
  if (status < 300) return "var(--success)";
  if (status < 400) return "var(--warn)";
  return "var(--danger)";
}
