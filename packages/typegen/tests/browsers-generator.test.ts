import { Project, VariableDeclarationKind } from "ts-morph";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateBrowserFiles } from "../src/browsers-generator";
import { getOutputPath } from "../src/utils";
import type { Config } from "../src";
import type { RootBCDData } from "../src/types";

vi.mock("../src/utils", () => ({
  getOutputPath: vi.fn(),
}));

const mockGetOutputPath = vi.mocked(getOutputPath);

type TestBrowserData = {
  [key: string]: any;
};

type TestRootBCDData = {
  __meta: { version: string; timestamp: string };
  browsers: TestBrowserData;
};

describe("generateBrowserFiles", () => {
  let project: Project;
  let config: Config;
  let mockData: TestRootBCDData;

  beforeEach(() => {
    vi.clearAllMocks();
    project = new Project({ useInMemoryFileSystem: true });
    config = { outputDir: "test-output", pathSeparator: "." };
    mockData = {
      __meta: { version: "1.0.0", timestamp: "2025-01-01" },
      browsers: {
        chrome: {
          name: "Chrome",
          type: "desktop",
          accepts_flags: true,
          accepts_webextensions: true,
          releases: {
            "50": { release_date: "2016-04-13", status: "current" },
          },
        },
        firefox: {
          name: "Firefox",
          type: "desktop",
          accepts_flags: true,
          accepts_webextensions: true,
          releases: {
            "45": { release_date: "2016-03-08", status: "current" },
          },
        },
      },
    };

    mockGetOutputPath.mockImplementation((fileName, _, category) =>
      category ? `${category}/${fileName}` : fileName,
    );
  });

  it("generates files for each browser", () => {
    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.getBaseName())).toEqual([
      "chrome.ts",
      "firefox.ts",
    ]);
  });

  it("calls getOutputPath with correct parameters", () => {
    generateBrowserFiles(project, mockData as RootBCDData, config);

    expect(mockGetOutputPath).toHaveBeenCalledWith(
      "chrome.ts",
      config,
      "browsers",
    );
    expect(mockGetOutputPath).toHaveBeenCalledWith(
      "firefox.ts",
      config,
      "browsers",
    );
  });

  it("creates proper variable names from browser names", () => {
    mockData.browsers = {
      "chrome-mobile": {
        name: "Chrome Mobile",
        type: "mobile",
        accepts_flags: false,
        accepts_webextensions: false,
        releases: {},
      },
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const file = files[0];
    const content = file.getFullText();

    expect(content).toContain("export const chrome_mobile =");
  });

  it("generates valid TypeScript with exported const", () => {
    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const chromeFile = files.find((f) => f.getBaseName() === "chrome.ts");
    const content = chromeFile!.getFullText();

    expect(content).toContain("export const chrome =");
    expect(content).toContain('name: "Chrome"');
    expect(content).toContain("releases:");
  });

  it("handles special characters in browser data", () => {
    mockData.browsers.chrome = {
      name: 'Chrome\'s "Browser"',
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "50": {
          release_date: "2016-04-13",
          status: "current",
          release_notes: "Line 1\nLine 2",
        },
      },
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain(String.raw`\'`);
    expect(content).toContain(String.raw`\n`);
  });

  it("handles empty browser data", () => {
    mockData.browsers = {};

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    expect(files).toHaveLength(0);
  });

  it("handles numeric keys in browser data", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "123": { release_date: "2016-04-13", status: "current" },
      },
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain("'123':");
  });

  it("handles nested objects in browser data", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "50": {
          release_date: "2016-04-13",
          status: "current",
          engine: "Blink",
          engine_version: "537.36",
        },
      },
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain('engine: "Blink"');
    expect(content).toContain('engine_version: "537.36"');
  });

  it("handles arrays in browser data", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "50": { release_date: "2016-04-13", status: "current" },
      },
      tags: ["desktop", "mobile"],
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain("tags: [");
    expect(content).toContain('"desktop"');
    expect(content).toContain('"mobile"');
  });

  it("handles boolean and number values", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "50": {
          release_date: "2016-04-13",
          status: "current",
          is_current: true,
          version_number: 50,
        },
      },
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain("is_current: true");
    expect(content).toContain("version_number: 50");
  });

  it("handles null values", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "50": {
          release_date: "2016-04-13",
          status: "current",
          deprecated_feature: null,
        },
      },
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain("deprecated_feature: null");
  });

  it("handles empty objects and arrays", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {},
      empty_array: [],
      empty_object: {},
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain("releases: {}");
    expect(content).toContain("empty_array: []");
    expect(content).toContain("empty_object: {}");
  });

  it("handles keys that need quotes", () => {
    mockData.browsers.chrome = {
      name: "Chrome",
      type: "desktop",
      accepts_flags: true,
      accepts_webextensions: true,
      releases: {
        "50": { release_date: "2016-04-13", status: "current" },
      },
      "special-key": "value",
      "123numeric": "value",
      "": "empty key",
    };

    const files = generateBrowserFiles(
      project,
      mockData as RootBCDData,
      config,
    );
    const content = files[0].getFullText();

    expect(content).toContain("'special-key': \"value\"");
    expect(content).toContain("'123numeric': \"value\"");
    expect(content).toContain("'': \"empty key\"");
  });

  it("uses VariableDeclarationKind.Const for declarations", () => {
    const addVariableStatementSpy = vi.fn();
    const mockSourceFile = {
      addVariableStatement: addVariableStatementSpy,
    };

    const createSourceFileSpy = vi
      .spyOn(project, "createSourceFile")
      .mockReturnValue(mockSourceFile as any);

    generateBrowserFiles(project, mockData as RootBCDData, config);

    expect(addVariableStatementSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        declarationKind: VariableDeclarationKind.Const,
        isExported: true,
      }),
    );

    createSourceFileSpy.mockRestore();
  });
});
