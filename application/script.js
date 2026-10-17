/*const $ = (id) => document.getElementById(id);
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
let tasks = [];

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function say(msg, isError = false) {
  const el = $("message");
  el.textContent = msg;
  el.className = isError ? "error" : "";
}

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function button(label, className, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = className;
  b.addEventListener("click", onClick);
  return b;
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const filter = $("filter").value;
  let rows = tasks.filter(
    (t) => (!filter || t.status === filter) && (!q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  );
  if ($("sort-priority").checked) rows = [...rows].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const done = tasks.filter((t) => t.status === "Completed").length;
  $("stats").textContent = `Total: ${tasks.length} | Completed: ${done} | Pending: ${tasks.length - done}`;
  $("empty").hidden = rows.length > 0;

  const body = $("task-body");
  body.replaceChildren();
  for (const t of rows) {
    const tr = document.createElement("tr");
    if (t.status === "Completed") tr.className = "done";
    tr.append(cell(t.id), cell(t.title));

    const pr = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `pill ${t.priority}`;
    pill.textContent = t.priority;
    pr.append(pill);
    tr.append(pr, cell(t.status), cell(new Date(t.createdDate).toLocaleDateString()));

    const actions = document.createElement("td");
    actions.className = "actions";
    const next = t.status === "Completed" ? "Pending" : "Completed";
    actions.append(
      button(next === "Completed" ? "Mark Completed" : "Reopen", "secondary", () => update(t.id, { status: next })),
      button("Delete", "danger", () => remove(t.id))
    );
    tr.append(actions);
    body.append(tr);
  }
}

async function load() {
  try {
    tasks = await api("/api/tasks");
    render();
  } catch (e) {
    say(e.message, true);
  }
}

async function update(id, patch) {
  try {
    await api(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
    say(`Task ${id} updated successfully.`);
    await load();
  } catch (e) {
    say(e.message, true);
  }
}

async function remove(id) {
  if (!confirm(`Delete task ${id}?`)) return;
  try {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    say(`Task ${id} removed successfully.`);
    await load();
  } catch (e) {
    say(e.message, true);
  }
}

$("task-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    const task = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: $("title").value, priority: $("priority").value, status: $("status").value }),
    });
    say(`Task ${task.id} created successfully.`);
    $("task-form").reset();
    await load();
  } catch (e) {
    say(e.message, true);
  }
});

["search", "filter", "sort-priority"].forEach((id) => $(id).addEventListener("input", render));

(async function init() {
  try {
    const cfg = await api("/api/config");
    $("env-badge").textContent = cfg.environment;
  } catch { /* non-fatal */ /*}
  /*load();
})(); */

const $ = (id) => document.getElementById(id);
const STATUSES = ["Pending", "In Progress", "Completed"];
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const idNum = (t) => parseInt(t.id.slice(1), 10);

let tasks = [];
let view = "board";
let newestId = null;
let pendingDeleteId = null;
let editingId = null;

try { view = localStorage.getItem("view") === "table" ? "table" : "board"; } catch { /* storage unavailable */ }

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  $("toasts").append(el);
  setTimeout(() => el.remove(), isError ? 5500 : 3200);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function priorityTag(priority) {
  return el("span", `tag ${priority}`, priority);
}

function statusSelect(task) {
  const sel = el("select");
  sel.setAttribute("aria-label", `Status of ${task.id}`);
  for (const s of STATUSES) {
    const o = el("option", "", s);
    o.selected = s === task.status;
    sel.append(o);
  }
  sel.addEventListener("change", () => updateTask(task.id, { status: sel.value }));
  return sel;
}

function actionButtons(task) {
  const edit = el("button", "link-btn", "Edit");
  edit.type = "button";
  edit.setAttribute("aria-label", `Edit ${task.id}`);
  edit.addEventListener("click", () => openEdit(task));
  const del = el("button", "link-btn delete", "Delete");
  del.type = "button";
  del.setAttribute("aria-label", `Delete ${task.id}`);
  del.addEventListener("click", () => openDelete(task));
  return [edit, del];
}

function visibleTasks() {
  const q = $("search").value.trim().toLowerCase();
  const pr = $("filter-priority").value;
  const sort = $("sort").value;
  const rows = tasks.filter(
    (t) => (!pr || t.priority === pr) && (!q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  );
  rows.sort((a, b) => {
    if (sort === "oldest") return idNum(a) - idNum(b);
    if (sort === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || idNum(b) - idNum(a);
    return idNum(b) - idNum(a);
  });
  return rows;
}

function renderSummary() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("ring-fill").style.strokeDasharray = `${pct} 100`;
  $("ring-percent").textContent = `${pct}%`;

  if (!total) {
    $("summary-title").textContent = "No tasks yet";
    $("summary-next").textContent = "Add your first task to start tracking your work.";
    return;
  }
  $("summary-title").textContent = `${done} of ${total} ${total === 1 ? "task" : "tasks"} completed`;
  const next = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || idNum(a) - idNum(b))[0];
  const p = $("summary-next");
  p.replaceChildren();
  if (next) {
    p.append("Next up: ");
    p.append(Object.assign(el("strong"), { textContent: next.title }));
    p.append(` (${next.priority} priority)`);
  } else {
    p.textContent = "Everything is done. Nice work.";
  }
}

