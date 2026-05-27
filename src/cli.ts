#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { analyzeProject, renderOutput } from "./index.js";
import { runWithTracing, traceToArchitecture } from "./analyzer/traceRunner.js";

const DEF_EXCLUDE = "node_modules,dist,.git,build,coverage,__pycache__,.next,.nuxt,out,target,vendor";

function readVersion(): string { try { return JSON.parse(fs.readFileSync(path.join(__dirname,"..","package.json"),"utf-8")).version||"1.0.0"; } catch { return "1.0.0"; } }

const program = new Command();
program.name("smeargraph").description("SmearGraph — analyze codebase and generate architecture visualizations").version(readVersion());

program.command("analyze [rootDir]").description("Analyze a project and extract symbols with dependencies")
  .option("-o, --output <path>", "Output file path")
  .option("-f, --format <format>", "Output format: json | ascii | html", "ascii")
  .option("-e, --exclude <patterns>", "Glob patterns to exclude", DEF_EXCLUDE)
  .option("-d, --depth <number>", "Max directory nesting depth", "10")
  .action(async (rootDir: string|undefined, options: Record<string,string>) => {
    const projectRoot = rootDir ? path.resolve(rootDir) : process.cwd();
    if (!fs.existsSync(projectRoot)) { process.stderr.write("Error: Directory not found: "+projectRoot+"\n"); process.exit(1); }
    const format = options.format;
    if (!["json","ascii","html"].includes(format)) { process.stderr.write("Error: Invalid format \""+format+"\". Valid: json, ascii, html\n"); process.exit(1); }
    const exclude = options.exclude.split(",").map((e:string)=>e.trim()).filter(Boolean);
    const maxDepth = parseInt(options.depth,10);
    try {
      const result = analyzeProject({ rootDir: projectRoot, exclude, maxDepth: isNaN(maxDepth)?10:maxDepth, languages: [] });
      process.stderr.write("Analyzed "+result.stats.totalFiles+" files ("+result.stats.totalLOC.toLocaleString()+" LOC) → "+result.stats.totalSymbols+" symbols\n");
      if (result.issues.length > 0) for (const i of result.issues) process.stderr.write("  ["+i.severity+"] "+i.message+"\n");
      const output = await renderOutput(result, { format: format as "json"|"ascii"|"html", outputPath: options.output||undefined });
      if (!options.output) { process.stdout.write(output); if (format==="ascii") process.stdout.write("\n"); }
      else process.stderr.write("Output → "+output+"\n");
    } catch (err: unknown) { const msg = err instanceof Error ? err.message : String(err); process.stderr.write("Error: "+msg+"\n"); process.exit(1); }
  });

program.command("trace").description("Execute a command with tracing and show architecture data flow")
  .option("-d, --dir <path>", "Working directory", process.cwd())
  .option("-c, --cmd <command>", "Command to execute with tracing")
  .action(async (options: Record<string,string>) => {
    const command = options.cmd;
    if (!command) { process.stderr.write("Error: --cmd is required\n"); process.exit(1); }
    const workDir = path.resolve(options.dir);
    process.stderr.write("Running with tracer: " + command + "\n");
    process.stderr.write("Working dir: " + workDir + "\n\n");
    try {
      const { events, callGraph, dataFlow } = traceToArchitecture(workDir, command);
      process.stderr.write(events.length + " trace events captured\n\n");

      process.stdout.write("=== Call Graph ===\n");
      for (const [file, funcs] of Object.entries(callGraph).slice(0, 15)) {
        process.stdout.write("  " + file + ":\n");
        for (const f of funcs.slice(0, 5)) process.stdout.write("    - " + f + "\n");
      }

      if (dataFlow.length > 0) {
        process.stdout.write("\n=== Data Flow ===\n");
        for (const df of dataFlow.slice(0, 20)) {
          process.stdout.write("  " + df.from + " → " + df.to + " (" + df.data + ")\n");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write("Error: " + msg + "\n");
      process.exit(1);
    }
  });

program.parse();
