import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, KGNode, KGEdge } from "../types/index.js";
import { DatabaseConnection } from "./connection.js";
import { LRUCache } from "../utils/lru.js";

const nodeCache = new LRUCache<string, KGNode>(1000);

export function initializeDatabase(db: DatabaseConnection, kg: KnowledgeGraph): void {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  db.transaction(() => {
    const insertNode = db.prepare(`
      INSERT OR REPLACE INTO nodes (id, kind, name, file_path, language, start_line, end_line, docstring, signature, is_exported, tags, complexity, metadata, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEdge = db.prepare(`
      INSERT OR IGNORE INTO edges (source, target, kind, weight, line, col)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertLayer = db.prepare(`
      INSERT OR REPLACE INTO layers (id, name, description)
      VALUES (?, ?, ?)
    `);

    const insertLayerNode = db.prepare(`
      INSERT OR REPLACE INTO layer_nodes (layer_id, node_id)
      VALUES (?, ?)
    `);

    const insertFile = db.prepare(`
      INSERT OR REPLACE INTO files (path, language, size, indexed_at, node_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = Date.now();

    for (const node of kg.nodes) {
      insertNode.run(
        node.id, node.type, node.name, node.filePath || null, null,
        null, null, null, null, node.tags.includes("exported") ? 1 : 0,
        JSON.stringify(node.tags), node.complexity, JSON.stringify(node.metadata), now
      );
    }

    for (const edge of kg.edges) {
      insertEdge.run(edge.source, edge.target, edge.type, edge.weight, null, null);
    }

    for (const layer of kg.layers) {
      insertLayer.run(layer.id, layer.name, layer.description);
      for (const nodeId of layer.nodeIds) {
        insertLayerNode.run(layer.id, nodeId);
      }
    }

    const fileCounts = new Map<string, number>();
    for (const node of kg.nodes) {
      if (node.filePath) {
        fileCounts.set(node.filePath, (fileCounts.get(node.filePath) || 0) + 1);
      }
    }
    for (const [filePath, count] of fileCounts) {
      insertFile.run(filePath, null, null, now, count);
    }
  });
}

export function getNodeById(db: DatabaseConnection, id: string): KGNode | null {
  const cached = nodeCache.get(id);
  if (cached) return cached;

  const row = db.prepare("SELECT * FROM nodes WHERE id = ?").get(id) as any;
  if (!row) return null;

  const node: KGNode = {
    id: row.id,
    type: row.kind as KGNode["type"],
    name: row.name,
    filePath: row.file_path || undefined,
    tags: JSON.parse(row.tags || "[]"),
    complexity: row.complexity as KGNode["complexity"],
    metadata: JSON.parse(row.metadata || "{}"),
  };

  nodeCache.set(id, node);
  return node;
}

export function getNodesByIds(db: DatabaseConnection, ids: string[]): KGNode[] {
  const result: KGNode[] = [];
  const uncachedIds: string[] = [];

  for (const id of ids) {
    const cached = nodeCache.get(id);
    if (cached) result.push(cached);
    else uncachedIds.push(id);
  }

  if (uncachedIds.length > 0) {
    const placeholders = uncachedIds.map(() => "?").join(",");
    const rows = db.prepare(`SELECT * FROM nodes WHERE id IN (${placeholders})`).all(...uncachedIds) as any[];
    for (const row of rows) {
      const node: KGNode = {
        id: row.id,
        type: row.kind as KGNode["type"],
        name: row.name,
        filePath: row.file_path || undefined,
        tags: JSON.parse(row.tags || "[]"),
        complexity: row.complexity as KGNode["complexity"],
        metadata: JSON.parse(row.metadata || "{}"),
      };
      nodeCache.set(node.id, node);
      result.push(node);
    }
  }

  return result;
}

export function getEdgesBySource(db: DatabaseConnection, sourceId: string): KGEdge[] {
  const rows = db.prepare("SELECT * FROM edges WHERE source = ?").all(sourceId) as any[];
  return rows.map(r => ({ source: r.source, target: r.target, type: r.kind, weight: r.weight }));
}

export function getEdgesByTarget(db: DatabaseConnection, targetId: string): KGEdge[] {
  const rows = db.prepare("SELECT * FROM edges WHERE target = ?").all(targetId) as any[];
  return rows.map(r => ({ source: r.source, target: r.target, type: r.kind, weight: r.weight }));
}

export function searchNodes(db: DatabaseConnection, query: string, limit: number = 50): KGNode[] {
  const rows = db.prepare(`
    SELECT n.* FROM nodes_fts f
    JOIN nodes n ON f.id = n.id
    WHERE nodes_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(query, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    type: row.kind as KGNode["type"],
    name: row.name,
    filePath: row.file_path || undefined,
    tags: JSON.parse(row.tags || "[]"),
    complexity: row.complexity as KGNode["complexity"],
    metadata: JSON.parse(row.metadata || "{}"),
  }));
}

export function getLayers(db: DatabaseConnection): Array<{ id: string; name: string; description: string; nodeIds: string[] }> {
  const layers = db.prepare("SELECT * FROM layers").all() as any[];
  return layers.map(l => {
    const nodeIds = db.prepare("SELECT node_id FROM layer_nodes WHERE layer_id = ?").all(l.id) as any[];
    return { id: l.id, name: l.name, description: l.description, nodeIds: nodeIds.map((n: any) => n.node_id) };
  });
}

export function getStats(db: DatabaseConnection): { nodeCount: number; edgeCount: number; fileCount: number; layerCount: number } {
  const nodeCount = (db.prepare("SELECT COUNT(*) as count FROM nodes").get() as any).count;
  const edgeCount = (db.prepare("SELECT COUNT(*) as count FROM edges").get() as any).count;
  const fileCount = (db.prepare("SELECT COUNT(*) as count FROM files").get() as any).count;
  const layerCount = (db.prepare("SELECT COUNT(*) as count FROM layers").get() as any).count;
  return { nodeCount, edgeCount, fileCount, layerCount };
}
