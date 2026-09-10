export type JsonPath = (string | number)[];

export function getAtPath(value: unknown, path: JsonPath): unknown {
  let current = value;
  for (const segment of path) {
    if (current == null) return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

/** Immutable set: returns a new top-level object/array with the value at `path` replaced. */
export function setAtPath<T>(root: T, path: JsonPath, newValue: unknown): T {
  if (path.length === 0) {
    return newValue as T;
  }

  const [head, ...rest] = path;
  const isArrayIndex = typeof head === "number";

  const currentContainer = root ?? (isArrayIndex ? [] : {});
  const clonedContainer: Record<string | number, unknown> | unknown[] = Array.isArray(currentContainer)
    ? [...currentContainer]
    : { ...(currentContainer as Record<string, unknown>) };

  (clonedContainer as Record<string | number, unknown>)[head] = setAtPath(
    (currentContainer as Record<string | number, unknown>)[head],
    rest,
    newValue,
  );

  return clonedContainer as T;
}
