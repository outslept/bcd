import type { Identifier } from "@mdn/browser-compat-data";

export function findFirstCompatDepth(identifier: Identifier): number {
  const entries: Array<[string, Identifier]> = [["", identifier]];

  while (entries.length > 0) {
    const entry = entries.shift();
    if (!entry) break;

    const [path, value] = entry;
    if (value.__compat) {
      return path.split(".").length;
    }

    for (const [key, subvalue] of Object.entries(value)) {
      const subpath = path ? `${path}.${key}` : key;
      if ("__compat" in subvalue) {
        entries.push([subpath, subvalue]);
      }
    }
  }

  return 0;
}
