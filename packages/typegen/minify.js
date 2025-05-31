import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function minifyTypeScript(content) {
  return content
    .replaceAll(/[ \t]+$/gm, "")
    .replaceAll(/^[ \t]+/gm, "")
    .replaceAll(/[ \t]{2,}/g, " ")
    .replaceAll(/\n{3,}/g, "\n\n")
    .replaceAll(/\s+,/g, ",")
    .replaceAll(/\s+;/g, ";")
    .replaceAll(/\(\s+/g, "(")
    .replaceAll(/\s+\)/g, ")")
    .replaceAll(/\[\s+/g, "[")
    .replaceAll(/\s+\]/g, "]")
    .replaceAll(/:\s+/g, ":")
    .replaceAll(/\s+:/g, ":")
    .replaceAll(/\{\s+/g, "{")
    .replaceAll(/\s+\}/g, "}")
    .replaceAll(/,\s+(?=[a-z_$])/gi, ",")
    .trim();
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const minified = minifyTypeScript(content);

    const originalSize = Buffer.byteLength(content, "utf8");
    const minifiedSize = Buffer.byteLength(minified, "utf8");
    const savings =
      originalSize > 0
        ? (((originalSize - minifiedSize) / originalSize) * 100).toFixed(1)
        : "0.0";

    fs.writeFileSync(filePath, minified, "utf8");

    process.stdout.write(
      `${path.basename(filePath)}: ${originalSize} → ${minifiedSize} bytes (${savings}% saved)\n`,
    );

    return { originalSize, minifiedSize };
  } catch (error) {
    process.stderr.write(`Error processing ${filePath}: ${error.message}\n`);
    return { originalSize: 0, minifiedSize: 0 };
  }
}

function processDirectory(dirPath) {
  const stats = { totalOriginal: 0, totalMinified: 0, filesProcessed: 0 };

  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
        const result = processFile(fullPath);
        stats.totalOriginal += result.originalSize;
        stats.totalMinified += result.minifiedSize;
        stats.filesProcessed++;
      }
    }
  }

  walkDir(dirPath);
  return stats;
}

function main() {
  const generatedDir = path.join(__dirname, "generated");

  if (!fs.existsSync(generatedDir)) {
    process.stderr.write("Generated directory not found!\n");
    process.exit(1);
  }

  process.stdout.write("Starting TypeScript cleanup...\n\n");

  const stats = processDirectory(generatedDir);

  process.stdout.write("\nCleanup Summary:\n");
  process.stdout.write(`Files processed: ${stats.filesProcessed}\n`);
  process.stdout.write(
    `Total size before: ${(stats.totalOriginal / 1024).toFixed(1)} KB\n`,
  );
  process.stdout.write(
    `Total size after: ${(stats.totalMinified / 1024).toFixed(1)} KB\n`,
  );
  process.stdout.write(
    `Total savings: ${(((stats.totalOriginal - stats.totalMinified) / stats.totalOriginal) * 100).toFixed(1)}%\n`,
  );
  process.stdout.write(
    `Space saved: ${((stats.totalOriginal - stats.totalMinified) / 1024).toFixed(1)} KB\n`,
  );

  process.stdout.write("\nCleanup completed!\n");
}

main();
