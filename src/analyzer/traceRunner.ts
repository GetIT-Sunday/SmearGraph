import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { RawDependency } from "../types/index.js";

export interface TraceEvent {
  event: "call" | "return";
  function: string;
  file: string;
  line?: number;
  args?: Record<string, unknown>;
  return?: string;
  depth: number;
  timestamp: number;
}

export interface TraceResult {
  events: TraceEvent[];
  rawDeps: RawDependency[];
  output: string;
}

export function runWithTracing(command: string, projectRoot: string): TraceResult {
  const tracerPath = path.join(__dirname, "..", "..", "src", "tracer");
  const traceOutput = path.join(projectRoot, ".smeargraph", "trace.jsonl");
  const traceDir = path.dirname(traceOutput);
  if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
  if (fs.existsSync(traceOutput)) fs.unlinkSync(traceOutput);

  const wrapperScript = path.join(traceDir, "_smeargraph_runner.py");
  const cmdParts = command.split(" ");
  const isPythonScript = cmdParts[0] === "python3" && cmdParts[1] && !cmdParts[1].startsWith("-");

  if (isPythonScript) {
    const targetScript = cmdParts[1];
    const targetArgs = cmdParts.slice(2).join(" ");
    fs.writeFileSync(wrapperScript, [
      "import sys, os",
      "sys.path.insert(0, " + JSON.stringify(tracerPath) + ")",
      "sys.argv = [" + JSON.stringify(targetScript) + "] + " + JSON.stringify(targetArgs) + ".split()",
      "",
      "import smeargraph_tracer",
      "smeargraph_tracer._install()",
      "",
      "with open(" + JSON.stringify(targetScript) + ") as f:",
      "    exec(compile(f.read(), " + JSON.stringify(targetScript) + ", 'exec'))",
    ].join("\n"), "utf-8");
  } else {
    fs.writeFileSync(wrapperScript, [
      "import sys, os",
      "sys.path.insert(0, " + JSON.stringify(tracerPath) + ")",
      "import smeargraph_tracer",
      "smeargraph_tracer._install()",
      "",
      "import subprocess",
      "result = subprocess.run(" + JSON.stringify(command) + ", shell=True, cwd=" + JSON.stringify(projectRoot) + ")",
      "sys.exit(result.returncode)",
    ].join("\n"), "utf-8");
  }

  const env = {
    ...process.env,
    SMEARGRAPH_TRACE_OUTPUT: traceOutput,
    SMEARGRAPH_TRACE_DEPTH: "8",
    SMEARGRAPH_MAX_EVENTS: "100000",
  };

  let output = "";
  try {
    output = execSync("python3 " + wrapperScript, {
      cwd: projectRoot,
      env,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    output = (err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "");
  }

  const events: TraceEvent[] = [];
  if (fs.existsSync(traceOutput)) {
    const lines = fs.readFileSync(traceOutput, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        events.push(JSON.parse(line) as TraceEvent);
      } catch {
        /* skip malformed lines */
      }
    }
  }

  const rawDeps: RawDependency[] = buildDepsFromTrace(events);

  return { events, rawDeps, output };
}

function buildDepsFromTrace(events: TraceEvent[]): RawDependency[] {
  const callStack: { func: string; file: string; depth: number }[] = [];
  const deps: RawDependency[] = [];
  const seen = new Set<string>();

  for (const e of events) {
    if (e.event === "call") {
      if (callStack.length > 0) {
        const caller = callStack[callStack.length - 1];
        const key = `${caller.file}|||${e.file}`;
        if (!seen.has(key)) {
          seen.add(key);
          deps.push({
            from: caller.file,
            to: e.file,
            kind: "call",
            symbols: [e.function],
          });
        }
      }
      callStack.push({ func: e.function, file: e.file, depth: e.depth });
    } else if (e.event === "return") {
      const idx = callStack.findIndex(
        (c) => c.func === e.function && c.depth === e.depth
      );
      if (idx >= 0) callStack.splice(idx, 1);
    }
  }
  return deps;
}

export function traceToArchitecture(projectRoot: string, command: string): {
  events: TraceEvent[];
  callGraph: Record<string, string[]>;
  dataFlow: { from: string; to: string; data: string }[];
} {
  const { events } = runWithTracing(command, projectRoot);

  const callGraph: Record<string, string[]> = {};
  const dataFlow: { from: string; to: string; data: string }[] = [];

  const lastReturn: Record<string, { func: string; data: string }> = {};

  for (const e of events) {
    if (e.event === "call") {
      const caller = Object.entries(lastReturn)
        .sort(([, a], [, b]) => b.func.length - a.func.length)[0];
      if (caller && e.args) {
        for (const [k, v] of Object.entries(e.args)) {
          if (typeof v === "string" && caller[1].data.includes(v as string)) {
            dataFlow.push({
              from: caller[1].func,
              to: e.function,
              data: k + "=" + String(v),
            });
          }
        }
      }
    } else if (e.event === "return" && e.return) {
      const key = `${e.file}:${e.function}`;
      lastReturn[key] = { func: e.function, data: e.return };
    }

    const shortFile = e.file.split("/").slice(-2).join("/");
    callGraph[shortFile] = callGraph[shortFile] || [];
    if (e.event === "call" && !callGraph[shortFile].includes(e.function)) {
      callGraph[shortFile].push(e.function);
    }
  }

  return { events, callGraph, dataFlow };
}
