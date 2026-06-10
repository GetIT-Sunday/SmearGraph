import { getMemoryStore } from "../../memory/index.js";

export const storeHandler = async (args: Record<string, unknown>) => {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const store = getMemoryStore(root);

  const kind = args.kind as string || "insight";
  const title = args.title as string;
  const content = args.content as string;
  const tags = (args.tags as string[]) || [];

  if (!title || !content) return { error: "title and content are required" };

  const validKinds = ["decision", "insight", "pattern", "issue"];
  if (!validKinds.includes(kind)) return { error: `kind must be one of: ${validKinds.join(", ")}` };

  const entry = store.store(kind as any, title, content, tags);
  return { stored: true, id: entry.id, kind: entry.kind, title: entry.title };
};

export const searchHandler = async (args: Record<string, unknown>) => {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const store = getMemoryStore(root);

  const query = args.query as string;
  const limit = (args.limit as number) || 20;

  if (!query) return { error: "query is required" };

  const results = store.search(query, limit);
  return {
    query,
    count: results.length,
    results: results.map(r => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      content: r.content.slice(0, 200) + (r.content.length > 200 ? "..." : ""),
      tags: r.tags,
      createdAt: r.createdAt,
    })),
  };
};

export const listHandler = async (args: Record<string, unknown>) => {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const store = getMemoryStore(root);

  const kind = args.kind as string | undefined;
  const limit = (args.limit as number) || 50;

  const results = store.list(kind as any, limit);
  return {
    count: results.length,
    results: results.map(r => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      tags: r.tags,
      createdAt: r.createdAt,
    })),
  };
};

export const statsHandler = async (_args: Record<string, unknown>) => {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const store = getMemoryStore(root);

  return store.stats();
};
