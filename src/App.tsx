import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as db from "./db";
import type { Group, Note, NoteField, Priority, Task } from "./db";
import "./App.css";
import appIcon from "./assets/projectdesk-icon.svg";

type Section = "home" | "daily" | "notes" | "settings";
type TaskFilter = "all" | "today" | "week" | "done";
type DialogRequest = { action: "delete-note" | "delete-task" | "delete-group" | "rename-group"; id: number; label: string };
type IconName = "home" | "calendar" | "notes" | "settings" | "plus" | "check" | "chevron" | "search" | "clock" | "folder" | "trash" | "arrow" | "edit" | "sun" | "pin" | "more";

const isoDay = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const today = () => isoDay(new Date());
const formatDate = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const timeOfDay = (d: Date) => d.getHours() < 5 ? "Доброй ночи" : d.getHours() < 12 ? "Доброе утро" : d.getHours() < 18 ? "Добрый день" : "Добрый вечер";
const sortTasks = (a: Task, b: Task) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || (b.priority ?? 0) - (a.priority ?? 0) || a.id - b.id;
const priorityText: Record<Priority, string> = { 1: "Низкий", 2: "Средний", 3: "Высокий", 4: "Срочно" };
const nextPriority = (p: Priority | null): Priority | null => p === null ? 1 : p === 4 ? null : ((p + 1) as Priority);
const safeSetting = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    notes: <><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1.8-2 2-1.8-1.2-1.6.7-.5 2.1h-3l-.5-2.1-1.6-.7-1.8 1.2-2-2 1.2-1.8-.7-1.6L3 13v-2l2.1-.5.7-1.6-1.2-1.8 2-2 1.8 1.2 1.6-.7L10.5 3h3l.5 2.1 1.6.7 1.8-1.2 2 2-1.2 1.8.7 1.6 2.1.5v2l-2.1.5z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, check: <path d="m5 12 5 5L20 7"/>, chevron: <path d="m9 18 6-6-6-6"/>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    edit: <><path d="m4 16-1 5 5-1L20 8l-4-4zM14 6l4 4"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></>,
    pin: <><path d="M16 3 8 3l1 6-4 4v2h14v-2l-4-4zM12 15v7"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox={name === "settings" ? "-1.5 -1.5 27 27" : "0 0 24 24"} {...common}>{shapes[name]}</svg>;
}

function Disclosure({ open, children }: { open: boolean; children: ReactNode }) {
  return <div className={`disclosure ${open ? "is-open" : ""}`} aria-hidden={!open}>
    <div className="disclosure-inner">{children}</div>
  </div>;
}

function SideBar({ section, go }: { section: Section; go: (section: Section) => void }) {
  const entries: { id: Section; name: string; icon: IconName }[] = [
    { id: "home", name: "Главная", icon: "home" }, { id: "daily", name: "Ежедневник", icon: "calendar" }, { id: "notes", name: "Заметки", icon: "notes" },
  ];
  return <aside className="sidebar">
    <div className="brand"><img className="brand-icon" src={appIcon} alt="" /><span>ProjectDesk</span></div>
    <nav className="nav-list" aria-label="Разделы">{entries.map(e => <button type="button" className={`nav-link ${section === e.id ? "active" : ""}`} key={e.id} onClick={() => go(e.id)}><Icon name={e.icon}/>{e.name}</button>)}</nav>
    <div className="sidebar-spacer"/>
    <button type="button" className={`nav-link settings-link ${section === "settings" ? "active" : ""}`} onClick={() => go("settings")}><Icon name="settings"/>Настройки</button>
  </aside>;
}

function TaskCheck({ task, toggle, compact = false }: { task: Task; toggle: (task: Task) => void; compact?: boolean }) {
  return <label className={`task-check ${compact ? "small" : ""}`}><input aria-label={`Отметить «${task.title}»`} type="checkbox" checked={!!task.doneAt} onChange={() => toggle(task)}/><span className="check-visual"><Icon name="check" size={13}/></span></label>;
}


