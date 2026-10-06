// DepEd Study Planner - local-first, no build step. Data stays in this browser (localStorage).
const KEY = "deped-planner-v1";
const db = Object.assign({ tasks: [], grades: [], chores: [], comps: [], exams: [], events: [], settings: { schoolYear: "2026-2027" } },
  (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })());
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Repetition: advance a date by the repeat rule
function nextDate(d, rule) {
  const t = new Date(d + "T00:00:00");
  if (rule === "daily") t.setDate(t.getDate() + 1);
  else if (rule === "weekdays") { do t.setDate(t.getDate() + 1); while ([0, 6].includes(t.getDay())); }
  else if (rule === "weekly") t.setDate(t.getDate() + 7);
  else if (rule === "monthly") t.setMonth(t.getMonth() + 1);
  return t.toISOString().slice(0, 10);
}
function completeTask(t) {
  t.status = "Completed";
  if (t.repeat && t.repeat !== "none") {
    db.tasks.push({ ...t, id: uid(), status: "To Do", due: nextDate(t.due, t.repeat), created: today() });
  }
}
const status = t => t.status !== "Completed" && t.due < today() ? "Overdue" : t.status;

// Cleaners reminder: rotating duty roster
function dutyFor(c, date) {
  if (!c.people.length) return "";
  const days = Math.floor((new Date(date) - new Date(c.start)) / 864e5);
  const step = c.every === "weekly" ? Math.floor(days / 7) : days;
  return c.people[((step % c.people.length) + c.people.length) % c.people.length];
}
function choreAlerts() {
  db.chores.forEach(c => {
    if (c.lastAlert !== today() && "Notification" in window && Notification.permission === "granted") {
      c.lastAlert = today();
      new Notification(`Cleaning today: ${c.area} - ${dutyFor(c, today())}`);
    }
  });
  save();
}


function planExam(x) {
  const steps = [...x.topics.map(t => "Review: " + t), "Practice questions", "Final review"];
  const cap = +db.settings.maxPerDay || 2;
  const load = d => db.tasks.filter(t => t.due === d && t.kind === "Academic" && t.status !== "Completed").length;
  const back = d => { const t = new Date(d + "T00:00:00"); t.setDate(t.getDate() - 1); return t.toISOString().slice(0, 10); };
  let d = back(x.date);
  for (let i = steps.length - 1; i >= 0; i--) {
    while (load(d) >= cap && d > today()) d = back(d);
    if (d < today()) d = today();
    db.tasks.push({ id: uid(), status: "To Do", created: today(), title: steps[i] + " (" + x.name + ")", kind: "Academic", subject: x.subject, due: d, repeat: "none", exam: x.id, term: x.term || "" });
  }
}

