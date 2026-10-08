"use strict";
// DepEd Study Planner - local-first, no build step. Data stays in this browser.
const KEY = "deped-planner-v2";
const D0 = { settings: { schoolYear: "2026-2027", periodLabel: "Term", periods: ["T1", "T2", "T3"], active: "T1", maxPerDay: 2, name: "", school: "", grade: "", section: "", strand: "", setupDone: false, autoTerm: true, schoolType: "Public", pathway: "Strengthened SHS (Grade 11)", structure: "Three-term", studyDays: "Mon, Tue, Wed, Thu, Fri", modality: "" },
  subjects: [], tasks: [], comps: [], grades: [], exams: [], events: [], chores: [], report: {}, cal: {} };
let db = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {} return { ...structuredClone(D0), ...s, settings: { ...D0.settings, ...(s.settings || {}) } }; })();
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const $ = q => document.querySelector(q);
const h = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => iso(new Date());
const addDays = (d, n) => { const t = new Date(d + "T00:00:00"); t.setDate(t.getDate() + n); return iso(t); };
function nextDate(d, r) {
  const t = new Date(d + "T00:00:00");
  if (r === "daily") t.setDate(t.getDate() + 1);
  else if (r === "weekdays") { do t.setDate(t.getDate() + 1); while ([0, 6].includes(t.getDay())); }
  else if (r === "weekly") t.setDate(t.getDate() + 7);
  else if (r === "monthly") t.setMonth(t.getMonth() + 1);
  return iso(t);
}
const wdOf = d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
const pct = s => { s = String(s ?? "").trim(); if (!s) return null; const m = s.split("/"), a = parseFloat(m[0]), b = m[1] ? parseFloat(m[1]) : 100; return isNaN(a) || !b ? null : a / b * 100; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const S0 = () => db.settings;
const PATH = { "Strengthened SHS (Grade 11)": 0, "Existing SHS (Grade 12)": 3, "Strengthened SHS pilot school (Grade 12)": 0 };
const cal = () => db.cal[S0().schoolYear] || [];
const periodFor = d => { const p = cal().find(x => x.start && x.end && d >= x.start && d <= x.end); return p ? p.id : null; };
const tagFor = d => periodFor(d) ?? S0().active;
function syncActive() { if (S0().autoTerm) { const p = periodFor(today()); if (p) S0().active = p; } }
function retag() {
  let n = 0; const sy = S0().schoolYear;
  [["tasks", "due"], ["exams", "date"]].forEach(([k, f]) => db[k].forEach(r => { const p = r.sy === sy && periodFor(r[f]); if (p && p !== r.period) { r.period = p; n++; } }));
  return n;
}
const ACAD = ["Written Work", "Performance Task", "Reading", "Project", "Revision"], PERS = ["Personal", "Household", "Health", "Other"];
const SC = {
  subjects: [["name", "Subject"], ["teacher", "Teacher"], ["schedule", "Schedule (e.g. Mon/Wed 8:00-9:00)"], ["room", "Room"], ["track", "Strand/Track"], ["group", "Grading group", "select", POLICY.groups.map(g => g.name)]],
  tasks: [["title", "Task"], ["subject", "Subject", "subj"], ["type", "Type", "select", [...ACAD, ...PERS]], ["due", "Due date", "date"], ["priority", "Priority", "select", ["Low", "Medium", "High"]], ["status", "Status", "select", ["To Do", "In Progress", "Submitted", "Completed", "On Hold"]], ["score", "Score (e.g. 18/20)"], ["repeat", "Repeat", "select", ["none", "daily", "weekdays", "weekly", "monthly"]], ["notes", "Notes"]],
  comps: [["text", "Learning competency"], ["code", "Competency code"], ["subject", "Subject", "subj"], ["status", "Status", "select", ["Not Started", "Learning", "Proficient", "Mastered"]], ["assess", "Related assessment"], ["notes", "Notes"]],
  grades: [["subject", "Subject", "subj"], ["wwRaw", "Written/Oral Works score", "number"], ["wwHps", "WW highest possible score", "number"], ["ptRaw", "Performance Tasks score", "number"], ["ptHps", "PT highest possible score", "number"], ["st1Raw", "Summative Test 1 score", "number"], ["st1Hps", "ST1 highest possible score", "number"], ["st2Raw", "Summative Test 2 score", "number"], ["st2Hps", "ST2 highest possible score", "number"], ["teRaw", "Term Exam score", "number"], ["teHps", "Term Exam highest possible score", "number"], ["given", "Teacher-provided term grade (optional)", "number"]],
  exams: [["name", "Exam"], ["subject", "Subject", "subj"], ["date", "Date", "date"], ["coverage", "Coverage (topics, comma-separated)"], ["review", "Review status", "select", ["Not started", "Reviewing", "Reviewed"]], ["score", "Score (e.g. 45/50)"], ["remarks", "Remarks"]],
  events: [["title", "Event"], ["date", "Date", "date"], ["cat", "Category", "select", ["Class", "Exam", "Assignment", "Activity", "Holiday", "Deadline"]], ["source", "Source", "select", ["Personal event", "School announcement", "Unverified"]]],
  chores: [["area", "Area"], ["people", "Names, comma-separated"], ["every", "Rotation", "select", ["daily", "weekly"]], ["start", "Rotation start", "date"]]
};
let editing = {}, ui = { page: "dash", cat: "All" };

function form(n, v = {}) {
  return `<form data-form="${n}" class="fgrid">${SC[n].map(([k, l, t = "text", o], i) => {
    let val = v[k] ?? (t === "date" ? today() : ""); if (Array.isArray(val)) val = val.join(", ");
    if (n === "subjects" && k === "group" && !val) val = POLICY.groups[PATH[S0().pathway] || 0].name;
    return `<label>${l}${t === "select" ? `<select name="${k}">${o.map(x => `<option${x == val ? " selected" : ""}>${x}</option>`).join("")}</select>`
      : `<input name="${k}" type="${t === "subj" ? "text" : t}"${t === "subj" ? ' list="sl"' : ""}${t === "number" ? ' step="any"' : ""} value="${h(val)}"${i === 0 ? " required" : ""}>`}</label>`;
  }).join("")}<button class="btn">${editing[n] ? "Save changes" : "Add"}</button>${editing[n] ? `<button type="button" class="btn alt" data-cancel="${n}">Cancel</button>` : ""}</form>`;
}
const tbl = (n, rows, cols, x = () => "") => rows.length ? `<div class="scroll"><table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join("")}<th></th></tr></thead><tbody>${rows.map(r =>
  `<tr>${cols.map(c => `<td>${c[1](r)}</td>`).join("")}<td>${(x || (() => ""))(r)}<button class="btn alt sm" data-edit="${n}:${r.id}">Edit</button><button class="btn alt sm" data-del="${n}:${r.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">Nothing here yet.</p>';
const box = (n, c) => `<details class="card add"${editing[n] || !c ? " open" : ""}><summary>${editing[n] ? "Edit record" : "+ Add new"}</summary>${form(n, editing[n] && db[n].find(r => r.id === editing[n]))}</details>`;
const crud = (n, title, cols, x, note = "", sort) => {
  const rows = db[n].filter(r => !r.sy || r.sy === S0().schoolYear); if (sort) rows.sort(sort);
  return `<h2>${title}</h2>${note ? `<p class="lbl">${note}</p>` : ""}${box(n, rows.length)}<div class="card">${tbl(n, rows, cols, x)}</div>`;
};
const tag = (t, c = "") => `<span class="tag ${c}">${h(t)}</span>`;
const card = (t, b) => `<div class="card"><h3>${t}</h3>${b || '<p class="empty">Nothing yet.</p>'}</div>`;
const bar = (l, p) => `<div class="bar"><span>${h(l)}</span><i style="--w:${Math.max(0, Math.min(100, p || 0))}%" role="img" aria-label="${p == null ? "no data" : Math.round(p) + " percent"}"></i><b>${p == null ? "-" : Math.round(p) + "%"}</b></div>`;
const st = t => t.status !== "Completed" && t.due < today() ? "Overdue" : t.status;
const grp = n => { const s = db.subjects.find(x => x.name === n); return POLICY.groups.find(g => g.name === (s && s.group)) || POLICY.groups[0]; };
const num = v => v === "" || v == null || isNaN(+v) ? null : +v;
const psOf = (r, k) => { const a = num(r[k + "Raw"]), b = num(r[k + "Hps"]); return a == null || !b ? null : a / b * 100; };
function transmute(ig) {
  ig = Math.round(ig * 100) / 100;
  if (ig >= 99.5) return 100;
  if (ig >= POLICY.base) return POLICY.basePass + Math.floor((ig - POLICY.base) / POLICY.step + 1e-9);
  for (const [lo, g] of POLICY.below70) if (ig >= lo) return g;
  return POLICY.minGrade;
}
const descr = g => (POLICY.descriptors.find(d => g >= d[0]) || [0, "Emerging"])[1];
function calc(r) {
  const g = grp(r.subject), w = g.w, miss = [], wwp = psOf(r, "ww"), ptp = psOf(r, "pt"), s1 = psOf(r, "st1"), s2 = psOf(r, "st2"), te = psOf(r, "te");
  if (wwp == null) miss.push("Written/Oral Works"); if (ptp == null) miss.push("Performance Tasks");
  if (w.ex > 0) { if (s1 == null) miss.push("Summative Test 1"); if (s2 == null) miss.push("Summative Test 2"); if (te == null) miss.push("Term Exam"); }
  const out = { g, miss, wwp, ptp, exp: w.ex > 0 && !miss.length ? s1 * POLICY.examSplit[0] + s2 * POLICY.examSplit[1] + te * POLICY.examSplit[2] : null };
  if (miss.length) return out;
  out.ws = [wwp * w.ww / 100, ptp * w.pt / 100, (out.exp || 0) * w.ex / 100];
  out.ig = Math.round(out.ws.reduce((x, y) => x + y, 0) * 100) / 100; out.tg = transmute(out.ig); out.desc = descr(out.tg);
  return out;
}
const tgOf = r => { const c = calc(r); return c.tg ?? num(r.given); };
const gradeOf = n => { const g = db.grades.filter(g => g.subject === n && g.period === S0().active && g.sy === S0().schoolYear).pop(), t = g && tgOf(g); return t == null ? "-" : h(t); };
const finalOf = n => { const ts = S0().periods.map(p => { const g = db.grades.filter(g => g.subject === n && g.period === p && g.sy === S0().schoolYear).pop(); return g ? tgOf(g) : null; }); return ts.every(t => t != null) && ts.length ? Math.round(avg(ts)) : null; };
function dutyFor(c, date) {
  if (!c.people.length) return "";
  const days = Math.round((new Date(date + "T00:00:00") - new Date(c.start + "T00:00:00")) / 864e5), step = c.every === "weekly" ? Math.floor(days / 7) : days;
  return c.people[((step % c.people.length) + c.people.length) % c.people.length];
}
function completeTask(t) {
  t.status = "Completed";
  if (t.repeat && t.repeat !== "none") db.tasks.push({ ...t, id: uid(), status: "To Do", score: "", due: nextDate(t.due, t.repeat), created: today() });
}
function planExam(x) {
  const steps = [...String(x.coverage || "").split(",").map(s => s.trim()).filter(Boolean).map(t => "Review: " + t), "Practice questions", "Final review"];
  const cap = +S0().maxPerDay || 2, load = d => db.tasks.filter(t => t.due === d && ACAD.includes(t.type) && t.status !== "Completed").length;
  const days = String(S0().studyDays || "").toLowerCase();
  let d = addDays(x.date, -1);
  for (let i = steps.length - 1; i >= 0; i--) {
    while ((load(d) >= cap || (days && !days.includes(wdOf(d).toLowerCase()))) && d > today()) d = addDays(d, -1);
    if (d < today()) d = today();
    db.tasks.push({ id: uid(), created: today(), title: steps[i] + " (" + x.name + ")", subject: x.subject, type: "Revision", due: d, priority: "Medium", status: "To Do", score: "", repeat: "none", notes: "", period: tagFor(d), sy: x.sy });
  }
}
function choreAlerts() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  db.chores.forEach(c => { if (c.lastAlert !== today()) { c.lastAlert = today(); new Notification(`Cleaning today: ${c.area} - ${dutyFor(c, today())}`); } }); save();
}

