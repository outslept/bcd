export { transformBcdData } from "./src/data-transformer";
export { CONFIG, generateAllFiles, type Config } from "./generate-bcd-types";
export { SchemaValidator } from "./src/validation/schema-validator";
export {
  generateAggregatedDataFile,
  generateBcdCategoryDataFile,
} from "./src/generators/data-generator";
export { generateIndexFile } from "./src/generators/index-generator";
export { generateTypesFile } from "./src/generators/types-generator";
export {
  createValidationError,
  ensureDir,
  getFeatureCategories,
  getOutputPath,
  log,
} from "./src/utils";
export {
  fixSupportStatement,
  processCompatNode,
} from "./src/validation/compat-data-helpers";

export type {
  BrowsersData,
  MetaData,
  PathInfo,
  ProcessingContext,
  RootBCDData,
  TransformedCompatStatement,
  ValidatableData,
  ValidationError,
  ValidationResult,
} from "./src/types";
