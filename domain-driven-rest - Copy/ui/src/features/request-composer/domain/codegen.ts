export type CodeTarget = "cURL" | "C#" | "TypeScript" | ".http";

export interface RequestShape {
  method: string;
  /** Path relative to the API origin, e.g. "/api/orders?take=10". */
  path: string;
  origin: string;
  headers: Record<string, string>;
  body?: string;
}

export const CODE_TARGETS: CodeTarget[] = ["cURL", "C#", "TypeScript", ".http"];

export function generateCode(target: CodeTarget, request: RequestShape): string {
  switch (target) {
    case "cURL":
      return curl(request);
    case "C#":
      return csharp(request);
    case "TypeScript":
      return typescript(request);
    case ".http":
      return httpFile(request);
  }
}

function curl({ method, path, origin, headers, body }: RequestShape): string {
  const lines = [`curl -X ${method} '${origin}${path}'`];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  -H '${key}: ${value.replace(/'/g, "'\\''")}'`);
  }
  if (body) {
    lines.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
  }
  return lines.join(" \\\n");
}

function csharp({ method, path, origin, headers, body }: RequestShape): string {
  const lines = [
    "using var client = new HttpClient();",
    `var request = new HttpRequestMessage(HttpMethod.${httpMethodMember(method)}, "${origin}${path}");`,
  ];

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "content-type") continue;
    lines.push(`request.Headers.Add("${key}", ${csharpString(value)});`);
  }

  if (body) {
    lines.push("");
    lines.push(`request.Content = new StringContent(`);
    lines.push(`    """`);
    lines.push(indent(body, 4));
    lines.push(`    """,`);
    lines.push(`    Encoding.UTF8,`);
    lines.push(`    "application/json");`);
  }

  lines.push("");
  lines.push("var response = await client.SendAsync(request);");
  lines.push("response.EnsureSuccessStatusCode();");
  lines.push("var payload = await response.Content.ReadAsStringAsync();");
  return lines.join("\n");
}

function typescript({ method, path, origin, headers, body }: RequestShape): string {
  const headerEntries = Object.entries(headers)
    .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
    .join("\n");

  const lines = [`const response = await fetch(${JSON.stringify(origin + path)}, {`, `  method: ${JSON.stringify(method)},`];
  if (headerEntries) {
    lines.push("  headers: {");
    lines.push(headerEntries);
    lines.push("  },");
  }
  if (body) {
    lines.push(`  body: JSON.stringify(${compact(body)}),`);
  }
  lines.push("});");
  lines.push("");
  lines.push("if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);");
  lines.push("const payload = await response.json();");
  return lines.join("\n");
}

function httpFile({ method, path, origin, headers, body }: RequestShape): string {
  const lines = [`${method} ${origin}${path}`];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`${key}: ${value}`);
  }
  if (body) {
    lines.push("");
    lines.push(body);
  }
  return lines.join("\n");
}

function httpMethodMember(method: string): string {
  const upper = method.toUpperCase();
  const known: Record<string, string> = {
    GET: "Get",
    POST: "Post",
    PUT: "Put",
    PATCH: "Patch",
    DELETE: "Delete",
    HEAD: "Head",
    OPTIONS: "Options",
  };
  return known[upper] ?? `Parse("${upper}")`;
}

function csharpString(value: string): string {
  return JSON.stringify(value);
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

function compact(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
      .split("\n")
      .map((line, index) => (index === 0 ? line : "  " + line))
      .join("\n");
  } catch {
    return json;
  }
}
