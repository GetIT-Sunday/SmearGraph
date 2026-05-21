#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { analyzeProject, renderOutput } from "./index.js";
import type { OutputFormat } from "./types/index.js";

const DEFAULT_EXCLUDE = "node_modules,dist,.git,build,coverage,__pycache__,.next,.nuxt,out,target,vendor";

function readVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

const program = new Command();

program
  .name("smeargraph")
  .description("SmearGraph — analyze codebase and generate ASCII architecture diagrams")
  .version(readVersion());

program
  .command("analyze [rootDir]")
  .description("Analyze a project's architecture and extract component-level symbols")
  .option("-o, --output <path>", "Output file path")
  .option("-f, --format <format>", "Output format: json | ascii", "ascii")
  .option("-e, --exclude <patterns>", "Glob patterns to exclude", DEFAULT_EXCLUDE)
  .option("-d, --depth <number>", "Max directory nesting depth", "10")
  .action(async (rootDir: string | undefined, options: Record<string, string>) => {
    const projectRoot = rootDir ? path.resolve(rootDir) : process.cwd();

    if (!fs.existsSync(projectRoot)) {
      process.stderr.write(`Error: Directory not found: ${projectRoot}\n`);
      process.exit(1);
    }

    const format = options.format as string;
    if (!["json", "ascii"].includes(format)) {
      process.stderr.write(`Error: Invalid format "${format}". Valid: json, ascii\n`);
      process.exit(1);
    }

    const exclude = options.exclude.split(",").map((e: string) => e.trim()).filter(Boolean);
    const maxDepth = parseInt(options.depth, 10);

    const analyzerOptions = {
      rootDir: projectRoot,
      exclude,
      maxDepth: isNaN(maxDepth) ? 10 : maxDepth,
      languages: [],
    };

    const outputOptions = {
      format: format as OutputFormat,
      outputPath: options.output || undefined,
    };

    try {
      const result = analyzeProject(analyzerOptions);

      process.stderr.write(
        `Analyzed ${result.stats.totalFiles} files ` +
        `(${result.stats.totalLOC} LOC) ` +
        `→ ${result.stats.totalSymbols} symbols\n`
      );

      if (result.issues.length > 0) {
        for (const issue of result.issues) {
          process.stderr.write(`  [${issue.severity}] ${issue.message}\n`);
        }
      }

      const output = await renderOutput(result, outputOptions);

      if (!outputOptions.outputPath) {
        process.stdout.write(output);
        if (format === "ascii") process.stdout.write("\n");
      } else {
        process.stderr.write(`Output → ${output}\n`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: ${message}\n`);
      process.exit(1);
    }
  });

program.parse();
