import type { CodeBlockWriter } from "ts-morph";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function needsQuotes(key: string): boolean {
  if (key.length === 0) return true;
  if (/^\d/.test(key)) return true;
  if (!/^[a-z_$][\w$]*$/i.test(key)) return true;
  return false;
}

export function writeValue(
  writer: CodeBlockWriter,
  value: unknown,
  indentLevel: number,
): void {
  if (typeof value === "string") {
    writer.quote(
      value
        .replaceAll("'", String.raw`\'`)
        .replaceAll(/\r?\n/g, String.raw`\n`),
    );
  } else if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    writer.write(String(value));
  } else if (Array.isArray(value)) {
    writer.write("[");
    if (value.length > 0) {
      writer.newLine();
      value.forEach((item, index) => {
        writer.withIndentationLevel(indentLevel + 1, () =>
          writeValue(writer, item, indentLevel + 1),
        );
        if (index < value.length - 1) writer.write(",");
        writer.newLine();
      });
      writer.withIndentationLevel(indentLevel, () => writer.write("]"));
    } else {
      writer.write("]");
    }
  } else if (isRecord(value)) {
    writeObject(writer, value, indentLevel);
  }
}

function writeObject(
  writer: CodeBlockWriter,
  obj: Record<string, unknown>,
  indentLevel: number,
): void {
  writer.write("{");
  const entries = Object.entries(obj);
  if (entries.length > 0) {
    writer.newLine();
    entries.forEach(([key, val], index) => {
      const safeKey = needsQuotes(key)
        ? `'${key.replaceAll("'", String.raw`\'`)}'`
        : key;

      writer.withIndentationLevel(indentLevel + 1, () => {
        writer.write(`${safeKey}: `);
        writeValue(writer, val, indentLevel + 1);
      });
      if (index < entries.length - 1) writer.write(",");
      writer.newLine();
    });
    writer.withIndentationLevel(indentLevel, () => writer.write("}"));
  } else {
    writer.write("}");
  }
}