function renderBoard(rows) {
  const board = $("board");
  board.replaceChildren();
  for (const status of STATUSES) {
    const items = rows.filter((t) => t.status === status);
    const col = el("section", "column");
    col.dataset.status = status;
    const head = el("div", "column-head");
    head.append(el("span", "dot"), el("h3", "", status), el("span", "count", String(items.length)));
    col.append(head);
    if (!items.length) {
      col.append(el("p", "column-empty", "No tasks here."));
    } else {
      const list = el("div", "cards");
      for (const t of items) {
        const card = el("article", "card" + (t.status === "Completed" ? " completed" : "") + (t.id === newestId ? " new" : ""));
        card.dataset.priority = t.priority;
        const top = el("div", "card-top");
        top.append(el("span", "task-id", t.id), priorityTag(t.priority), el("span", "", fmtDate(t.createdDate)));
        const actions = el("div", "card-actions");
        const btns = el("div", "card-btns");
        btns.append(...actionButtons(t));
        actions.append(statusSelect(t), btns);
        card.append(top, el("div", "card-title", t.title), actions);
        list.append(card);
      }
      col.append(list);
    }
    board.append(col);
  }
}

function renderTable(rows) {
  const body = $("table-body");
  body.replaceChildren();
  for (const t of rows) {
    const tr = el("tr", t.status === "Completed" ? "completed" : "");
    const idTd = el("td", "task-id", t.id);
    const titleTd = el("td");
    titleTd.append(el("span", "task-title", t.title));
    const prTd = el("td");
    prTd.append(priorityTag(t.priority));
    const stTd = el("td");
    stTd.append(statusSelect(t));
    const actTd = el("td", "actions");
    actTd.append(...actionButtons(t));
    tr.append(idTd, titleTd, prTd, stTd, el("td", "muted", fmtDate(t.createdDate)), actTd);
    body.append(tr);
  }
}

function render() {
  renderSummary();
  const rows = visibleTasks();
  const empty = $("empty");
  const filtering = $("search").value.trim() || $("filter-priority").value;

  $("board").hidden = view !== "board";
  $("table-wrap").hidden = view !== "table" || rows.length === 0;
  $("view-board").setAttribute("aria-pressed", String(view === "board"));
  $("view-table").setAttribute("aria-pressed", String(view === "table"));

  if (view === "board") renderBoard(rows);
  else renderTable(rows);

  if (!tasks.length) {
    empty.hidden = false;
    empty.textContent = "No tasks yet. Add one using the form.";
    if (view === "board") $("board").hidden = true;
  } else if (!rows.length && filtering) {
    empty.hidden = false;
    empty.textContent = "No tasks match your search or filter.";
    if (view === "board") $("board").hidden = true;
  } else {
    empty.hidden = true;
  }
  newestId = null;
}

async function load() {
  try {
    tasks = await api("/api/tasks");
    render();
  } catch (e) {
    $("summary-title").textContent = "Could not load tasks";
    $("summary-next").textContent = e.message;
    toast(e.message, true);
  }
}

async function updateTask(id, patch) {
  try {
    await api(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
    toast(`Task ${id} updated.`);
    await load();
  } catch (e) {
    toast(e.message, true);
    await load();
  }
}

/* add */
$("task-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const titleEl = $("title");
  const title = titleEl.value.trim();
  $("title-error").hidden = !!title;
  titleEl.setAttribute("aria-invalid", String(!title));
  if (!title) { titleEl.focus(); return; }

  const btn = $("add-btn");
  btn.disabled = true;
  try {
    const task = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, priority: $("priority").value, status: $("status").value }),
    });
    newestId = task.id;
    toast(`Task ${task.id} created.`);
    $("task-form").reset();
    titleEl.focus();
    await load();
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
  }
});
$("title").addEventListener("input", () => {
  $("title-error").hidden = true;
  $("title").removeAttribute("aria-invalid");
});

/* edit */
function openEdit(task) {
  editingId = task.id;
  $("edit-heading").textContent = `Edit ${task.id}`;
  $("edit-title").value = task.title;
  $("edit-priority").value = task.priority;
  $("edit-status").value = task.status;
  $("edit-dialog").showModal();
  $("edit-title").focus();
}
$("edit-cancel").addEventListener("click", () => $("edit-dialog").close());
$("edit-form").addEventListener("submit", async () => {
  const title = $("edit-title").value.trim();
  if (!title || !editingId) return;
  await updateTask(editingId, { title, priority: $("edit-priority").value, status: $("edit-status").value });
});

/* delete */
function openDelete(task) {
  pendingDeleteId = task.id;
  $("delete-text").textContent = `${task.id}: ${task.title}`;
  $("delete-dialog").showModal();
}
$("delete-cancel").addEventListener("click", () => $("delete-dialog").close());
$("delete-dialog").querySelector("form").addEventListener("submit", async () => {
  const id = pendingDeleteId;
  if (!id) return;
  try {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    toast(`Task ${id} deleted.`);
  } catch (e) {
    toast(e.message, true);
  }
  await load();
});

/* toolbar */
["search", "filter-priority", "sort"].forEach((id) => $(id).addEventListener("input", render));
function setView(next) {
  view = next;
  try { localStorage.setItem("view", next); } catch { /* storage unavailable */ }
  render();
}
$("view-board").addEventListener("click", () => setView("board"));
$("view-table").addEventListener("click", () => setView("table"));

/* start */
(async function init() {
  $("board").append(el("div", "skeleton"), el("div", "skeleton"), el("div", "skeleton"));
  try {
    const cfg = await api("/api/config");
    $("env-badge").textContent = cfg.environment;
    $("env-badge").hidden = false;
  } catch { /* non-fatal */ }
  await load();
})();

