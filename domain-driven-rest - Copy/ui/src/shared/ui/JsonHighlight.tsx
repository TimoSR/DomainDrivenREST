import { Fragment } from "react";

/** Read-only pretty-printer with the same syntax colors the editor uses. */
export function JsonHighlight({ text }: { text: string }) {
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Not JSON (an HTML error page, plain text) — show it verbatim, uncolored.
    return <pre className="code-block">{text}</pre>;
  }

  return <pre className="code-block">{tokenize(pretty)}</pre>;
}

const TOKEN_PATTERN = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;

function tokenize(source: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span className="tok-punct" key={key++}>
          {source.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const [full, propertyKey, stringValue, numberValue, literal] = match;
    const className = propertyKey ? "tok-key" : stringValue ? "tok-str" : numberValue ? "tok-num" : "tok-bool";
    nodes.push(
      <span className={className} key={key++}>
        {full}
      </span>,
    );

    lastIndex = match.index + full.length;
    void literal;
  }

  if (lastIndex < source.length) {
    nodes.push(
      <span className="tok-punct" key={key++}>
        {source.slice(lastIndex)}
      </span>,
    );
  }

  return <Fragment>{nodes}</Fragment>;
}