function CalendarPanel({ tasks, toggle, onCreate }: { tasks: Task[]; toggle: (task: Task) => void; onCreate: (day: string) => void }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(today);
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index - firstWeekday + 1);
  const markers = new Map<string, { total: number; open: number }>();
  for (const task of tasks) {
    if (!task.deadline) continue;
    const marker = markers.get(task.deadline) ?? { total: 0, open: 0 };
    marker.total += 1;
    if (!task.doneAt) marker.open += 1;
    markers.set(task.deadline, marker);
  }
  const selectedTasks = tasks.filter(task => task.deadline === selectedDay)
    .sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || sortTasks(a, b));
  const setMonthOffset = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDay(isoDay(next));
  };
  const resetToToday = () => {
    const d = new Date();
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDay(isoDay(d));
  };
  const dateHeading = new Date(`${selectedDay}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return <section className="glass-panel calendar-panel" aria-label="Календарь дедлайнов">
    <div className="calendar-header"><h2>Календарь</h2><button type="button" className="calendar-today" onClick={resetToToday}>Сегодня</button></div>
    <div className="calendar-month-row">
      <span>{month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</span>
      <div className="calendar-navigation">
        <button type="button" className="calendar-prev" aria-label="Предыдущий месяц" onClick={() => setMonthOffset(-1)}><Icon name="chevron" size={17}/></button>
        <button type="button" aria-label="Следующий месяц" onClick={() => setMonthOffset(1)}><Icon name="chevron" size={17}/></button>
      </div>
    </div>
    <div className="calendar-weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(label => <span key={label}>{label}</span>)}</div>
    <div className="calendar-grid">
      {monthDays.map((day, index) => {
        if (day < 1) return <span key={`blank-${index}`} className="calendar-blank" aria-hidden="true"/>;
        const key = isoDay(new Date(month.getFullYear(), month.getMonth(), day));
        const marker = markers.get(key);
        const isToday = key === today();
        return <button key={key} type="button"
          className={`calendar-day ${selectedDay === key ? "selected" : ""} ${isToday ? "today" : ""}`}
          aria-pressed={selectedDay === key}
          aria-label={`${day} ${month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}${marker ? `, задач: ${marker.total}` : ""}`}
          onClick={() => setSelectedDay(key)}>
          <span>{day}</span>
          {marker && <span className={`calendar-dot ${marker.open ? "" : "completed"}`} aria-hidden="true"/>}
        </button>;
      })}
    </div>
    <div className="calendar-day-details">
      <div className="calendar-detail-heading">
        <strong>{dateHeading}</strong>
        <button type="button" title="Создать задачу на выбранную дату" onClick={() => onCreate(selectedDay)}><Icon name="plus" size={15}/> Задача</button>
      </div>
      <div className="calendar-task-list">
        {selectedTasks.length ? selectedTasks.map(task => <div className={`calendar-task ${task.doneAt ? "completed" : ""}`} key={task.id}>
          <TaskCheck task={task} toggle={toggle} compact/>
          <span>{task.title}</span>
        </div>) : <p className="calendar-empty">На этот день задач нет.</p>}
      </div>
    </div>
  </section>;
}

function App() {
  const [section, setSection] = useState<Section>(() => {
    const saved = safeSetting("pd-section", "home"); return (["home", "daily", "notes", "settings"].includes(saved) ? saved : "home") as Section;
  });
  const [name, setName] = useState(() => safeSetting("pd-name", "Максим"));
  const [showBackground, setShowBackground] = useState(() => safeSetting("pd-background", "on") !== "off");
  const [backgroundBrightness, setBackgroundBrightness] = useState(() => {
    const stored = Number(safeSetting("pd-background-brightness", "77"));
    return Number.isFinite(stored) ? Math.min(110, Math.max(35, Math.round(stored))) : 77;
  });
  const [density, setDensity] = useState<"normal" | "compact">(() => safeSetting("pd-density", "normal") === "compact" ? "compact" : "normal");
  const [clockDay, setClockDay] = useState(today);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [renameGroupValue, setRenameGroupValue] = useState("");
  const [quickText, setQuickText] = useState("");
  const [busyNote, setBusyNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskGroup, setTaskGroup] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const draggingId = useRef<number | null>(null);
  const pendingNotes = useRef(new Map<number, Note>());
  const saveTimer = useRef<number | null>(null);

  const reloadTasks = async () => { const v = await db.loadAll(); setGroups(v.groups); setTasks(v.tasks); };
  const reloadNotes = async () => { setNotes(await db.loadNotes()); };
  const flushNotes = () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const list = [...pendingNotes.current.values()]; pendingNotes.current.clear();
    for (const n of list) void db.saveNote(n).catch(e => setError(String(e)));
  };
  useEffect(() => {
    Promise.all([reloadTasks(), reloadNotes()]).catch(e => setError(String(e))).finally(() => setLoaded(true));
    return () => flushNotes();
  }, []);
  useEffect(() => {
    const refreshDay = window.setInterval(() => setClockDay(previous => {
      const next = today();
      return previous === next ? previous : next;
    }), 60_000);
    return () => window.clearInterval(refreshDay);
  }, []);
  const go = (value: Section) => { flushNotes(); setSection(value); try { localStorage.setItem("pd-section", value); } catch { /* private mode */ } };
  const runTasks = async (fn: () => Promise<unknown>) => {
    try { setError(null); await fn(); await reloadTasks(); } catch (e) { setError(String(e)); }
  };
  const toggle = (t: Task) => void runTasks(() => db.setDone(t.id, !t.doneAt));
  const addTask = async () => {
    const title = taskTitle.trim(); if (!title) return;
    try {
      await db.addTask(title, taskGroup ? Number(taskGroup) : null);
      const data = await db.loadAll(); const id = Math.max(...data.tasks.map(t => t.id));
      if (taskDate) await db.setDeadline(id, taskDate);
      if (taskPriority !== null) await db.setPriority(id, taskPriority);
      await reloadTasks(); setTaskTitle(""); setTaskDate(""); setTaskPriority(null); setShowTaskForm(false);
    } catch (e) { setError(String(e)); }
  };
  const createGroup = async () => { const value = newGroup.trim(); if (!value) return; await runTasks(() => db.addGroup(value)); setNewGroup(""); setShowGroupForm(false); };
  const createNote = async (category = "") => {
    flushNotes();
    try { const recent = notes.filter(n => n.category.trim().toLowerCase() === category.trim().toLowerCase() && n.fields.length).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]; const template = recent ? recent.fields.map(f => ({ name: f.name, value: "" })) : []; const n = await db.createNote(category, template); await reloadNotes(); setSelectedNoteId(n.id); setSelectedCategory(null); setPreview(false); go("notes"); }
    catch (e) { setError(String(e)); }
  };
  const quickSave = async () => {
    const text = quickText.trim(); if (!text || busyNote) return;
    setBusyNote(true);
    try {
      const n = await db.createNote("", []);
      await db.saveNote({ ...n, title: text.split("\n")[0].slice(0, 65), body: text, updatedAt: new Date().toISOString() });
      setQuickText(""); await reloadNotes();
    } catch (e) { setError(String(e)); } finally { setBusyNote(false); }
  };
  const patchNote = (n: Note, patch: Partial<Note>) => {
    const next = { ...n, ...patch, updatedAt: new Date().toISOString() };
    setNotes(list => list.map(item => item.id === n.id ? next : item));
    pendingNotes.current.set(n.id, next);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushNotes, 650);
  };
  const openDialog = (request: DialogRequest) => {
    setDialogError(null);
    setRenameGroupValue(request.action === "rename-group" ? request.label : "");
    setDialog(request);
  };
  const closeDialog = () => { if (!dialogBusy) { setDialog(null); setDialogError(null); } };
  const confirmDialog = async () => {
    const request = dialog;
    if (!request || dialogBusy) return;
    const newName = renameGroupValue.trim();
    if (request.action === "rename-group" && !newName) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      switch (request.action) {
        case "delete-note":
          pendingNotes.current.delete(request.id);
          flushNotes();
          await db.deleteNote(request.id);
          await reloadNotes();
          setSelectedNoteId(null);
          break;
        case "delete-task":
          await db.deleteTask(request.id);
          await reloadTasks();
          break;
        case "delete-group":
          await db.deleteGroup(request.id, "keep-tasks");
          await reloadTasks();
          break;
        case "rename-group":
          if (newName !== request.label) {
            await db.renameGroup(request.id, newName);
            await reloadTasks();
          }
          break;
      }
      setDialog(null);
    } catch (e) {
      const message = String(e);
      setDialogError(message);
      setError(message);
    } finally {
      setDialogBusy(false);
    }
  };
  const currentDay = clockDay;
  const active = tasks.filter(t => !t.doneAt).sort(sortTasks);
  const dueSoon = active.filter(t => t.deadline).slice(0, 6);
  const homeTasks = tasks.filter(t => (!!t.doneAt && t.doneAt.slice(0, 10) === currentDay) || (!t.doneAt && (!t.deadline || t.deadline <= currentDay))).sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || sortTasks(a, b)).slice(0, 7);
  const changeSection = (s: Section) => { go(s); if (s !== "daily") setShowTaskForm(false); };
  const dateLabel = new Date(`${currentDay}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });

  const renderTask = (t: Task, compact = false) => <div key={t.id} className={`task-line ${t.doneAt ? "completed" : ""} ${compact ? "compact" : ""}`} draggable={!compact} onDragStart={() => { draggingId.current = t.id; }} onDragEnd={() => { draggingId.current = null; }}>
    <TaskCheck task={t} toggle={toggle} compact={compact}/>
    {editingTaskId === t.id && !compact ? <input className="inline-edit" autoFocus value={editingTitle} onChange={e => setEditingTitle(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setEditingTaskId(null); if (e.key === "Enter") { void runTasks(() => db.renameTask(t.id, editingTitle.trim() || t.title)); setEditingTaskId(null); } }} onBlur={() => { if (editingTaskId === t.id) { void runTasks(() => db.renameTask(t.id, editingTitle.trim() || t.title)); setEditingTaskId(null); } }}/>
      : <span className="task-title" onDoubleClick={() => { setEditingTitle(t.title); setEditingTaskId(t.id); }} title={compact ? undefined : "Двойной клик для изменения названия"}>{t.title}</span>}
    {!compact && <button type="button" title="Сменить приоритет" className={`priority ${t.priority ? `p${t.priority}` : ""}`} onClick={() => void runTasks(() => db.setPriority(t.id, nextPriority(t.priority)))}>{t.priority ? priorityText[t.priority] : "Приоритет"}</button>}
    {!compact && <input aria-label="Дедлайн" className="deadline-input" type="date" value={t.deadline ?? ""} onChange={e => void runTasks(() => db.setDeadline(t.id, e.target.value || null))}/>}
    {compact && t.deadline && <span className="task-when">{formatDate(t.deadline)}</span>}
    {!compact && <button type="button" className="icon-action task-delete" title="Удалить задачу" onClick={() => openDialog({ action: "delete-task", id: t.id, label: t.title })}><Icon name="trash" size={16}/></button>}
  </div>;

  const home = <div className="page home-page">
    <header className="hero"><div className="hero-text"><h1>{timeOfDay(new Date())}{name.trim() ? `, ${name.trim()}` : ""}</h1><p>{dateLabel}</p></div></header>
    <div className="home-grid">
      <section className="glass-panel today-panel">
        <div className="panel-heading"><h2>Сегодня</h2>{homeTasks.length > 0 && <button type="button" className="subtle-count" onClick={() => changeSection("daily")}>{homeTasks.filter(t => t.doneAt).length} из {homeTasks.length}</button>}</div>
        <div className="today-task-list">
          {homeTasks.length ? homeTasks.map(t => renderTask(t, true)) : <div className="empty-state">На сегодня ничего не запланировано.</div>}
        </div>
        <button type="button" className="text-action" onClick={() => { changeSection("daily"); setShowTaskForm(true); }}><Icon name="plus" size={16}/> Добавить задачу</button>
      </section>
      <section className="glass-panel quick-note">
        <h2>Быстрая заметка</h2>
        <div className="quick-input-wrap">
          <textarea aria-label="Быстрая заметка" placeholder="Записать мысль…" value={quickText} onChange={e => setQuickText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void quickSave(); } }}/>
          <button disabled={!quickText.trim() || busyNote} type="button" title="Сохранить заметку (⌘ Enter)" onClick={() => void quickSave()}><Icon name="arrow" size={18}/></button>
        </div>
      </section>
      <section className="glass-panel upcoming" aria-label="Ближайшие дела">
        <div className="panel-heading"><h2>Ближайшие дела</h2></div>
        <div className="upcoming-task-list">
          {dueSoon.length ? dueSoon.map(t => renderTask(t, true)) : <p className="empty-state">Ближайших дел нет.</p>}
        </div>
      </section>
      <CalendarPanel tasks={tasks} toggle={toggle} onCreate={day => { setTaskDate(day); changeSection("daily"); setShowTaskForm(true); }}/>
    </div>
  </div>;

  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const filtered = tasks.filter(t => taskFilter === "done" ? !!t.doneAt : !t.doneAt && (taskFilter === "all" || (taskFilter === "today" ? !t.deadline || t.deadline <= currentDay : !!t.deadline && t.deadline <= isoDay(weekEnd)))).sort(sortTasks);
  const groupTasks = (id: number | null) => filtered.filter(t => t.groupId === id || (id === null && !groups.some(g => g.id === t.groupId)));
  const daily = <div className="page daily-page"><div className="page-header"><div><div className="eyebrow">{dateLabel}</div><h1>Ежедневник</h1></div><button type="button" className="primary-btn" onClick={() => setShowTaskForm(true)}><Icon name="plus" size={18}/> Задача</button></div>
    <div className={`daily-grid ${dueSoon.length === 0 ? "no-aside" : ""}`}><div className="daily-content">
      <div className="glass-panel daily-board"><div className="tab-bar">{([ ["all", "Все задачи"], ["today", "Сегодня"], ["week", "Неделя"], ["done", "Выполнено"] ] as [TaskFilter, string][]).map(([id, label]) => <button type="button" key={id} className={taskFilter === id ? "selected" : ""} onClick={() => setTaskFilter(id)}>{label}</button>)}</div>
      {showTaskForm && <form className="new-task-panel" onSubmit={e => { e.preventDefault(); void addTask(); }}><input autoFocus placeholder="Что нужно сделать?" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}/><div className="new-task-controls"><select value={taskGroup} onChange={e => setTaskGroup(e.target.value)}><option value="">Без группы</option>{groups.map(g => <option value={g.id} key={g.id}>{g.name}</option>)}</select><input type="date" aria-label="Дата выполнения" value={taskDate} onChange={e => setTaskDate(e.target.value)}/><select value={taskPriority ?? ""} onChange={e => setTaskPriority(e.target.value ? Number(e.target.value) as Priority : null)}><option value="">Без приоритета</option>{([1, 2, 3, 4] as Priority[]).map(p => <option key={p} value={p}>{priorityText[p]}</option>)}</select><button type="button" className="quiet-btn" onClick={() => setShowTaskForm(false)}>Отмена</button><button className="primary-btn" type="submit">Добавить</button></div></form>}
      <div className="board-actions"><span>{filtered.length} {filtered.length === 1 ? "задача" : "задач"}</span><button type="button" onClick={() => setShowGroupForm(x => !x)}><Icon name="plus" size={15}/> Группа</button></div>
      {showGroupForm && <form className="group-add" onSubmit={e => { e.preventDefault(); void createGroup(); }}><input autoFocus placeholder="Название группы" value={newGroup} onChange={e => setNewGroup(e.target.value)}/><button type="submit" className="primary-btn">Создать</button></form>}
      {groups.map(g => <section key={g.id} className="task-group" onDragOver={e => e.preventDefault()} onDrop={() => { if (draggingId.current !== null) void runTasks(() => db.moveTask(draggingId.current!, g.id)); draggingId.current = null; }}><div className="group-heading"><button type="button" className="group-fold" aria-expanded={!expanded[`group-${g.id}`]} onClick={() => setExpanded(x => ({ ...x, [`group-${g.id}`]: !x[`group-${g.id}`] }))}><Icon name="chevron" size={16}/><Icon name="folder" size={17}/><b>{g.name}</b><small>{groupTasks(g.id).length}</small></button><button type="button" className="icon-action" title="Переименовать группу" onClick={() => openDialog({ action: "rename-group", id: g.id, label: g.name })}><Icon name="edit" size={15}/></button><button type="button" className="icon-action" title="Удалить группу (задачи сохранятся)" onClick={() => openDialog({ action: "delete-group", id: g.id, label: g.name })}><Icon name="trash" size={15}/></button></div><Disclosure open={!expanded[`group-${g.id}`]}><div>{groupTasks(g.id).length ? groupTasks(g.id).map(t => renderTask(t)) : <div className="group-empty">Задач нет</div>}</div></Disclosure></section>)}
      <section className="task-group" onDragOver={e => e.preventDefault()} onDrop={() => { if (draggingId.current !== null) void runTasks(() => db.moveTask(draggingId.current!, null)); draggingId.current = null; }}><div className="group-heading"><button type="button" className="group-fold" aria-expanded={!expanded.ungrouped} onClick={() => setExpanded(x => ({ ...x, ungrouped: !x.ungrouped }))}><Icon name="chevron" size={16}/><b>Без группы</b><small>{groupTasks(null).length}</small></button></div><Disclosure open={!expanded.ungrouped}><div>{groupTasks(null).length ? groupTasks(null).map(t => renderTask(t)) : <div className="group-empty">{loaded ? "Задач нет" : "Загрузка…"}</div>}</div></Disclosure></section>
      </div>
    </div>{dueSoon.length > 0 && <aside className="daily-aside"><section className="glass-panel aside-box"><h2>Ближайшие дедлайны</h2>{dueSoon.map(t => <div key={t.id} className="aside-event"><Icon name="calendar" size={17}/><span><b>{t.title}</b><small>{t.deadline ? formatDate(t.deadline) : ""}</small></span></div>)}</section></aside>}</div>
  </div>;

  const cats = [...new Set(notes.map(n => n.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const matchingNotes = notes.filter(n => (!selectedCategory || n.category.trim() === selectedCategory) && (!noteSearch.trim() || [n.title, n.category, n.body, ...n.fields.map(f => `${f.name} ${f.value}`)].join(" ").toLowerCase().includes(noteSearch.toLowerCase()))).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const selectedNote = matchingNotes.find(n => n.id === selectedNoteId) ?? matchingNotes[0] ?? null;
  const notePreview = (value: string) => value.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h4 key={i}>{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i}>{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i}>{line.slice(2)}</h2>;
    if (/^- \[[ x]\] /.test(line)) return <p key={i} className="preview-checkbox"><input type="checkbox" readOnly checked={line[3] === "x"}/>{line.slice(6)}</p>;
    if (line.startsWith("- ")) return <p key={i}>• {line.slice(2)}</p>;
    return <p key={i}>{line || "\u00a0"}</p>;
  });
  const notesPage = <div className="page notes-page"><div className="page-header"><div><h1>Заметки</h1></div><button type="button" className="primary-btn" onClick={() => void createNote(selectedCategory ?? "")}><Icon name="plus" size={18}/> Новая заметка</button></div>
    <div className="notes-workspace"><aside className="glass-panel categories"><h3>Категории</h3><button type="button" className={`category-row ${selectedCategory === null ? "selected" : ""}`} onClick={() => setSelectedCategory(null)}><Icon name="folder" size={17}/>Все заметки <span>{notes.length}</span></button>{cats.map(c => <button type="button" key={c} className={`category-row ${selectedCategory === c ? "selected" : ""}`} onClick={() => { setSelectedCategory(c); setSelectedNoteId(null); }}><Icon name="folder" size={17}/>{c}<span>{notes.filter(n => n.category.trim() === c).length}</span></button>)}</aside>
      <div className="glass-panel note-browser"><div className="search-field"><Icon name="search" size={18}/><input aria-label="Поиск по заметкам" placeholder="Поиск по заметкам…" value={noteSearch} onChange={e => setNoteSearch(e.target.value)}/></div><div className="note-list">{matchingNotes.length ? matchingNotes.map(n => <button key={n.id} type="button" className={`note-card ${selectedNote?.id === n.id ? "selected" : ""}`} onClick={() => { flushNotes(); setSelectedNoteId(n.id); setPreview(false); }}><strong>{n.title.trim() || "Без названия"}</strong><span>{n.body.trim().split("\n").find(Boolean)?.slice(0, 80) || "Пустая заметка"}</span><small>{n.category || "Без категории"} · {new Date(n.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</small></button>) : <div className="empty-state">Заметок не найдено.</div>}</div></div>
      <section className="glass-panel note-editor">{selectedNote ? <><div className="note-editor-top"><><input list="pd-note-categories" aria-label="Категория заметки" placeholder="Категория" value={selectedNote.category} onChange={e => patchNote(selectedNote, { category: e.target.value })}/><datalist id="pd-note-categories">{cats.map(c => <option key={c} value={c}/>)}</datalist></><button type="button" className="icon-action" title="Удалить заметку" onClick={() => openDialog({ action: "delete-note", id: selectedNote.id, label: selectedNote.title.trim() || "Без названия" })}><Icon name="trash" size={17}/></button></div>
        <input className="note-title-input" placeholder="Название заметки" value={selectedNote.title} onChange={e => patchNote(selectedNote, { title: e.target.value })}/><p className="note-timestamp">Изменено {new Date(selectedNote.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · автосохранение</p>
        <div className="editor-toolbar"><button type="button" title="Жирный" onClick={() => patchNote(selectedNote, { body: selectedNote.body + "**жирный текст**" })}><b>B</b></button><button type="button" title="Курсив" onClick={() => patchNote(selectedNote, { body: selectedNote.body + "*курсив*" })}><i>I</i></button><button type="button" title="Заголовок" onClick={() => patchNote(selectedNote, { body: selectedNote.body + "\n## Заголовок\n" })}>H2</button><button type="button" title="Список" onClick={() => patchNote(selectedNote, { body: selectedNote.body + "\n- Пункт списка" })}>≡</button><button type="button" title="Чекбокс" onClick={() => patchNote(selectedNote, { body: selectedNote.body + "\n- [ ] Новая задача" })}>☑</button><span className="toolbar-spacer"/><button type="button" className={preview ? "selected" : ""} onClick={() => setPreview(x => !x)}>{preview ? "Редактор" : "Просмотр"}</button></div>
        {preview ? <div className="markdown-preview">{notePreview(selectedNote.body)}</div> : <textarea className="note-body-input" aria-label="Текст заметки" placeholder="Начни писать…" value={selectedNote.body} onChange={e => patchNote(selectedNote, { body: e.target.value })}/>}
        <details className="custom-fields"><summary>Дополнительные поля <span>{selectedNote.fields.length ? `(${selectedNote.fields.length})` : ""}</span></summary>{selectedNote.fields.map((field, i) => <div className="field-row" key={i}><input placeholder="Поле" value={field.name} onChange={e => patchNote(selectedNote, { fields: selectedNote.fields.map((f, idx) => idx === i ? { ...f, name: e.target.value } : f) })}/><input placeholder="Значение" value={field.value} onChange={e => patchNote(selectedNote, { fields: selectedNote.fields.map((f, idx) => idx === i ? { ...f, value: e.target.value } : f) })}/><button type="button" className="icon-action" onClick={() => patchNote(selectedNote, { fields: selectedNote.fields.filter((_, idx) => idx !== i) })}>×</button></div>)}<button type="button" className="text-action" onClick={() => patchNote(selectedNote, { fields: [...selectedNote.fields, { name: "", value: "" } as NoteField] })}><Icon name="plus" size={15}/> Добавить поле</button></details>
        </> : <div className="note-empty">Выбери заметку слева или создай новую.</div>}</section>
    </div>
  </div>;

  const settings = <div className="page settings-page">
    <div className="page-header"><h1>Настройки</h1></div>
    <section className="glass-panel settings-panel">
      <label className="setting-item">
        <span><b>Твоё имя</b><small>Показывается на главной странице.</small></span>
        <input type="text" placeholder="Имя" value={name} onChange={e => { setName(e.target.value); try { localStorage.setItem("pd-name", e.target.value); } catch { /* no storage */ } }}/>
      </label>
      <label className="setting-item">
        <span><b>Фоновое изображение</b><small>Показывать фотографию на фоне.</small></span>
        <input type="checkbox" role="switch" checked={showBackground} onChange={e => { setShowBackground(e.target.checked); try { localStorage.setItem("pd-background", e.target.checked ? "on" : "off"); } catch { /* no storage */ } }}/>
      </label>
      <label className="setting-item">
        <span><b>Яркость фона</b><small>Делает фотографию светлее или темнее.</small></span>
        <div className="brightness-control"><input type="range" aria-label="Яркость фона" min={35} max={110} step={1} value={backgroundBrightness} disabled={!showBackground} onChange={e => {
          const value = Number(e.target.value);
          setBackgroundBrightness(value);
          try { localStorage.setItem("pd-background-brightness", String(value)); } catch { /* no storage */ }
        }}/><output>{backgroundBrightness}%</output></div>
      </label>
      <div className="setting-item">
        <span><b>Плотность интерфейса</b><small>Размеры отступов и строк в списках.</small></span>
        <div className="density-selector" role="group" aria-label="Плотность интерфейса">
          {(["normal", "compact"] as const).map(value => <button key={value} type="button" aria-pressed={density === value} className={density === value ? "selected" : ""} onClick={() => {
            setDensity(value);
            try { localStorage.setItem("pd-density", value); } catch { /* no storage */ }
          }}>{value === "normal" ? "Обычная" : "Компактная"}</button>)}
        </div>
      </div>
    </section>
  </div>;

  return <div className={`app-shell ${showBackground ? "photo-background" : "plain-background"} ${density === "compact" ? "density-compact" : ""}`}
    style={{ "--wallpaper-brightness": (backgroundBrightness / 100).toFixed(2) } as import("react").CSSProperties}>
    <SideBar section={section} go={changeSection}/>
    <main className="main-area">
      {error && <div className="error-banner"><span>{error}</span><button type="button" onClick={() => setError(null)}>×</button></div>}
      {section === "home" ? home : section === "daily" ? daily : section === "notes" ? notesPage : settings}
    </main>
    {dialog && <div className="app-dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeDialog(); }}>
      <form className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); closeDialog(); } }} onSubmit={e => { e.preventDefault(); void confirmDialog(); }}>
        <h2 id="app-dialog-title">{dialog.action === "rename-group" ? "Переименовать группу" : dialog.action === "delete-note" ? "Удалить заметку?" : dialog.action === "delete-task" ? "Удалить задачу?" : "Удалить группу?"}</h2>
        {dialog.action === "rename-group"
          ? <label className="app-dialog-label">Название группы<input autoFocus value={renameGroupValue} onChange={e => setRenameGroupValue(e.target.value)} maxLength={120}/></label>
          : <p className="app-dialog-message">«{dialog.label}»{dialog.action === "delete-group" ? " — задачи останутся, но группа будет удалена." : " будет удалена без возможности восстановления."}</p>}
        {dialogError && <p className="app-dialog-error" role="alert">{dialogError}</p>}
        <div className="app-dialog-actions">
          <button type="button" className="quiet-btn" onClick={closeDialog} autoFocus={dialog.action !== "rename-group"} disabled={dialogBusy}>Отмена</button>
          <button type="submit" className={dialog.action === "rename-group" ? "primary-btn" : "dialog-danger"} disabled={dialogBusy || (dialog.action === "rename-group" && !renameGroupValue.trim())}>{dialogBusy ? "Сохраняем…" : dialog.action === "rename-group" ? "Сохранить" : "Удалить"}</button>
        </div>
      </form>
    </div>}
  </div>;
}

export default App;