const views = {
  Tasks() {
    const open = db.tasks.filter(t => t.status !== "Completed").sort((a, b) => a.due.localeCompare(b.due));
    const done = db.tasks.filter(t => t.status === "Completed").slice(-5);
    const card = t => {
      const s = status(t), cls = s === "Completed" ? "done" : s === "Overdue" ? "overdue" : "";
      return `<div class="card ${cls}"><div class="row"><strong>${esc(t.title)}</strong>
        <span class="tag">${esc(t.kind)}${t.subject ? " - " + esc(t.subject) : ""}</span>
        ${t.repeat !== "none" ? `<span class="tag">Repeats ${t.repeat}</span>` : ""}</div>
        <div class="${s === "Overdue" ? "bad" : ""}">Due ${t.due} (${s})</div>
        <div class="row">${s !== "Completed" ? `<button class="btn" data-done="${t.id}">Mark completed</button>` : ""}
        <button class="btn alt" data-del="${t.id}">Delete</button></div></div>`;
    };
    return `<h2>Tasks</h2>
    <form id="tf" class="row">
      <input name="title" placeholder="Task title" required aria-label="Task title">
      <select name="kind" aria-label="Type"><option>Academic</option><option>Personal</option><option>Household</option><option>Health</option><option>Other</option></select>
      <input name="subject" placeholder="Subject (academic)" aria-label="Subject">
      <input name="due" type="date" value="${today()}" required aria-label="Due date">
      <select name="repeat" aria-label="Repeat"><option value="none">No repeat</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
      <button class="btn">Add task</button></form>
    ${open.length ? open.map(card).join("") : '<p class="empty">No open tasks. Add one above.</p>'}
    ${done.length ? "<h3>Recently completed</h3>" + done.map(card).join("") : ""}`;
  },
  Chores() {
    return `<h2>Cleaning reminders</h2>
    <form id="cf" class="row">
      <input name="area" placeholder="Area (e.g. Kitchen)" required aria-label="Area">
      <input name="people" placeholder="Names, comma-separated" required aria-label="People in rotation">
      <select name="every" aria-label="Rotate"><option value="daily">Rotate daily</option><option value="weekly">Rotate weekly</option></select>
      <input name="start" type="date" value="${today()}" aria-label="Rotation start">
      <button class="btn">Add roster</button></form>
    <button class="btn alt" id="notif">Enable reminders</button>
    ${db.chores.length ? db.chores.map(c => `<div class="card chore"><strong>${esc(c.area)}</strong>
      <div>Today: <strong>${esc(dutyFor(c, today()))}</strong></div>
      <div>Tomorrow: ${esc(dutyFor(c, nextDate(today(), "daily")))}</div>
      <div class="label">Rotates ${c.every}: ${c.people.map(esc).join(" > ")}</div>
      <button class="btn alt" data-delc="${c.id}">Delete</button></div>`).join("") : '<p class="empty">No rosters yet.</p>'}
    <p class="label">Reminders fire while the app is open.</p>`;
  },
  Grades() {
    return `<h2>Grades</h2>
    <p class="card warn">Grading rules are not verified. Entries below are student estimates, not official grades.</p>
    <form id="gf" class="row">
      <input name="subject" placeholder="Subject" required aria-label="Subject">
      <input name="name" placeholder="Assessment" required aria-label="Assessment">
      <input name="score" type="number" step="any" placeholder="Score" required aria-label="Score">
      <input name="total" type="number" step="any" min="0.01" placeholder="Total" required aria-label="Total">
      <button class="btn">Add record</button></form>
    ${db.grades.length ? db.grades.map(g => `<div class="card"><strong>${esc(g.subject)}</strong>: ${esc(g.name)}
      ${g.score}/${g.total} = ${(g.score / g.total * 100).toFixed(1)}% <span class="tag">Student estimate</span> ${g.term ? `<span class="tag">${g.term}</span>` : ""}
      <button class="btn alt" data-delg="${g.id}">Delete</button></div>`).join("") : '<p class="empty">No assessments recorded.</p>'}`;
  },
  Competencies() {
    const st = ["Not started","In progress","Needs further review","Demonstrated understanding","Not yet assessed"];
    const assessed = db.comps.filter(c => c.status !== "Not yet assessed").length;
    const shown = db.comps.filter(c => c.status === "Demonstrated understanding").length;
    return `<h2>Competencies</h2>
    <p class="card">Assessed: <strong>${assessed}</strong> of ${db.comps.length}. Demonstrated understanding: <strong>${shown}</strong>.
    <span class="label">Statuses are your own labels, not official DepEd ratings. Enter competency statements exactly as in the official curriculum guide.</span></p>
    <form id="kf" class="row">
      <input name="code" placeholder="Code" aria-label="Competency code">
      <input name="subject" placeholder="Subject" required aria-label="Subject">
      <input name="text" placeholder="Competency statement" required aria-label="Competency statement">
      <input name="evidence" placeholder="Evidence or note" aria-label="Evidence">
      <button class="btn">Add competency</button></form>
    ${db.comps.length ? db.comps.map(c => `<div class="card"><strong>${esc(c.code || "No code")}</strong> - ${esc(c.subject)}
      <div>${esc(c.text)}</div>${c.evidence ? `<div class="label">Evidence: ${esc(c.evidence)}</div>` : ""}
      <div class="row"><select data-cstat="${c.id}" aria-label="Status">${st.map(x => `<option${x === c.status ? " selected" : ""}>${x}</option>`).join("")}</select>
      <button class="btn alt" data-delk="${c.id}">Delete</button></div></div>`).join("") : '<p class="empty">No competencies yet. Add the first one above.</p>'}`;
  },
  Exams() {
    return `<h2>Exam planner</h2>
    <form id="sf" class="row"><label for="mp">Max academic sessions per day</label>
      <input id="mp" name="maxPerDay" type="number" min="1" max="8" value="${db.settings.maxPerDay || 2}">
      <button class="btn alt">Save limit</button></form>
    <form id="xf" class="row">
      <input name="name" placeholder="Exam name" required aria-label="Exam name">
      <input name="subject" placeholder="Subject" required aria-label="Subject">
      <input name="date" type="date" required aria-label="Exam date">
      <input name="coverage" placeholder="Topics, comma-separated" required aria-label="Topics covered">
      <button class="btn">Add exam</button></form>
    ${db.exams.length ? db.exams.sort((a, b) => a.date.localeCompare(b.date)).map(x => `<div class="card"><strong>${esc(x.name)}</strong> - ${esc(x.subject)}
      <div>Exam date: ${x.date}</div><div class="label">Topics: ${x.topics.map(esc).join(", ")}</div>
      <div class="row"><button class="btn" data-plan="${x.id}">Create study sessions</button>
      <button class="btn alt" data-delx="${x.id}">Delete</button></div></div>`).join("") : '<p class="empty">No exams yet.</p>'}
    <p class="label">Sessions are added to Tasks, one topic per day, then practice and final review. Sessions respect your daily limit; dates before today are moved to today. Review is not proof of learning.</p>`;
  },
  Calendar() {
    const days = [], end = new Date(); end.setDate(end.getDate() + 13);
    for (let d = today(); d <= end.toISOString().slice(0, 10); d = nextDate(d, "daily")) days.push(d);
    const items = d => [
      ...db.tasks.filter(t => t.due === d && t.status !== "Completed").map(t => ["Personal event", "Due: " + t.title]),
      ...db.exams.filter(x => x.date === d).map(x => ["Personal event", "Exam: " + x.name + " (" + x.subject + ")"]),
      ...db.chores.map(c => ["Personal event", "Cleaning: " + c.area + " - " + dutyFor(c, d)]),
      ...db.events.filter(v => v.date === d).map(v => [v.source, v.title, v.id])];
    return `<h2>Calendar (next 14 days)</h2>
    <form id="ef" class="row">
      <input name="title" placeholder="Event" required aria-label="Event">
      <input name="date" type="date" value="${today()}" required aria-label="Date">
      <select name="source" aria-label="Source"><option>Personal event</option><option>School announcement</option><option>Unverified</option></select>
      <button class="btn">Add event</button></form>
      <p class="label">Official DepEd labels appear only for events verified against an issuance. Class suspensions need an official announcement.</p>
    ${days.map(d => { const it = items(d); return it.length ? `<div class="card"><strong>${d}</strong>${it.map(i => `<div><span class="tag">${i[0]}</span> ${esc(i[1])}${i[2] ? ` <button class="btn alt" data-delev="${i[2]}">Delete</button>` : ""}</div>`).join("")}</div>` : ""; }).join("") || '<p class="empty">Nothing scheduled in the next 14 days.</p>'}`;
  },
  Reports() {
    const set = db.settings, allG = db.grades, allC = db.comps, term = set.activeTerm || "";
    const g = allG.filter(x => !term || x.term === term), c = allC.filter(x => !term || x.term === term);
    const by = {}; g.forEach(x => (by[x.subject] = by[x.subject] || []).push(x));
    return `<h2>Progress report</h2>
    <p class="label no-print">The report covers the active grading period chosen in the header.</p>
    <form id="pf" class="row no-print">
      ${["name:Student name", "school:School", "grade:Grade level", "section:Section"].map(k => { const [a, b] = k.split(":"); return `<input name="${a}" placeholder="${b}" value="${esc(set[a] || "")}" aria-label="${b}">`; }).join("")}
      <button class="btn">Save details</button></form>
    <div class="card" id="report"><h3>Student-generated academic progress report</h3>
      <p>${esc(set.name || "Student name not set")} | ${esc(set.school || "School not set")} | Grade ${esc(set.grade || "?")} - ${esc(set.section || "?")}<br>
      SY ${esc(set.schoolYear)} | ${esc(term || "Grading period not set")} | Generated ${today()}</p>
      <h4>Assessments (student estimates)</h4>
      ${Object.keys(by).length ? Object.entries(by).map(([sub, a]) => `<p><strong>${esc(sub)}</strong>: ${a.map(x => `${esc(x.name)} ${(x.score / x.total * 100).toFixed(1)}%`).join("; ")}</p>`).join("") : "<p>No assessments recorded.</p>"}
      <h4>Competencies</h4>
      <p>Assessed: ${c.filter(x => x.status !== "Not yet assessed").length}. Demonstrated understanding: ${c.filter(x => x.status === "Demonstrated understanding").length}.
      Needs further review: ${c.filter(x => x.status === "Needs further review").length}. Not yet assessed: ${c.filter(x => x.status === "Not yet assessed").length}.</p>
      <p class="label">Policy configuration: grading rules not verified; no official grade computed. This is not an official DepEd report card or school-issued record.</p></div>
    <div class="card"><h3>Year-end summary (student-generated)</h3>
      <p>SY ${esc(set.schoolYear)}. Tasks completed: ${db.tasks.filter(x => x.status === "Completed").length}.</p>
      ${[...TERMS, ""].map(t => { const gg = allG.filter(x => (x.term || "") === t), cc = allC.filter(x => (x.term || "") === t);
        return gg.length || cc.length ? `<p><strong>${t || "No term assigned"}</strong>: ${gg.length} assessments; competencies demonstrated ${cc.filter(x => x.status === "Demonstrated understanding").length} of ${cc.length}</p>` : ""; }).join("") || "<p>No records yet.</p>"}
      <p class="label">Final grades are not computed. Term grades are never averaged unless the applicable verified policy requires it. Not an official school record.</p></div>
    <div class="row no-print"><button class="btn" id="prn">Print or save as PDF</button>
    <button class="btn alt" id="csv">Export tasks and grades (CSV)</button></div>`;
  },
  Analytics() {
    const t = db.tasks, done = t.filter(x => x.status === "Completed").length;
    const over = t.filter(x => status(x) === "Overdue").length;
    const days = []; for (let d = today(), k = 0; k < 7; k++, d = nextDate(d, "daily")) days.push([d, t.filter(x => x.due === d && x.status !== "Completed").length]);
    const by = {}; db.grades.forEach(g => (by[g.subject] = by[g.subject] || []).push(g.score / g.total * 100));
    return `<h2>Analytics</h2>
    <div class="card">Tasks completed: <strong>${done}</strong> of ${t.length}${t.length ? " (" + Math.round(done / t.length * 100) + "%)" : ""}.
    Overdue: <strong class="${over ? "bad" : ""}">${over}</strong></div>
    <h3>Workload, next 7 days</h3>
    ${days.map(([d, n]) => `<div class="row"><span style="width:90px">${d.slice(5)}</span><div style="background:var(--teal);height:14px;width:${Math.min(n, 10) * 24}px" role="img" aria-label="${n} tasks"></div><span>${n} ${n === 1 ? "task" : "tasks"}</span></div>`).join("")}
    <h3>Assessment averages (student estimates)</h3>
    ${Object.keys(by).length ? Object.entries(by).map(([k, v]) => `<div class="card"><strong>${esc(k)}</strong>: ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}% over ${v.length} ${v.length === 1 ? "record" : "records"}</div>`).join("") : '<p class="empty">Record assessments in Grades to see averages.</p>'}
    <p class="label">No final grades are predicted and students are not ranked.</p>`;
  },
  Policies() {
    return `<h2>DepEd policy registry</h2><div id="pol">Loading...</div>
    <p class="label">Edit data/policies.json to update rules. Past records keep their original policy version.</p>`;
  },
  Backup() {
    return `<h2>Backup and restore</h2><div class="row">
      <button class="btn" id="exp">Export JSON backup</button>
      <input type="file" id="imp" accept="application/json" aria-label="Restore backup"></div>`;
  }
};

