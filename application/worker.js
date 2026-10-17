// Cloudflare Worker: serves the web UI + REST API backed by Workers KV.
// The three "__..__" tokens below are replaced by Terraform (main.tf) with
// the contents of index.html, style.css and script.js at deploy time.

const INDEX_HTML = __INDEX_HTML__;
const STYLE_CSS = __STYLE_CSS__;
const SCRIPT_JS = __SCRIPT_JS__;

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Pending", "In Progress", "Completed"];
const KEY_PREFIX = "task:";
const COUNTER_KEY = "meta:counter";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const text = (body, type) =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8` } });

async function nextId(kv) {
  const current = parseInt((await kv.get(COUNTER_KEY)) || "100", 10);
  const next = current + 1;
  await kv.put(COUNTER_KEY, String(next));
  return `T${next}`;
}

async function listTasks(kv) {
  const tasks = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: KEY_PREFIX, cursor });
    const items = await Promise.all(page.keys.map((k) => kv.get(k.name, "json")));
    tasks.push(...items.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  tasks.sort((a, b) => parseInt(a.id.slice(1), 10) - parseInt(b.id.slice(1), 10));
  return tasks;
}

function validate(body, { partial }) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) errors.push("title is required");
    else if (body.title.length > 200) errors.push("title too long (max 200)");
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority))
    errors.push(`priority must be one of ${PRIORITIES.join(", ")}`);
  if (body.status !== undefined && !STATUSES.includes(body.status))
    errors.push(`status must be one of ${STATUSES.join(", ")}`);
  return errors;
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

async function handleApi(request, env, url) {
  const kv = env.TASKS_KV;
  const parts = url.pathname.split("/").filter(Boolean); // ["api","tasks",":id"]
  const method = request.method;

  if (parts[1] === "config" && method === "GET") {
    return json({ appName: env.APP_NAME || "Student Task Manager", environment: env.ENVIRONMENT || "dev" });
  }
  if (parts[1] !== "tasks" || parts.length > 3) return json({ error: "Not found" }, 404);

  const id = parts[2];

  if (!id) {
    if (method === "GET") return json(await listTasks(kv));
    if (method === "POST") {
      const body = await readJson(request);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const errors = validate(body, { partial: false });
      if (errors.length) return json({ error: errors.join("; ") }, 400);
      const task = {
        id: await nextId(kv),
        title: body.title.trim(),
        priority: body.priority || "Medium",
        status: body.status || "Pending",
        createdDate: new Date().toISOString(),
      };
      await kv.put(KEY_PREFIX + task.id, JSON.stringify(task));
      return json(task, 201);
    }
    return json({ error: "Method not allowed" }, 405);
  }

  if (!/^T\d+$/.test(id)) return json({ error: "Invalid task id" }, 400);
  const key = KEY_PREFIX + id;
  const existing = await kv.get(key, "json");
  if (!existing) return json({ error: `Task ${id} not found` }, 404);

  if (method === "GET") return json(existing);
  if (method === "PUT") {
    const body = await readJson(request);
    if (!body) return json({ error: "Invalid JSON body" }, 400);
    const errors = validate(body, { partial: true });
    if (errors.length) return json({ error: errors.join("; ") }, 400);
    const updated = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() : existing.title,
      priority: body.priority ?? existing.priority,
      status: body.status ?? existing.status,
    };
    await kv.put(key, JSON.stringify(updated));
    return json(updated);
  }
  if (method === "DELETE") {
    await kv.delete(key);
    return json({ message: `Task ${id} deleted` });
  }
  return json({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      switch (url.pathname) {
        case "/":
        case "/index.html":
          return text(INDEX_HTML, "text/html");
        case "/style.css":
          return text(STYLE_CSS, "text/css");
        case "/script.js":
          return text(SCRIPT_JS, "application/javascript");
        default:
          return json({ error: "Not found" }, 404);
      }
    } catch (err) {
      return json({ error: "Internal error", detail: String(err && err.message) }, 500);
    }
  },
};
