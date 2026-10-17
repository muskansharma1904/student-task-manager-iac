// Local test: Terraform jaisa hi substitution karke worker ko mock KV ke saath chalata hai.
// Run:  node scripts/test_worker_local.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import assert from "node:assert/strict";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "application");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const built = read("worker.js")
  .replace("__INDEX_HTML__", () => JSON.stringify(read("index.html")))
  .replace("__STYLE_CSS__", () => JSON.stringify(read("style.css")))
  .replace("__SCRIPT_JS__", () => JSON.stringify(read("script.js")));
const tmp = path.join(os.tmpdir(), `worker-${Date.now()}.mjs`);
fs.writeFileSync(tmp, built);
const worker = (await import(pathToFileURL(tmp).href)).default;

const store = new Map();
const kv = {
  async get(k, type) { const v = store.get(k); if (v === undefined) return null; return type === "json" ? JSON.parse(v) : v; },
  async put(k, v) { store.set(k, v); },
  async delete(k) { store.delete(k); },
  async list({ prefix = "" } = {}) { return { keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
};
const env = { TASKS_KV: kv, ENVIRONMENT: "dev", APP_NAME: "Student Task Manager" };
const call = async (method, p, body) => {
  const res = await worker.fetch(new Request(`https://x.test${p}`, { method, body: body ? JSON.stringify(body) : undefined }), env);
  const ct = res.headers.get("content-type");
  return { status: res.status, ct, data: ct.includes("json") ? await res.json() : await res.text() };
};

let r = await call("GET", "/"); assert.equal(r.status, 200); assert.match(r.data, /Student Task Manager/);
r = await call("GET", "/script.js"); assert.equal(r.status, 200); assert.match(r.data, /api\("\/api\/tasks"\)/);
r = await call("GET", "/api/tasks"); assert.deepEqual(r.data, []);
r = await call("POST", "/api/tasks", { title: "Submit Project Report", priority: "High", status: "Pending" });
assert.equal(r.status, 201); assert.equal(r.data.id, "T101");
r = await call("POST", "/api/tasks", { title: "Attend Project Viva" }); assert.equal(r.data.id, "T102"); assert.equal(r.data.priority, "Medium");
r = await call("POST", "/api/tasks", { title: "" }); assert.equal(r.status, 400);
r = await call("POST", "/api/tasks", { title: "x", priority: "Urgent" }); assert.equal(r.status, 400);
r = await call("GET", "/api/tasks/T101"); assert.equal(r.data.title, "Submit Project Report");
r = await call("PUT", "/api/tasks/T101", { status: "Completed" }); assert.equal(r.data.status, "Completed");
r = await call("PUT", "/api/tasks/T101", { status: "Done" }); assert.equal(r.status, 400);
r = await call("GET", "/api/tasks"); assert.equal(r.data.length, 2);
r = await call("DELETE", "/api/tasks/T101"); assert.equal(r.status, 200);
r = await call("GET", "/api/tasks/T101"); assert.equal(r.status, 404);
r = await call("GET", "/api/tasks/abc"); assert.equal(r.status, 400);
r = await call("GET", "/api/config"); assert.equal(r.data.environment, "dev");
fs.unlinkSync(tmp);
console.log("All worker tests passed ✔");
