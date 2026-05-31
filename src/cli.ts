#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { analyzeProject, renderOutput } from "./index.js";
import { runWithTracing, traceToArchitecture } from "./analyzer/traceRunner.js";

const DEF_EXCLUDE = "node_modules,dist,.git,build,coverage,__pycache__,.next,.nuxt,out,target,vendor";

function readVersion(): string { try { return JSON.parse(fs.readFileSync(path.join(__dirname,"..","package.json"),"utf-8")).version||"1.0.0"; } catch { return "1.0.0"; } }

const program = new Command();
program.name("smeargraph").description("SmearGraph — code architecture analysis, visualization and MCP server").version(readVersion());

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

program.command("init").description("Initialize .smeargraph/ cache dir and generate initial knowledge graph")
  .option("-e, --exclude <patterns>", "Glob patterns to exclude", DEF_EXCLUDE)
  .action(async (options: Record<string,string>) => {
    const projectRoot = process.cwd();
    const cacheDir = path.join(projectRoot, ".smeargraph");
    fs.mkdirSync(cacheDir, { recursive: true });
    process.stderr.write("Initialized .smeargraph/ cache directory\n");
    const { analyzeProject } = await import("./analyzer/index.js");
    const { buildKnowledgeGraph } = await import("./knowledge-graph/index.js");
    const exclude = options.exclude.split(",").map((e:string)=>e.trim()).filter(Boolean);
    const result = analyzeProject({ rootDir: projectRoot, exclude, maxDepth: 10, languages: [] });
    const kg = buildKnowledgeGraph(result);
    fs.writeFileSync(path.join(cacheDir, "knowledge-graph.json"), JSON.stringify(kg, null, 2));
    process.stderr.write("Knowledge graph: "+kg.nodes.length+" nodes, "+kg.edges.length+" edges across "+(kg.layers?.length||1)+" layers\n");
  });

program.command("serve").description("Start MCP server on stdin/stdout")
  .action(async () => {
    process.stderr.write("SmearGraph MCP server starting (JSON-RPC 2.0 on stdin/stdout)...\n");
    const { startServer } = await import("./mcp/index.js");
    await startServer();
  });

program.command("enrich").description("Enrich knowledge graph with LLM-generated summaries and tags")
  .option("-f, --force", "Re-enrich all nodes, ignoring cache", false)
  .action(async (options: { force: boolean }) => {
    const projectRoot = process.cwd();
    const cachePath = path.join(projectRoot, ".smeargraph", "knowledge-graph.json");
    if (!fs.existsSync(cachePath)) { process.stderr.write("No knowledge graph found. Run 'smeargraph init' first.\n"); process.exit(1); }
    const kg = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    const { enrichKnowledgeGraph } = await import("./llm/enrich.js");
    const result = await enrichKnowledgeGraph(kg);
    fs.writeFileSync(cachePath, JSON.stringify(kg, null, 2));
    process.stderr.write("Enriched: "+result.enriched+" enriched, "+result.cacheHits+" cache hits, "+result.skipped+" skipped, "+result.errors+" errors\n");
  });

program.parse();
