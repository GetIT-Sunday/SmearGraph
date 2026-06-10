import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph } from "../types/index.js";
import { DatabaseConnection } from "./connection.js";
import { initializeDatabase } from "./queries.js";

export function migrateFromJson(projectRoot: string): void {
  const jsonPath = path.join(projectRoot, ".smeargraph", "knowledge-graph.json");
  if (!fs.existsSync(jsonPath)) return;

  const kg: KnowledgeGraph = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const dbPath = path.join(projectRoot, ".smeargraph", "index.db");
  const db = new DatabaseConnection(dbPath);

  try {
    initializeDatabase(db, kg);
    console.log(`Migrated ${kg.nodes.length} nodes and ${kg.edges.length} edges to SQLite`);
  } finally {
    db.close();
  }
}

export function isMigrationNeeded(projectRoot: string): boolean {
  const jsonPath = path.join(projectRoot, ".smeargraph", "knowledge-graph.json");
  const dbPath = path.join(projectRoot, ".smeargraph", "index.db");

  if (!fs.existsSync(jsonPath)) return false;
  if (!fs.existsSync(dbPath)) return true;

  const jsonStat = fs.statSync(jsonPath);
  const dbStat = fs.statSync(dbPath);
  return jsonStat.mtimeMs > dbStat.mtimeMs;
}
