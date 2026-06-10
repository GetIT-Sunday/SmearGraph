import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

export class DatabaseConnection {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("cache_size = -64000");
    this.db.pragma("temp_store = MEMORY");
    this.db.pragma("mmap_size = 268435456");
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }
}

export function openDatabase(projectRoot: string): DatabaseConnection {
  const dbPath = path.join(projectRoot, ".smeargraph", "index.db");
  return new DatabaseConnection(dbPath);
}
