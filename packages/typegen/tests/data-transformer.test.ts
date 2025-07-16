import { describe, expect, it } from "vitest";
import { transformBcdData } from "../src/data-transformer";
import type {
  CompatStatement,
  Identifier,
  SimpleSupportStatement,
} from "@mdn/browser-compat-data";

type TestIdentifier = {
  __compat?: any;
  [key: string]: any;
};

describe("transformBcdData", () => {
  it("returns null for null input", () => {
    expect(transformBcdData(null)).toBe(null);
  });

  it("returns null for non-object input", () => {
    // @ts-expect-error - Testing invalid input types
    expect(transformBcdData("string")).toBe(null);
    // @ts-expect-error - Testing invalid input types
    expect(transformBcdData(123)).toBe(null);
  });

  it("returns null for empty object without __compat or valid children", () => {
    expect(transformBcdData({})).toBe(null);
  });

  it("transforms simple __compat statement", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test feature",
        support: {
          chrome: { version_added: "50" },
          firefox: { version_added: "45" },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    expect(result).toEqual({
      __compat: {
        description: "Test feature",
        support: {
          chrome: { version_added: "50" },
          firefox: { version_added: "45" },
        },
      },
    });
  });

  it("preserves status in __compat", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: { chrome: { version_added: "50" } },
        status: { experimental: true, standard_track: true, deprecated: false },
      },
    };

    const result = transformBcdData(input as Identifier);
    expect((result?.__compat as CompatStatement).status).toEqual({
      experimental: true,
      standard_track: true,
      deprecated: false,
    });
  });

  it("handles array support statements", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: [
            { version_added: "50" },
            { version_added: "40", version_removed: "49" },
          ],
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support.chrome;
    expect(Array.isArray(chromeSupport)).toBe(true);
    expect(chromeSupport).toHaveLength(2);
  });

  it("flattens single-item array to object", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: [{ version_added: "50" }],
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support.chrome;
    expect(Array.isArray(chromeSupport)).toBe(false);
    expect(chromeSupport).toEqual({ version_added: "50" });
  });

  it("filters null/undefined from array statements", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: [
            { version_added: "50" },
            null,
            undefined,
            { version_added: "40" },
          ],
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support.chrome;
    expect(Array.isArray(chromeSupport)).toBe(true);
    expect(chromeSupport).toHaveLength(2);
  });

  it("removes empty arrays from support", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: [null, undefined],
          firefox: { version_added: "45" },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const support = (result?.__compat as CompatStatement).support;
    expect(support).not.toHaveProperty("chrome");
    expect(support).toHaveProperty("firefox");
  });

  it("cleans SimpleSupportStatement properties", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: {
            version_added: "50",
            version_removed: "60",
            prefix: "-webkit-",
            alternative_name: "webkitFeature",
            flags: [{ type: "preference", name: "flag" }],
            partial_implementation: true,
            notes: ["Note 1", "Note 2"],
          },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support
      .chrome as SimpleSupportStatement;

    expect(chromeSupport.version_added).toBe("50");
    expect(chromeSupport.version_removed).toBe("60");
    expect(chromeSupport.prefix).toBe("-webkit-");
    expect(chromeSupport.alternative_name).toBe("webkitFeature");
    expect(chromeSupport.flags).toEqual([{ type: "preference", name: "flag" }]);
    expect(chromeSupport.partial_implementation).toBe(true);
    expect(chromeSupport.notes).toEqual(["Note 1", "Note 2"]);
  });

  it("handles string notes", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: {
            version_added: "50",
            notes: "Single note",
          },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support
      .chrome as SimpleSupportStatement;
    expect(chromeSupport.notes).toBe("Single note");
  });

  it("omits undefined properties from cleaned statement", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: {
            version_added: "50",
          },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support
      .chrome as SimpleSupportStatement;

    expect(chromeSupport).toHaveProperty("version_added");
    expect(chromeSupport).not.toHaveProperty("version_removed");
    expect(chromeSupport).not.toHaveProperty("prefix");
  });

  it("recursively transforms nested identifiers", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Parent",
        support: { chrome: { version_added: "50" } },
      },
      child: {
        __compat: {
          description: "Child",
          support: { firefox: { version_added: "45" } },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    expect(result).toHaveProperty("__compat");
    expect(result).toHaveProperty("child");
    expect(result?.child).toHaveProperty("__compat");
  });

  it("skips non-identifier children", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: { chrome: { version_added: "50" } },
      },
      stringProp: "not an identifier",
      numberProp: 123,
      nullProp: null,
    };

    const result = transformBcdData(input as Identifier);
    expect(result).toHaveProperty("__compat");
    expect(result).not.toHaveProperty("stringProp");
    expect(result).not.toHaveProperty("numberProp");
    expect(result).not.toHaveProperty("nullProp");
  });

  it("handles null/undefined support statements", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: null,
          firefox: undefined,
          safari: { version_added: "10" },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const support = (result?.__compat as CompatStatement).support;
    expect(support).not.toHaveProperty("chrome");
    expect(support).not.toHaveProperty("firefox");
    expect(support).toHaveProperty("safari");
  });

  it("preserves flags array by copying", () => {
    const originalFlags = [{ type: "preference", name: "test" }];
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: {
            version_added: "50",
            flags: originalFlags,
          },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const chromeSupport = (result?.__compat as CompatStatement).support
      .chrome as SimpleSupportStatement;

    expect(chromeSupport.flags).toEqual(originalFlags);
    expect(chromeSupport.flags).not.toBe(originalFlags);
  });

  it("handles boolean version_added values", () => {
    const input: TestIdentifier = {
      __compat: {
        description: "Test",
        support: {
          chrome: { version_added: false },
          firefox: { version_added: true },
        },
      },
    };

    const result = transformBcdData(input as Identifier);
    const support = (result?.__compat as CompatStatement).support;
    expect((support.chrome as SimpleSupportStatement).version_added).toBe(
      false,
    );
    expect((support.firefox as SimpleSupportStatement).version_added).toBe(
      true,
    );
  });
});