function exportCsv() {
  const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = [["record","title","subject","type_or_score","date","status_or_total"],
    ...db.tasks.map(t => ["task", t.title, t.subject, t.kind, t.due, t.status]),
    ...db.grades.map(g => ["grade_estimate", g.name, g.subject, g.score, "", g.total])];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = "planner-export-" + today() + ".csv"; a.click();
}

let TERMS = ["T1", "T2", "T3"];
fetch("data/policies.json").then(r => r.json()).then(p => { const t = p.terms[db.settings.schoolYear]; if (t) { TERMS = t.map(x => x.id); render(); } }).catch(() => {});
let current = "Tasks";
function render() {
  document.getElementById("tabs").innerHTML = Object.keys(views).map(v => `<button role="tab" aria-selected="${v === current}" data-tab="${v}">${v}</button>`).join("");
  document.getElementById("view").innerHTML = views[current]();
  document.getElementById("term").innerHTML = `SY ${esc(db.settings.schoolYear)} <select data-term="1" aria-label="Active grading period"><option value="">No term</option>${TERMS.map(t => `<option${t === db.settings.activeTerm ? " selected" : ""}>${t}</option>`).join("")}</select>`;
  if (current === "Policies") fetch("data/policies.json").then(r => r.json()).then(p => {
    document.getElementById("pol").innerHTML = p.policies.map(x => `<div class="card"><strong>${esc(x.number)}</strong> ${esc(x.title)}
      <div class="label">${esc(x.category)} - <span class="warn">${esc(x.status)}</span></div></div>`).join("");
  }).catch(() => document.getElementById("pol").textContent = "Run this app from a web server (see README) to load policies.");
}
document.addEventListener("click", e => {
  const d = e.target.dataset || {};
  if (d.tab) current = d.tab;
  else if (d.done) completeTask(db.tasks.find(t => t.id === d.done));
  else if (d.del) db.tasks = db.tasks.filter(t => t.id !== d.del);
  else if (d.delc) db.chores = db.chores.filter(c => c.id !== d.delc);
  else if (d.plan) planExam(db.exams.find(x => x.id === d.plan));
  else if (d.delx) db.exams = db.exams.filter(x => x.id !== d.delx);
  else if (d.delk) db.comps = db.comps.filter(c => c.id !== d.delk);
  else if (d.delev) db.events = db.events.filter(v => v.id !== d.delev);
  else if (e.target.id === "prn") { window.print(); return; }
  else if (e.target.id === "csv") { exportCsv(); return; }
  else if (d.delg) db.grades = db.grades.filter(g => g.id !== d.delg);
  else if (e.target.id === "notif") { Notification.requestPermission(); return; }
  else if (e.target.id === "exp") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
    a.download = "planner-backup-" + today() + ".json"; a.click(); return;
  } else return;
  save(); render();
});
document.addEventListener("submit", e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  if (e.target.id === "tf") db.tasks.push({ id: uid(), status: "To Do", created: today(), ...f });
  if (e.target.id === "cf") db.chores.push({ id: uid(), ...f, people: f.people.split(",").map(s => s.trim()).filter(Boolean) });
  if (e.target.id === "gf") db.grades.push({ id: uid(), ...f, score: +f.score, total: +f.total, source: "student", verified: false });
  if (["tf", "gf", "kf", "xf"].includes(e.target.id)) f.term = db.settings.activeTerm || "";
  if (e.target.id === "sf") db.settings.maxPerDay = +f.maxPerDay;
  if (e.target.id === "ef") db.events.push({ id: uid(), ...f });
  if (e.target.id === "pf") Object.assign(db.settings, f);
  if (e.target.id === "kf") db.comps.push({ id: uid(), status: "Not yet assessed", source: "student", ...f });
  if (e.target.id === "xf") db.exams.push({ id: uid(), name: f.name, subject: f.subject, date: f.date, topics: f.coverage.split(",").map(s => s.trim()).filter(Boolean) });
  save(); render();
});
document.addEventListener("change", e => {
  if (e.target.dataset.term) { db.settings.activeTerm = e.target.value; save(); render(); return; }
  if (e.target.dataset.cstat) { db.comps.find(c => c.id === e.target.dataset.cstat).status = e.target.value; save(); render(); return; }
  if (e.target.id !== "imp") return;
  e.target.files[0].text().then(t => { try { Object.assign(db, JSON.parse(t)); save(); render(); } catch { alert("That file is not a valid backup."); } });
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
choreAlerts(); render();