const P = {
  dash() {
    const s = S0(), hr = new Date().getHours(), td = today(), wd = wdOf(td);
    const steps = [["Add your profile", !!s.name, "settings"], ["Add your subjects", db.subjects.length > 0, "subjects"], ["Add your first task", db.tasks.length > 0, "tasks"], ["Add an upcoming exam", db.exams.length > 0, "exams"], ["Turn on reminders", "Notification" in window && Notification.permission === "granted", "notif"]];
    const done = steps.filter(x => x[1]).length, cur = db.comps.filter(c => c.sy === s.schoolYear && c.period === s.active);
    const sched = [...db.subjects.filter(x => (x.schedule || "").toLowerCase().includes(wd.toLowerCase())).map(x => `<p>${tag("Class")} ${h(x.name)} ${h(x.schedule)} ${h(x.room)}</p>`),
      ...db.events.filter(v => v.date === td).map(v => `<p>${tag(v.cat)} ${h(v.title)}</p>`),
      ...db.chores.map(c => `<p>${tag("Cleaning")} ${h(c.area)}: <b>${h(dutyFor(c, td))}</b></p>`)];
    const due = db.tasks.filter(t => t.status !== "Completed").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5).map(t => `<p>${h(t.title)} ${tag(st(t), st(t) === "Overdue" ? "bad" : "")} <span class="lbl">${t.due}</span></p>`);
    const ex = db.exams.filter(x => x.date >= td).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(x => `<p>${h(x.name)} - ${h(x.subject)} <span class="lbl">${x.date}</span></p>`);
    const ann = db.events.filter(v => v.source === "School announcement").slice(-5).map(v => `<p>${h(v.title)} <span class="lbl">${v.date}</span></p>`);
    const open = db.tasks.filter(t => t.status !== "Completed").length, nex = db.exams.filter(x => x.date >= td).length;
    const tgs = db.subjects.map(x => num(gradeOf(x.name))).filter(x => x != null), mast = cur.length ? Math.round(cur.filter(c => ["Proficient", "Mastered"].includes(c.status)).length / cur.length * 100) + "%" : "-";
    const kpi = (v, l, i) => `<div class="kpi"><span>${i}</span><b>${v}</b><small>${l}</small></div>`;
    return `<div class="hero"><div><small>${new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}</small>
      <h2>${hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening"}${s.name ? ", " + h(s.name) : ""} &#128075;</h2>
      <div class="chips"><span>SY ${h(s.schoolYear)}</span><span>${h(s.periodLabel)} ${h(s.active)}${s.autoTerm && periodFor(td) ? " (from calendar)" : cal().some(x => x.start) && !periodFor(td) ? " | between terms" : ""}</span>${s.grade ? `<span>Grade ${h(s.grade)} ${h(s.section)}</span>` : ""}${s.strand ? `<span>${h(s.strand)}</span>` : ""}</div></div></div>
    <div class="kpis">${kpi(open, "Pending tasks", "&#128221;")}${kpi(nex, "Upcoming exams", "&#129514;")}${kpi(mast, "Competencies Proficient+", "&#127919;")}${kpi(tgs.length ? Math.round(avg(tgs)) : "-", "Avg term grade (estimate)", "&#128202;")}</div>
    ${done < 5 ? `<div class="card"><h3>Finish setting up <span class="lbl">${done} of 5 done</span></h3><div class="prog" style="background:var(--pl)"><i style="width:${done * 20}%;background:var(--p)"></i></div>
      ${steps.map(([l, ok, go]) => `<div class="step"><span>${ok ? "&#9989;" : "&#9675;"} ${l}</span>${ok ? "" : go === "notif" ? '<button class="btn alt sm" data-notif>Turn on</button>' : `<button class="btn alt sm" data-go="${go}">Open</button>`}</div>`).join("")}</div>` : ""}
    <div class="grid">${card("&#128197; Today's schedule", sched.join(""))}${card("&#128221; Due soon", due.join(""))}
    ${card("&#128202; Current grades", db.subjects.map(x => `<p>${h(x.name)} <b class="pill">${gradeOf(x.name)}</b></p>`).join(""))}
    ${card("&#127919; Competency progress", cur.length ? bar("Proficient or Mastered", cur.filter(c => ["Proficient", "Mastered"].includes(c.status)).length / cur.length * 100) : "")}
    ${card("&#128204; Upcoming exams", ex.join(""))}${card("&#128276; Important announcements", ann.join(""))}</div>`;
  },
  subjects() {
    const cols = ["#6a3fd6", "#0f8b8d", "#d6336c", "#e8590c", "#2f9e44", "#1c7ed6"], rows = db.subjects;
    return `<h2>&#128218; Subjects</h2>${box("subjects", rows.length)}<div class="subs">${rows.map((r, i) => `<div class="sub" style="--c:${cols[i % 6]}"><h3>${h(r.name)}</h3>
      <p>&#128100; ${h(r.teacher || "No teacher")}</p><p>&#128338; ${h(r.schedule || "No schedule")}</p><p>&#128682; ${h(r.room || "No room")}</p><p>&#127891; ${h(r.track || "No strand/track")}</p>
      <p class="lbl">${h(r.group || POLICY.groups[0].name)}</p>
      <div class="gr"><span class="lbl">${h(S0().periodLabel)} ${h(S0().active)} grade</span><b>${gradeOf(r.name)}</b></div>
      <div><button class="btn alt sm" data-edit="subjects:${r.id}">Edit</button><button class="btn alt sm" data-del="subjects:${r.id}">Delete</button></div></div>`).join("") || '<p class="empty">No subjects yet. Add your first one above.</p>'}</div>`;
  },
  tasks: () => crud("tasks", "&#128221; Assignments", [["Task", r => h(r.title) + (r.repeat !== "none" ? " " + tag("Repeats " + r.repeat) : "")], ["Subject", r => h(r.subject)], ["Type", r => tag(r.type)], ["Due", r => r.due], ["Priority", r => h(r.priority)], ["Status", r => tag(st(r), st(r) === "Overdue" ? "bad" : r.status === "Completed" ? "ok" : "")], ["Score", r => h(r.score)], [h(S0().periodLabel), r => h(r.period)], ["Notes", r => h(r.notes)]],
    r => r.status !== "Completed" ? `<button class="btn sm" data-done="${r.id}">Done</button>` : "", "Academic and non-academic tasks. Completing a repeating task creates the next one.", (a, b) => a.due.localeCompare(b.due)),
  comps: () => crud("comps", "&#127919; Competency tracker", [["Subject", r => h(r.subject)], [h(S0().periodLabel), r => h(r.period)], ["Learning competency", r => h(r.text)], ["Code", r => h(r.code)], ["Status", r => tag(r.status)], ["Related assessment", r => h(r.assess)], ["Notes", r => h(r.notes)]], null,
    "Enter competency statements and codes exactly as in the official curriculum guide. Statuses are your own labels, not official ratings."),
  grades: () => crud("grades", "&#128202; Grades & assessments", [["Subject", r => h(r.subject)], [h(S0().periodLabel), r => h(r.period)],
    ["WW %", r => { const c = calc(r); return c.wwp == null ? "-" : c.wwp.toFixed(1); }], ["PT %", r => { const c = calc(r); return c.ptp == null ? "-" : c.ptp.toFixed(1); }], ["Exam %", r => { const c = calc(r); return c.exp == null ? "-" : c.exp.toFixed(1); }],
    ["Initial grade", r => { const c = calc(r); return c.ig == null ? "-" : c.ig.toFixed(2); }],
    ["Term grade", r => { const c = calc(r); return c.miss.length ? tag("Missing: " + c.miss.join(", "), "warn") : `<b>${c.tg}</b> ${tag("Estimate")} ${tag(c.desc, c.tg >= POLICY.passing ? "ok" : "bad")}`; }],
    ["Teacher-given", r => h(r.given)],
    ["Computation", r => { const c = calc(r); if (c.miss.length) return ""; const w = c.g.w;
      return `<details><summary>Show</summary><p class="lbl">${h(c.g.name)} (${w.ww}/${w.pt}/${w.ex})<br>WW ${c.wwp.toFixed(2)} x ${w.ww}% = ${c.ws[0].toFixed(2)}<br>PT ${c.ptp.toFixed(2)} x ${w.pt}% = ${c.ws[1].toFixed(2)}<br>${w.ex ? `Exams ${c.exp.toFixed(2)} (30/30/40) x ${w.ex}% = ${c.ws[2].toFixed(2)}<br>` : ""}Initial grade ${c.ig.toFixed(2)} &rarr; term grade ${c.tg}</p></details>`; }]], null,
    `Computed with the DO 015, s. 2026 weights for each subject's grading group (set it under Subjects) and the adjusted SY 2026-2027 transmutation table. Unverified: ${h(POLICY.note)}`),
  exams: () => crud("exams", "&#129514; Exams", [["Exam", r => h(r.name)], ["Subject", r => h(r.subject)], ["Date", r => r.date], ["Coverage", r => h(r.coverage)], ["Review", r => tag(r.review)], ["Score", r => h(r.score)], ["Remarks", r => h(r.remarks)]],
    r => `<button class="btn sm" data-plan="${r.id}">Study sessions</button>`, "Study sessions are added to Assignments, one topic per day, within your daily limit.", (a, b) => a.date.localeCompare(b.date)),
  calendar() {
    const days = [...Array(21)].map((_, i) => addDays(today(), i)), cats = ["All", "Class", "Exam", "Assignment", "Activity", "Holiday", "Deadline", "Cleaning", "Term"];
    const items = d => [...db.subjects.filter(s => (s.schedule || "").toLowerCase().includes(wdOf(d).toLowerCase())).map(s => ["Class", "Personal event", s.name + " " + s.schedule]),
      ...db.tasks.filter(t => t.due === d && t.status !== "Completed").map(t => ["Assignment", "Personal event", "Due: " + t.title]),
      ...db.exams.filter(x => x.date === d).map(x => ["Exam", "Personal event", x.name + " (" + x.subject + ")"]),
      ...db.chores.map(c => ["Cleaning", "Personal event", c.area + ": " + dutyFor(c, d)]),
      ...cal().filter(x => x.start === d || x.end === d).map(x => ["Term", "Personal event", `${S0().periodLabel} ${x.id} ${x.start === d ? "starts" : "ends"}`]),
      ...db.events.filter(v => v.date === d).map(v => [v.cat, v.source, v.title, v.id])].filter(i => ui.cat === "All" || i[0] === ui.cat);
    return `<h2>&#128197; School calendar</h2><div class="card">${form("events")}<p class="lbl">Official DepEd labels are not available until an event is verified against an issuance. Class suspensions need an official announcement.</p></div>
    <label class="no-print">Show <select data-cat>${cats.map(c => `<option${c === ui.cat ? " selected" : ""}>${c}</option>`).join("")}</select></label>
    ${days.map(d => { const it = items(d); return it.length ? `<div class="card"><b>${d} ${wdOf(d)}</b>${it.map(i => `<p>${tag(i[0])} ${tag(i[1])} ${h(i[2])}${i[3] ? ` <button class="btn alt sm" data-del="events:${i[3]}">Delete</button>` : ""}</p>`).join("")}</div>` : ""; }).join("") || '<p class="empty">Nothing scheduled in the next 21 days.</p>'}`;
  },
  progress() {
    const s = S0(), sy = s.schoolYear, tk = db.tasks.filter(t => t.sy === sy && ACAD.includes(t.type)), none = "";
    const subs = [...new Set(db.grades.filter(g => g.sy === sy).map(g => g.subject))], cm = db.comps.filter(c => c.sy === sy);
    const ex = db.exams.filter(x => x.sy === sy && pct(x.score) != null), tdone = tk.filter(t => t.status === "Completed").length;
    return `<h2>&#128200; Progress</h2><div class="grid">
    ${card("Grade trends", subs.map(n => `<p><b>${h(n)}</b></p>` + s.periods.map(p => { const g = db.grades.find(g => g.sy === sy && g.subject === n && g.period === p); return bar(p, g ? tgOf(g) : null); }).join("")).join(""))}
    ${card("Subject averages (assignment scores, estimate)", [...new Set(tk.map(t => t.subject).filter(Boolean))].map(n => bar(n, avg(tk.filter(t => t.subject === n).map(t => pct(t.score)).filter(x => x != null)))).join(""))}
    ${card("Competency mastery", cm.length ? ["Not Started", "Learning", "Proficient", "Mastered"].map(k => bar(k, cm.filter(c => c.status === k).length / cm.length * 100)).join("") : none)}
    ${card("Assignment completion", tk.length ? bar(tdone + " of " + tk.length, tdone / tk.length * 100) : none)}
    ${card("Assessment performance (exams)", ex.map(x => bar(x.name, pct(x.score))).join(""))}</div>
    <p class="lbl">No final grades are predicted and students are not ranked.</p>`;
  },
  report() {
    const s = S0(), p = s.active, k = s.schoolYear + "|" + p, r = db.report[k] || {}, subs = db.subjects.map(x => x.name);
    const tg = (n, per) => { const g = db.grades.filter(g => g.subject === n && g.period === per && g.sy === s.schoolYear).pop(); return g ? tgOf(g) : null; };
    return `<h2>&#128209; Report card</h2><p class="lbl no-print">Pick the ${h(s.periodLabel.toLowerCase())} at the top right. Final grade is the rounded average of all term grades, shown only when every term has a grade.</p>
    <div class="card" id="rc"><h3>Student-generated academic progress report</h3>
    <p>${h(s.name || "Name not set")} | ${h(s.school || "School not set")} | Grade ${h(s.grade || "?")} ${h(s.section)} ${h(s.strand)}<br>SY ${h(s.schoolYear)} | Generated ${today()}</p>
    ${subs.length ? `<div class="scroll"><table><tr><th>Subject</th>${s.periods.map(x => `<th>${h(x)}</th>`).join("")}<th>Final grade</th><th>Descriptor</th></tr>${subs.map(n => { const f = finalOf(n); return `<tr><td>${h(n)}</td>${s.periods.map(x => `<td>${tg(n, x) ?? "-"}</td>`).join("")}<td><b>${f ?? "-"}</b></td><td>${f == null ? "-" : tag(descr(f), f >= POLICY.passing ? "ok" : "bad")}</td></tr>`; }).join("")}</table></div>` : '<p class="empty">Add subjects and grades first.</p>'}
    <p>General average (as given by school): <b>${h(r.avg || "Not entered")}</b><br>Remarks: ${h(r.remarks || "None")}</p>
    <p class="lbl">Estimates computed from student-entered scores using unverified policy values (${h(POLICY.note)}). Not an official DepEd report card or school-issued record.</p></div>
    <div class="card no-print"><form data-rc="${k}" class="fgrid"><label>General average (from school)<input name="avg" value="${h(r.avg)}"></label><label>Remarks<input name="remarks" value="${h(r.remarks)}"></label><button class="btn">Save</button></form></div>
    <button class="btn no-print" data-prn>Print or save as PDF</button>`;
  },
  archive() {
    const s = S0(), all = [...db.tasks, ...db.comps, ...db.grades, ...db.exams], years = [...new Set([s.schoolYear, ...all.map(r => r.sy).filter(Boolean)])].sort().reverse();
    return `<h2>&#128450; School-year archive</h2>
    ${years.map(y => card("SY " + h(y) + (y === s.schoolYear ? " (current)" : ""), [...s.periods, ""].map(p => { const f = a => a.filter(r => r.sy === y && (r.period || "") === p).length; const n = f(db.tasks) + f(db.comps) + f(db.grades) + f(db.exams);
      return n ? `<p><b>${h(p || "No period")}</b>: ${f(db.tasks)} assignments, ${f(db.comps)} competencies, ${f(db.grades)} grade records, ${f(db.exams)} exams${db.report[y + "|" + p] ? " " + tag("Report card saved") : ""}</p>` : ""; }).join(""))).join("")}
    ${card("Completed assignments", db.tasks.filter(t => t.status === "Completed").slice(-15).reverse().map(t => `<p>${h(t.title)} <span class="lbl">${h(t.sy)} ${h(t.period)} | due ${t.due}</span></p>`).join(""))}
    <div class="card"><h3>Start a new school year</h3><form data-sy class="fgrid"><label>School year<input name="sy" placeholder="2027-2028" required></label><button class="btn">Switch</button></form>
    <p class="lbl">Old records stay in the archive under their original school year and are not recalculated.</p></div>`;
  },
  chores: () => crud("chores", "&#129529; Cleaning reminders", [["Area", r => h(r.area)], ["Today", r => `<b>${h(dutyFor(r, today()))}</b>`], ["Tomorrow", r => h(dutyFor(r, addDays(today(), 1)))], ["Rotation", r => h(r.every) + ": " + r.people.map(h).join(" > ")]], null,
    "Rotating duty roster. Browser notifications fire while the app is open.") + '<button class="btn alt" data-notif>Enable reminders</button>',
  settings: () => `<h2>&#9881;&#65039; Settings</h2><div class="card"><h3>Learner profile</h3>${fProfile()}</div>
    <div class="card"><h3>School calendar and grading periods</h3>${fCal()}</div><div class="card"><h3>Study preferences</h3>${fPrefs()}</div>
    <div class="card"><h3>Data</h3><div class="fgrid"><button class="btn" data-exp>Export JSON backup</button><button class="btn alt" data-csv>Export CSV</button><label>Restore backup<input type="file" id="imp" accept="application/json"></label></div></div>
    <div class="card"><h3>DepEd policy registry</h3><div id="pol">Loading...</div><p class="lbl">Edit data/policies.json and src/policy.js to update rules. Verify each issuance before relying on it.</p></div>`,
  setup() {
    const st = ui.step || 1;
    return `<div class="hero"><div><small>Welcome</small><h2>Set up your planner</h2><div class="chips"><span>Step ${st} of 3</span><span>${["Learner profile", "School calendar", "Study preferences"][st - 1]}</span></div></div></div>
    <div class="card">${st === 1 ? fProfile() : st === 2 ? fCal() + '<button class="btn alt" data-step="3">Skip for now</button>' : fPrefs() + '<button class="btn alt" data-notif>Turn on reminders</button>'}</div>
    <button class="btn alt no-print" data-skipsetup>Skip setup</button>`;
  }
};
const PRE = { "Three-term": ["Term", ["T1", "T2", "T3"]], "Four-quarter": ["Quarter", ["Q1", "Q2", "Q3", "Q4"]], "Semester": ["Semester", ["S1", "S2"]] };
const opt = (arr, v) => arr.map(x => `<option${x === v ? " selected" : ""}>${h(x)}</option>`).join("");
const fProfile = () => {
  const s = S0(), f = (k, l, r = "") => `<label>${l}<input name="${k}" value="${h(s[k])}"${r}></label>`, sel = (k, l, arr) => `<label>${l}<select name="${k}">${opt(arr, s[k])}</select></label>`;
  return `<form data-set class="fgrid">${f("name", "Student name", " required")}${f("school", "School")}${sel("schoolType", "School type", ["Public", "Private"])}${f("grade", "Grade level")}${f("section", "Section")}${f("strand", "Strand/Track")}
    ${sel("pathway", "Curriculum pathway", Object.keys(PATH))}${f("schoolYear", "School year", " required")}${sel("structure", "Grading period structure", Object.keys(PRE))}${sel("modality", "Learning modality (optional)", ["", "In-person", "Blended", "Distance"])}<button class="btn">${ui.page === "setup" ? "Save and continue" : "Save profile"}</button></form>`;
};
const fCal = () => {
  const s = S0(), c = cal();
  return `<form data-cal><p class="lbl">Enter the dates from your school's official calendar for SY ${h(s.schoolYear)}. Leave blank if unknown; the app never guesses dates. Records are tagged by their date.</p>
    <div class="fgrid">${s.periods.map(p => { const x = c.find(y => y.id === p) || {}; return `<label>${h(s.periodLabel)} ${h(p)} starts<input type="date" name="${p}_s" value="${h(x.start)}"></label><label>${h(s.periodLabel)} ${h(p)} ends<input type="date" name="${p}_e" value="${h(x.end)}"></label>`; }).join("")}</div>
    <div class="fgrid"><button class="btn">${ui.page === "setup" ? "Save and continue" : "Save calendar"}</button><button type="button" class="btn alt" data-retag>Re-tag tasks and exams by date</button></div></form>`;
};
const fPrefs = () => {
  const s = S0();
  return `<form data-prefs class="fgrid"><label>Max study sessions per day<input name="maxPerDay" type="number" min="1" max="8" value="${s.maxPerDay}"></label><label>Preferred study days<input name="studyDays" value="${h(s.studyDays)}"></label>
    <label>Automatic grading period<span><input type="checkbox" name="autoTerm"${s.autoTerm ? " checked" : ""}> Follow the calendar</span></label><button class="btn">${ui.page === "setup" ? "Finish setup" : "Save preferences"}</button></form>`;
};
const NAV = [["dash", "&#127968; Dashboard"], ["calendar", "&#128197; Calendar"], "ACADEMIC", ["subjects", "&#128218; Subjects"], ["tasks", "&#128221; Assignments"], ["comps", "&#127919; Competencies"], ["grades", "&#128202; Grades"], ["exams", "&#129514; Exams"], ["progress", "&#128200; Progress"], ["report", "&#128209; Report Card"], ["archive", "&#128450; Archive"], "TOOLS", ["chores", "&#129529; Cleaning"], ["settings", "&#9881;&#65039; Settings"]];
function render() {
  syncActive();
  const s = S0();
  $("#nav").innerHTML = NAV.map(n => typeof n === "string" ? `<div class="grp">${n}</div>` : `<button data-go="${n[0]}"${ui.page === n[0] ? ' aria-current="page"' : ""}>${n[1]}</button>`).join("");
  $("#me").innerHTML = `<div class="av">${h((s.name || "S")[0].toUpperCase())}</div><div><b>${h(s.name || "Set your name")}</b><small>${h(s.school || "Settings > profile")}</small></div>`;
  $("#ptop").innerHTML = `${s.autoTerm && cal().some(x => x.start) ? tag("Auto") + " " : ""}<label>${h(s.periodLabel)}<select data-active>${s.periods.map(p => `<option${p === s.active ? " selected" : ""}>${p}</option>`).join("")}</select></label>`;
  $("#main").innerHTML = P[ui.page]() + `<datalist id="sl">${db.subjects.map(x => `<option value="${h(x.name)}">`).join("")}</datalist>`;
  if (ui.page === "settings") fetch("data/policies.json").then(r => r.json()).then(p => { $("#pol").innerHTML = p.policies.map(x => `<p><b>${h(x.number)}</b> ${h(x.title)} ${tag(x.status, "warn")}</p>`).join(""); }).catch(() => { $("#pol").textContent = "Serve the app over http to load policies (see README)."; });
}
const clock = () => { const d = new Date(); $("#clock").textContent = d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }); $("#date").textContent = d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" }); };
function exportCsv() {
  const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = [["record", "title", "subject", "type", "due", "status_or_grade", "period", "school_year"], ...db.tasks.map(t => ["task", t.title, t.subject, t.type, t.due, t.status, t.period, t.sy]), ...db.grades.map(g => ["grade", "", g.subject, "estimate", "", tgOf(g) ?? "", g.period, g.sy])];
  dl(rows.map(r => r.map(q).join(",")).join("\n"), "text/csv", "planner-" + today() + ".csv");
}
function dl(text, type, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.go) { ui.page = d.go; document.body.classList.remove("open"); }
  else if ("menu" in d) { document.body.classList.toggle("open"); return; }
  else if (d.edit) { const [n, id] = d.edit.split(":"); editing[n] = id; }
  else if (d.cancel) delete editing[d.cancel];
  else if (d.step) ui.step = +d.step;
  else if ("retag" in d) { if (!confirm("Re-tag this school year's tasks and exams by their dates? Grades and competencies are not changed.")) return; alert(retag() + " records re-tagged."); }
  else if ("skipsetup" in d) { S0().setupDone = true; ui.page = "dash"; }
  else if (d.del) { const [n, id] = d.del.split(":"); db[n] = db[n].filter(r => r.id !== id); }
  else if (d.done) completeTask(db.tasks.find(t => t.id === d.done));
  else if (d.plan) planExam(db.exams.find(x => x.id === d.plan));
  else if ("notif" in d) { if ("Notification" in window) Notification.requestPermission().then(render); return; }
  else if ("prn" in d) { window.print(); return; }
  else if ("exp" in d) { dl(JSON.stringify(db, null, 2), "application/json", "planner-backup-" + today() + ".json"); return; }
  else if ("csv" in d) { exportCsv(); return; }
  else return;
  save(); render();
});
document.addEventListener("submit", e => {
  e.preventDefault(); const t = e.target, f = Object.fromEntries(new FormData(t)), s = S0();
  if (t.dataset.form) {
    const n = t.dataset.form, rec = editing[n] && db[n].find(r => r.id === editing[n]);
    if (n === "chores") f.people = f.people.split(",").map(x => x.trim()).filter(Boolean);
    if (rec) { Object.assign(rec, f); if (rec.sy === s.schoolYear && n === "tasks") rec.period = tagFor(rec.due); if (rec.sy === s.schoolYear && n === "exams") rec.period = tagFor(rec.date); } else db[n].push({ id: uid(), created: today(), ...(["tasks", "comps", "grades", "exams"].includes(n) ? { period: n === "tasks" ? tagFor(f.due) : n === "exams" ? tagFor(f.date) : tagFor(today()), sy: s.schoolYear } : n === "events" ? { sy: s.schoolYear } : {}), ...f });
    delete editing[n];
  } else if ("rc" in t.dataset) db.report[t.dataset.rc] = f;
  else if ("sy" in t.dataset) s.schoolYear = f.sy.trim();
  else if ("set" in t.dataset) {
    const [lab, ps] = PRE[f.structure] || PRE["Three-term"];
    Object.assign(s, f, { periodLabel: lab, periods: ps, schoolYear: f.schoolYear.trim() });
    if (!ps.includes(s.active)) s.active = ps[0];
    syncActive(); if (ui.page === "setup") ui.step = 2;
  } else if ("cal" in t.dataset) {
    const arr = s.periods.map(p => ({ id: p, start: f[p + "_s"] || "", end: f[p + "_e"] || "" }));
    const bad = arr.find(x => !x.start !== !x.end || (x.start && x.start > x.end)), set = arr.filter(x => x.start).sort((x, y) => x.start.localeCompare(y.start)), ov = set.find((x, i) => i && set[i - 1].end >= x.start);
    if (bad || ov) { alert(bad ? `Check ${bad.id}: give both dates, and the start must not be after the end.` : `${ov.id} overlaps the previous period.`); return; }
    db.cal[s.schoolYear] = arr; syncActive(); if (ui.page === "setup") ui.step = 3;
  } else if ("prefs" in t.dataset) {
    Object.assign(s, { maxPerDay: +f.maxPerDay || 2, studyDays: f.studyDays, autoTerm: "autoTerm" in f }); syncActive();
    if (ui.page === "setup") { s.setupDone = true; ui.page = "dash"; }
  }
  save(); render();
});
document.addEventListener("change", e => {
  const t = e.target;
  if ("active" in t.dataset) { S0().active = t.value; S0().autoTerm = false; save(); render(); }
  else if ("cat" in t.dataset) { ui.cat = t.value; render(); }
  else if (t.id === "imp") t.files[0].text().then(x => { try { const j = JSON.parse(x); db = { ...structuredClone(D0), ...j, settings: { ...D0.settings, ...(j.settings || {}) } }; save(); render(); } catch { alert("That file is not a valid backup."); } });
});
$("#qa").addEventListener("keydown", e => {
  if (e.key !== "Enter" || !e.target.value.trim()) return;
  db.tasks.push({ id: uid(), created: today(), title: e.target.value.trim(), subject: "", type: "Personal", due: today(), priority: "Medium", status: "To Do", score: "", repeat: "none", notes: "", period: tagFor(today()), sy: S0().schoolYear });
  e.target.value = ""; ui.page = "tasks"; save(); render();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
if (!S0().setupDone) ui.page = "setup";
clock(); setInterval(clock, 30000); choreAlerts(); render();
