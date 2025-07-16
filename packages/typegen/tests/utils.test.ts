import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOutputPath, isIdentifier } from "../src/utils";
import type { Config } from "../src/index";

vi.mock("node:fs");
vi.mock("node:path");

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockResolve = vi.mocked(resolve);

beforeEach(() => {
  vi.clearAllMocks();
  mockResolve.mockImplementation((...paths) => paths.join("/"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getOutputPath", () => {
  const config: Config = {
    outputDir: "output",
    pathSeparator: ".",
  };

  it("returns path without category", () => {
    const result = getOutputPath("file.ts", config);

    expect(mockResolve).toHaveBeenCalledWith("output", "file.ts");
    expect(result).toBe("output/file.ts");
  });

  it("creates category directory and returns nested path", () => {
    mockExistsSync.mockReturnValue(false);

    const result = getOutputPath("file.ts", config, "api");

    expect(mockResolve).toHaveBeenCalledWith("output", "api");
    expect(mockResolve).toHaveBeenCalledWith("output/api", "file.ts");
    expect(mockMkdirSync).toHaveBeenCalledWith("output/api", {
      recursive: true,
    });
    expect(result).toBe("output/api/file.ts");
  });

  it("does not create directory if it already exists", () => {
    mockExistsSync.mockReturnValue(true);

    const result = getOutputPath("file.ts", config, "api");

    expect(mockMkdirSync).not.toHaveBeenCalled();
    expect(result).toBe("output/api/file.ts");
  });

  it("handles nested category paths", () => {
    mockExistsSync.mockReturnValue(false);

    const result = getOutputPath("file.ts", config, "api/dom");

    expect(mockResolve).toHaveBeenCalledWith("output", "api/dom");
    expect(mockMkdirSync).toHaveBeenCalledWith("output/api/dom", {
      recursive: true,
    });
    expect(result).toBe("output/api/dom/file.ts");
  });
});

describe("isIdentifier", () => {
  it("returns true for valid identifier object", () => {
    const validIdentifier = {
      someFeature: {
        __compat: { description: "test" },
      },
    };

    expect(isIdentifier(validIdentifier)).toBe(true);
  });

  it("returns true for object with __compat", () => {
    const identifierWithCompat = {
      __compat: {
        description: "Test feature",
        support: { chrome: { version_added: "50" } },
      },
    };

    expect(isIdentifier(identifierWithCompat)).toBe(true);
  });

  it("returns true for nested identifier structure", () => {
    const nestedIdentifier = {
      feature1: {
        __compat: { description: "Feature 1" },
        subfeature: {
          __compat: { description: "Subfeature" },
        },
      },
      feature2: {
        property: "value",
      },
    };

    expect(isIdentifier(nestedIdentifier)).toBe(true);
  });

  it("returns false for non-object types", () => {
    expect(isIdentifier(null)).toBe(false);
    expect(isIdentifier("string")).toBe(false);
    expect(isIdentifier(123)).toBe(false);
    expect(isIdentifier(true)).toBe(false);
    expect(isIdentifier(undefined)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isIdentifier([])).toBe(false);
    expect(isIdentifier([1, 2, 3])).toBe(false);
    expect(isIdentifier([{ __compat: {} }])).toBe(false);
  });

  it("returns false for objects with support property", () => {
    const compatStatement = {
      support: { chrome: { version_added: "50" } },
      description: "Test",
    };

    expect(isIdentifier(compatStatement)).toBe(false);
  });

  it("returns false for browser objects", () => {
    const browserObject = {
      name: "Chrome",
      releases: { "50": { release_date: "2016-04-13" } },
    };

    expect(isIdentifier(browserObject)).toBe(false);
  });

  it("returns false for meta objects", () => {
    const metaObject = {
      version: "1.0.0",
      timestamp: "2025-01-01",
    };

    expect(isIdentifier(metaObject)).toBe(false);
  });

  it("returns false for objects with both name and releases", () => {
    const browserLikeObject = {
      name: "Test Browser",
      releases: {},
      other: "property",
    };

    expect(isIdentifier(browserLikeObject)).toBe(false);
  });

  it("returns false for objects with both version and timestamp", () => {
    const metaLikeObject = {
      version: "2.0.0",
      timestamp: "2025-07-16",
      other: "property",
    };

    expect(isIdentifier(metaLikeObject)).toBe(false);
  });

  it("returns true for objects with only name property", () => {
    const objectWithName = {
      name: "Some feature name",
      description: "Feature description",
    };

    expect(isIdentifier(objectWithName)).toBe(true);
  });

  it("returns true for objects with only releases property", () => {
    const objectWithReleases = {
      releases: "Some release info",
      description: "Feature description",
    };

    expect(isIdentifier(objectWithReleases)).toBe(true);
  });

  it("returns true for objects with only version property", () => {
    const objectWithVersion = {
      version: "Feature version",
      description: "Feature description",
    };

    expect(isIdentifier(objectWithVersion)).toBe(true);
  });

  it("returns true for objects with only timestamp property", () => {
    const objectWithTimestamp = {
      timestamp: "Some timestamp",
      description: "Feature description",
    };

    expect(isIdentifier(objectWithTimestamp)).toBe(true);
  });

  it("returns true for empty object", () => {
    expect(isIdentifier({})).toBe(true);
  });

  it("returns true for object with arbitrary properties", () => {
    const arbitraryObject = {
      someProperty: "value",
      anotherProperty: 123,
      nested: {
        deep: "value",
      },
    };

    expect(isIdentifier(arbitraryObject)).toBe(true);
  });
});
