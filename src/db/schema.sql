CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT,
  language TEXT,
  start_line INTEGER,
  end_line INTEGER,
  docstring TEXT,
  signature TEXT,
  is_exported INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  complexity TEXT DEFAULT 'low',
  metadata TEXT DEFAULT '{}',
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  kind TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  line INTEGER,
  col INTEGER,
  FOREIGN KEY (source) REFERENCES nodes(id),
  FOREIGN KEY (target) REFERENCES nodes(id)
);

CREATE TABLE IF NOT EXISTS files (
  path TEXT PRIMARY KEY,
  content_hash TEXT,
  language TEXT,
  size INTEGER,
  modified_at INTEGER,
  indexed_at INTEGER,
  node_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS layers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS layer_nodes (
  layer_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  PRIMARY KEY (layer_id, node_id),
  FOREIGN KEY (layer_id) REFERENCES layers(id),
  FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_file_path ON nodes(file_path);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);

CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  id, name, docstring, signature, tags,
  content='nodes',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid, id, name, docstring, signature, tags)
  VALUES (new.rowid, new.id, new.name, new.docstring, new.signature, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, id, name, docstring, signature, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.docstring, old.signature, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, id, name, docstring, signature, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.docstring, old.signature, old.tags);
  INSERT INTO nodes_fts(rowid, id, name, docstring, signature, tags)
  VALUES (new.rowid, new.id, new.name, new.docstring, new.signature, new.tags);
END;
