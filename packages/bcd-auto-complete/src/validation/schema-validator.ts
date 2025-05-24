import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { createValidationError } from "../utils";
import type {
  BrowsersData,
  ValidatableData,
  ValidationError,
  ValidationResult,
} from "../types";
import { processCompatNode } from "./compat-data-helpers";
import browserSchema from "./schemas/browsers.schema.json";
import compatSchema from "./schemas/compat-data.schema.json";

export class SchemaValidator {
  private readonly ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strictTuples: false,
      strictTypes: false,
      strictSchema: false,
    });
    addFormats(this.ajv);

    this.ajv.addSchema(browserSchema, "browser");
    this.ajv.addSchema(compatSchema, "compat");
  }

  public validateBrowserData(data: ValidatableData): ValidationResult {
    const validate = this.ajv.getSchema("browser");
    if (!validate) throw new Error("Browser schema not found");

    try {
      const valid = validate(data);
      const errors = this.transformErrors(validate.errors || []);

      if (!valid) {
        const fixedData = this.fixBrowserData(
          data as { browsers: BrowsersData },
        );
        return { valid: false, errors, fixedData };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [createValidationError(message, "", data)],
        fixedData: this.fixBrowserData(data as { browsers: BrowsersData }),
      };
    }
  }

  public validateCompatData(data: ValidatableData): ValidationResult {
    const validate = this.ajv.getSchema("compat");
    if (!validate) throw new Error("Compat schema not found");

    try {
      const valid = validate(data);
      const errors = this.transformErrors(validate.errors || []);

      if (!valid) {
        const fixedData = this.fixCompatData(data);
        return { valid: false, errors, fixedData };
      }

      return { valid: true, errors: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [createValidationError(message, "", data)],
        fixedData: this.fixCompatData(data),
      };
    }
  }

  private transformErrors(errors: ErrorObject[]): ValidationError[] {
    return errors.map((error) =>
      createValidationError(
        error.message || "Unknown validation error",
        error.instancePath,
        error.data,
        error.keyword,
      ),
    );
  }

  private fixBrowserData(data: { browsers: BrowsersData }): ValidatableData {
    const fixedData = structuredClone(data);
    const browsers = fixedData.browsers;

    for (const [browserName, browserData] of Object.entries(browsers)) {
      if (browserData.releases) {
        for (const releaseData of Object.values(browserData.releases)) {
          this.fixReleaseData(releaseData);
        }
      }
      this.fixBrowserProperties(browserData, browserName);
    }

    return fixedData;
  }

  private fixReleaseData(releaseData: any): void {
    if (!releaseData.status) releaseData.status = "retired";

    if (
      ![
        "retired",
        "current",
        "exclusive",
        "beta",
        "nightly",
        "esr",
        "planned",
      ].includes(releaseData.status)
    ) {
      releaseData.status = "retired";
    }

    if (
      releaseData.release_date &&
      !/^\d{4}-\d{2}-\d{2}$/.test(releaseData.release_date)
    ) {
      delete releaseData.release_date;
    }

    if (
      releaseData.release_notes &&
      !releaseData.release_notes.startsWith("https://")
    ) {
      delete releaseData.release_notes;
    }
  }

  private fixBrowserProperties(browserData: any, browserName: string): void {
    if (!browserData.name) browserData.name = browserName;
    if (browserData.type === undefined) browserData.type = "desktop";
    if (browserData.accepts_flags === undefined)
      browserData.accepts_flags = false;
    if (browserData.accepts_webextensions === undefined)
      browserData.accepts_webextensions = false;
  }

  private fixCompatData(data: ValidatableData): ValidatableData {
    const fixedData = structuredClone(data);

    for (const value of Object.values(fixedData)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        processCompatNode(value as Record<string, unknown>);
      }
    }

    return fixedData;
  }

  public formatError(error: ValidationError): string {
    let message = `${error.path}: ${error.message}`;
    if (error.value !== undefined)
      message += `\n  Value: ${JSON.stringify(error.value)}`;
    if (error.code) message += `\n  Code: ${error.code}`;
    return message;
  }
}
