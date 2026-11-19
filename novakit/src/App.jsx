














import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import "./App.css";
import Auth from "./Auth";
import QRTools from "./QRTools";

const readData = (key, fallback = []) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const money = value =>
  "₹" + Number(value || 0).toLocaleString("en-IN");

function App() {
  useEffect(() => {
    localStorage.removeItem("novaMessages");
  }, []);

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncUid, setSyncUid] = useState(null);
  const [syncReady, setSyncReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Cloud sync waiting");

  // Firebase keeps the signed-in session and restores it after refresh.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      setAuthLoading(false);
      if (user?.displayName) setProfileName(user.displayName);
      else if (user?.email) setProfileName(user.email.split("@")[0]);
    });

    return unsubscribe;
  }, []);

  const [active, setActive] = useState("Dashboard");

  const [notes, setNotes] = useState(() => readData("novaNotes"));
  const [tasks, setTasks] = useState(() => readData("novaTasks"));
  const [transactions, setTransactions] = useState(() => readData("novaTransactions"));
  const [habits, setHabits] = useState(() => readData("novaHabits"));
  const [sessions, setSessions] = useState(() => readData("novaSessions"));

  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [search, setSearch] = useState("");

  const [taskText, setTaskText] = useState("");
  const [taskDate, setTaskDate] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("expense");

  const [habitText, setHabitText] = useState("");

  const [controlCommand, setControlCommand] = useState("");
  const [controlFeedback, setControlFeedback] = useState("Try: add task: Revise maths");

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const [profileName, setProfileName] = useState(
    localStorage.getItem("novaProfileName") || "Nova User"
  );

  // Load the signed-in user's cloud workspace. First login migrates this browser's local data.
  useEffect(() => {
    let cancelled = false;
    const loadWorkspace = async () => {
      if (!authUser?.uid) {
        setSyncUid(null);
        setSyncReady(false);
        setSyncStatus("Cloud sync waiting");
        return;
      }

      setSyncReady(false);
      setSyncUid(authUser.uid);
      setSyncStatus("Loading cloud data…");
      const workspaceRef = doc(db, "users", authUser.uid, "workspace", "main");

      try {
        const snapshot = await getDoc(workspaceRef);
        if (cancelled) return;

        if (snapshot.exists()) {
          const data = snapshot.data();
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
          setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
          setHabits(Array.isArray(data.habits) ? data.habits : []);
          setSessions(Array.isArray(data.sessions) ? data.sessions : []);
          if (typeof data.profileName === "string") setProfileName(data.profileName);
          setSyncStatus("Cloud data loaded");
        } else {
          const localData = {
            notes: readData("novaNotes"),
            tasks: readData("novaTasks"),
            transactions: readData("novaTransactions"),
            habits: readData("novaHabits"),
            sessions: readData("novaSessions"),
            profileName: localStorage.getItem("novaProfileName") || authUser.displayName || "Nova User"
          };
          setNotes(localData.notes);
          setTasks(localData.tasks);
          setTransactions(localData.transactions);
          setHabits(localData.habits);
          setSessions(localData.sessions);
          setProfileName(localData.profileName);
          await setDoc(workspaceRef, { ...localData, updatedAt: serverTimestamp() });
          if (cancelled) return;
          setSyncStatus("Local data backed up to cloud");
        }
        setSyncReady(true);
      } catch (error) {
        console.error("NOVAKIT cloud load failed:", error);
        if (!cancelled) setSyncStatus("Cloud sync error — check Firestore rules");
      }
    };

    loadWorkspace();
    return () => { cancelled = true; };
  }, [authUser?.uid]);

  // Debounced cloud save; the UID guard prevents data crossing between accounts.
  useEffect(() => {
    if (!authUser?.uid || !syncReady || syncUid !== authUser.uid) return;
    const timer = setTimeout(async () => {
      try {
        setSyncStatus("Saving to cloud…");
        await setDoc(doc(db, "users", authUser.uid, "workspace", "main"), {
          notes, tasks, transactions, habits, sessions, profileName,
          updatedAt: serverTimestamp()
        });
        setSyncStatus("All changes synced");
      } catch (error) {
        console.error("NOVAKIT cloud save failed:", error);
        setSyncStatus("Sync failed — check connection/rules");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [authUser?.uid, syncUid, syncReady, notes, tasks, transactions, habits, sessions, profileName]);

  // Save application data
  useEffect(() => {
    localStorage.setItem("novaNotes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("novaTasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("novaTransactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("novaHabits", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem("novaSessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("novaProfileName", profileName);
  }, [profileName]);

  // Focus timer
  useEffect(() => {
    if (!timerRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft(current => {
        if (current <= 1) {
          clearInterval(timer);
          setTimerRunning(false);
          setSessions(old => [
            ...old,
            { id: Date.now(), minutes: focusMinutes, date: new Date().toLocaleDateString("en-IN") }
          ]);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerRunning, focusMinutes]);

  const navigation = [
    ["Dashboard", "⌂"],
    ["Analytics", "▥"],
    ["My Notes", "▤"],
    ["Planner", "▦"],
    ["Expenses", "₹"],
    ["Study Mode", "◉"],
    ["Habit Tracker", "◎"],
    ["QR Tools", "▦"],
    ["Settings", "⚙"]
  ];

  // Notes
  function saveNote(e) {
    e.preventDefault();

    if (!noteTitle.trim() || !noteText.trim()) return;

    if (editingNote) {
      setNotes(old => old.map(note =>
        note.id === editingNote
          ? { ...note, title: noteTitle.trim(), text: noteText.trim() }
          : note
      ));
    } else {
      setNotes(old => [
        {
          id: Date.now(),
          title: noteTitle.trim(),
          text: noteText.trim(),
          date: new Date().toLocaleDateString("en-IN")
        },
        ...old
      ]);
    }

    setNoteTitle("");
    setNoteText("");
    setEditingNote(null);
  }

  function editNote(note) {
    setEditingNote(note.id);
    setNoteTitle(note.title);
    setNoteText(note.text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteNote(id) {
    setNotes(old => old.filter(note => note.id !== id));
  }

  // Planner
  function addTask(e) {
    e.preventDefault();
    if (!taskText.trim()) return;

    setTasks(old => [
      ...old,
      {
        id: Date.now(),
        text: taskText.trim(),
        date: taskDate,
        done: false
      }
    ]);

    setTaskText("");
    setTaskDate("");
  }

  function toggleTask(id) {
    setTasks(old => old.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    ));
  }

  function deleteTask(id) {
    setTasks(old => old.filter(task => task.id !== id));
  }

  // Expenses
  function addTransaction(e) {
    e.preventDefault();

    const value = Number(amount);

    if (!description.trim() || !Number.isFinite(value) || value <= 0) {
      return;
    }

    setTransactions(old => [
      {
        id: Date.now(),
        description: description.trim(),
        amount: value,
        type,
        date: new Date().toLocaleDateString("en-IN")
      },
      ...old
    ]);

    setAmount("");
    setDescription("");
  }

  function deleteTransaction(id) {
    setTransactions(old => old.filter(item => item.id !== id));
  }

  const totalIncome = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpense = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const balance = totalIncome - totalExpense;

  // Habits
  function addHabit(e) {
    e.preventDefault();
    if (!habitText.trim()) return;

    setHabits(old => [
      ...old,
      { id: Date.now(), name: habitText.trim(), completedDates: [] }
    ]);

    setHabitText("");
  }

  const today = new Date().toLocaleDateString("en-CA");

  function toggleHabit(id) {
    setHabits(old => old.map(habit => {
      if (habit.id !== id) return habit;

      const completed = habit.completedDates.includes(today);

      return {
        ...habit,
        completedDates: completed
          ? habit.completedDates.filter(date => date !== today)
          : [...habit.completedDates, today]
      };
    }));
  }

  function deleteHabit(id) {
    setHabits(old => old.filter(habit => habit.id !== id));
  }

  // Study timer
  function changeFocusTime(value) {
    const minutes = Number(value);
    setFocusMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setTimerRunning(false);
  }

  function resetTimer() {
    setTimerRunning(false);
    setSecondsLeft(focusMinutes * 60);
  }

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };


  // Quick Workspace Commands: local commands that control NOVAKIT without using API quota.
  function runDashboardCommand(e) {
    e.preventDefault();
    const raw = controlCommand.trim();
    if (!raw) return;

    const command = raw.toLowerCase();

    const addMatch = raw.match(/^(?:add|create)\s+task\s*:\s*(.+)$/i);
    if (addMatch) {
      const taskName = addMatch[1].trim();
      if (!taskName) {
        setControlFeedback("Please enter a task name.");
        return;
      }
      setTasks(old => [
        ...old,
        { id: Date.now(), text: taskName, date: "", done: false }
      ]);
      setControlFeedback(`Task added: "${taskName}"`);
      setControlCommand("");
      return;
    }

    const noteMatch = raw.match(/^(?:add|create)\s+note\s*:\s*(.+?)\s*\|\s*(.+)$/i);
    if (noteMatch) {
      const title = noteMatch[1].trim();
      const text = noteMatch[2].trim();
      if (!title || !text) {
        setControlFeedback("Use this format: add note: Title | Note text");
        return;
      }
      setNotes(old => [
        {
          id: Date.now(),
          title,
          text,
          date: new Date().toLocaleDateString("en-IN")
        },
        ...old
      ]);
      setControlFeedback(`Note saved: "${title}"`);
      setControlCommand("");
      return;
    }

    const habitMatch = raw.match(/^(?:add|create)\s+habit\s*:\s*(.+)$/i);
    if (habitMatch) {
      const habitName = habitMatch[1].trim();
      setHabits(old => [
        ...old,
        { id: Date.now(), name: habitName, completedDates: [] }
      ]);
      setControlFeedback(`Habit added: "${habitName}"`);
      setControlCommand("");
      return;
    }

    if (/^(start|begin)\s+(focus|timer)(\s+session)?$/.test(command)) {
      if (secondsLeft === 0) setSecondsLeft(focusMinutes * 60);
      setTimerRunning(true);
      setActive("Study Mode");
      setControlFeedback("Focus timer started.");
      setControlCommand("");
      return;
    }

    if (/^(pause|stop)\s+(focus|timer)$/.test(command)) {
      setTimerRunning(false);
      setControlFeedback("Focus timer paused.");
      setControlCommand("");
      return;
    }

    const pageNames = {
      dashboard: "Dashboard",
      home: "Dashboard",
      analytics: "Analytics",
      "productivity analytics": "Analytics",
      planner: "Planner",
      tasks: "Planner",
      notes: "My Notes",
      "my notes": "My Notes",
      expenses: "Expenses",
      finance: "Expenses",
      "study mode": "Study Mode",
      study: "Study Mode",
      habits: "Habit Tracker",
      "habit tracker": "Habit Tracker",
      "qr tools": "QR Tools",
      settings: "Settings"
    };
    const openMatch = command.match(/^(?:open|go to|show)\s+(.+)$/);
    if (openMatch && pageNames[openMatch[1].trim()]) {
      const page = pageNames[openMatch[1].trim()];
      setActive(page);
      setSearch("");
      setControlFeedback(`Opened ${page}.`);
      setControlCommand("");
      return;
    }

    if (/^(summary|show summary|dashboard summary)$/.test(command)) {
      const pending = tasks.filter(task => !task.done).length;
      const doneToday = habits.filter(habit => habit.completedDates.includes(today)).length;
      setControlFeedback(
        `Overview: ${tasks.length} tasks (${pending} pending), ${notes.length} notes, ${habits.length} habits (${doneToday} done today), balance ${money(balance)}.`
      );
      setControlCommand("");
      return;
    }

    setControlFeedback(
      "Command not recognized. Try: add task: ... | add note: Title | Text | add habit: ... | open planner | start focus | summary"
    );
  }

  // Backup
  function exportData() {
    const backup = {
      notes,
      tasks,
      transactions,
      habits,
      sessions,
      exportedAt: new Date().toISOString()
    };

    const file = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "novakit-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredNotes = notes.filter(note =>
    (note.title + " " + note.text)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredTasks = tasks.filter(task =>
    task.text.toLowerCase().includes(search.toLowerCase())
  );

  const completedTasks = tasks.filter(task => task.done).length;
  const pendingTasks = tasks.length - completedTasks;
  const taskCompletionRate = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0;
  const totalFocusMinutes = sessions.reduce(
    (sum, session) => sum + Number(session.minutes || 0),
    0
  );
  const todayHabitsDone = habits.filter(habit =>
    Array.isArray(habit.completedDates) && habit.completedDates.includes(today)
  ).length;
  const habitCompletionRate = habits.length
    ? Math.round((todayHabitsDone / habits.length) * 100)
    : 0;
  const totalHabitCheckins = habits.reduce(
    (sum, habit) => sum + (Array.isArray(habit.completedDates) ? habit.completedDates.length : 0),
    0
  );
  const averageFocusMinutes = sessions.length
    ? Math.round(totalFocusMinutes / sessions.length)
    : 0;

  const pageTitle = active === "Dashboard" ? "Your Overview" : active;

  if (authLoading) {
    return <div className="auth-page"><div className="auth-card">Loading NOVAKIT...</div></div>;
  }

  if (!authUser) {
    return <Auth onLogin={setAuthUser} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <img
              src="/novakit-app-icon.png"
              alt="NOVAKIT"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "inherit",
                display: "block"
              }}
            />
          </div>
          <div>
            <h2>NOVAKIT</h2>
            <span>SMART LIFE KIT</span>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>

        {navigation.map(([name, icon]) => (
          <button
            key={name}
            className={`nav-item ${active === name ? "active" : ""}`}
            onClick={() => {
              setActive(name);
              setSearch("");
            }}
          >
            <span>{icon}</span>
            {name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">N</div>
            <div>
              <strong>{profileName || "Nova User"}</strong>
              <span>Personal workspace</span>
            </div>
          </div>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile workspace navigation">
        {navigation.map(([name, icon]) => (
          <button
            key={name}
            type="button"
            className={`mobile-nav-item ${active === name ? "active" : ""}`}
            onClick={() => {
              setActive(name);
              setSearch("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-current={active === name ? "page" : undefined}
            title={name}
          >
            <span className="mobile-nav-icon">{icon}</span>
            <span>{name}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR PERSONAL DIGITAL SPACE</span>
            <h1>{pageTitle}</h1>
          </div>
          <div className="button-row">
            <span className="status">● System Online</span>
            <span className="status" title="NOVAKIT cloud backup status">☁ {syncStatus}</span>
            <button
              className="secondary-btn"
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (error) {
                  console.error("Logout failed:", error);
                }
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* DASHBOARD */}
        {active === "Dashboard" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">WELCOME TO YOUR SPACE</span>
                <h2>Make today <span>extraordinary.</span></h2>
                <p>Everything you need, beautifully organized.</p>
              </div>
              <div className="welcome-star">✦</div>
            </section>

            <section className="panel page-panel" style={{ marginTop: 22 }}>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">LOCAL SMART CONTROLS</span>
                  <h2>Quick Workspace Commands</h2>
                </div>
                <span className="small-label">NO API QUOTA USED</span>
              </div>
              <p className="muted">
                Control your NOVAKIT workspace with simple commands. These actions run locally in your browser.
              </p>
              <form className="task-form" onSubmit={runDashboardCommand}>
                <input
                  value={controlCommand}
                  onChange={e => setControlCommand(e.target.value)}
                  placeholder='Try: add task: Finish homework'
                  aria-label="Dashboard command"
                />
                <button type="submit">Run Command ↗</button>
              </form>
              <p className="muted" role="status" aria-live="polite" style={{ marginTop: 10 }}>
                {controlFeedback}
              </p>
              <div className="button-row" style={{ flexWrap: "wrap", marginTop: 14 }}>
                <button className="secondary-btn" onClick={() => { setActive("Planner"); setSearch(""); }}>
                  Open Planner
                </button>
                <button className="secondary-btn" onClick={() => { setActive("My Notes"); setSearch(""); }}>
                  Open Notes
                </button>
                <button className="secondary-btn" onClick={() => { if (secondsLeft === 0) setSecondsLeft(focusMinutes * 60); setTimerRunning(true); setActive("Study Mode"); }}>
                  Start Focus
                </button>
                <button className="secondary-btn" onClick={() => setControlFeedback(`Overview: ${tasks.length} tasks, ${notes.length} notes, ${habits.length} habits, balance ${money(balance)}.`)}>
                  Quick Summary
                </button>
              </div>
              <small className="muted" style={{ display: "block", marginTop: 12 }}>
                Commands: add task: Task name · add note: Title | Text · add habit: Habit name · open planner · start focus · pause focus · summary
              </small>
            </section>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Saved Notes</span>
                <h2>{notes.length}</h2>
                <small>Your ideas</small>
              </div>
              <div className="stat-card">
                <span>Tasks Completed</span>
                <h2>{completedTasks}/{tasks.length}</h2>
                <small>Daily progress</small>
              </div>
              <div className="stat-card">
                <span>Available Balance</span>
                <h2>{money(balance)}</h2>
                <small>Recorded finances</small>
              </div>
              <div className="stat-card">
                <span>Focus Sessions</span>
                <h2>{sessions.length}</h2>
                <small>Study progress</small>
              </div>
            </div>

            <div className="section-heading">
              <h2>Quick Access</h2>
              <span className="small-label">YOUR TOOLS</span>
            </div>

            <section className="tools-grid">
              {[
                ["▥", "Analytics", "See your productivity"],
                ["📝", "My Notes", "Save your thoughts"],
                ["📅", "Planner", "Organize your day"],
                ["💰", "Expenses", "Track your money"],
                ["📚", "Study Mode", "Focus on learning"],
                ["🎯", "Habit Tracker", "Build better habits"],
                ["▦", "QR Tools", "Create and scan QR codes"],
                ["⚙", "Settings", "Manage your workspace"]
              ].map(([icon, name, desc]) => (
                <button
                  className="tool-card"
                  key={name}
                  onClick={() => setActive(name)}
                >
                  <div className="tool-icon purple">{icon}</div>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                  <span className="card-arrow">↗</span>
                </button>
              ))}
            </section>

            <div className="bottom-grid">
              <div className="panel">
                <h2>Today's Tasks</h2>
                <p className="muted">
                  {completedTasks} of {tasks.length} tasks completed.
                </p>
                <button className="primary-btn" onClick={() => setActive("Planner")}>
                  Open Planner
                </button>
              </div>
              <div className="panel">
                <h2>Finance Overview</h2>
                <p className="muted">Income: {money(totalIncome)}</p>
                <p className="muted">Expenses: {money(totalExpense)}</p>
                <button className="primary-btn" onClick={() => setActive("Expenses")}>
                  Open Expenses
                </button>
              </div>
            </div>
          </>
        )}

        {/* PRODUCTIVITY ANALYTICS */}
        {active === "Analytics" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">YOUR PROGRESS AT A GLANCE</span>
                <h2>Work smarter. <span>See your growth.</span></h2>
                <p>A summary calculated from the tasks, habits and focus sessions saved in this browser.</p>
              </div>
              <div className="welcome-star">▥</div>
            </section>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Task Completion</span>
                <h2>{taskCompletionRate}%</h2>
                <small>{completedTasks} completed · {pendingTasks} pending</small>
              </div>
              <div className="stat-card">
                <span>Focus Time</span>
                <h2>{Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m</h2>
                <small>{sessions.length} completed sessions</small>
              </div>
              <div className="stat-card">
                <span>Today's Habits</span>
                <h2>{todayHabitsDone}/{habits.length}</h2>
                <small>{habitCompletionRate}% completed today</small>
              </div>
              <div className="stat-card">
                <span>Saved Notes</span>
                <h2>{notes.length}</h2>
                <small>Your saved ideas</small>
              </div>
            </div>

            <div className="bottom-grid">
              <section className="panel page-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">TASKS</span>
                    <h2>Completion progress</h2>
                  </div>
                  <strong>{taskCompletionRate}%</strong>
                </div>
                <div style={{ height: 12, borderRadius: 99, background: "var(--border, #e8e8ef)", overflow: "hidden", margin: "18px 0" }}>
                  <div
                    role="progressbar"
                    aria-label="Task completion"
                    aria-valuenow={taskCompletionRate}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    style={{ width: `${taskCompletionRate}%`, height: "100%", borderRadius: 99, background: "var(--primary, #7957e8)", transition: "width .3s ease" }}
                  />
                </div>
                <p className="muted">{completedTasks} of {tasks.length} saved tasks completed.</p>
                <div className="button-row">
                  <button className="secondary-btn" onClick={() => setActive("Planner")}>Review tasks</button>
                </div>
              </section>

              <section className="panel page-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">FOCUS SESSIONS</span>
                    <h2>Study consistency</h2>
                  </div>
                  <strong>{sessions.length}</strong>
                </div>
                <h2 style={{ marginTop: 18 }}>{totalFocusMinutes} min</h2>
                <p className="muted">Total recorded focus time</p>
                <p className="muted">Average session: {averageFocusMinutes} min</p>
                <div className="button-row">
                  <button className="secondary-btn" onClick={() => setActive("Study Mode")}>Open Study Mode</button>
                </div>
              </section>
            </div>

            <div className="bottom-grid">
              <section className="panel page-panel">
                <span className="eyebrow">HABIT TRACKER</span>
                <h2>Today's habit progress</h2>
                <div style={{ height: 12, borderRadius: 99, background: "var(--border, #e8e8ef)", overflow: "hidden", margin: "18px 0" }}>
                  <div
                    role="progressbar"
                    aria-label="Today's habit completion"
                    aria-valuenow={habitCompletionRate}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    style={{ width: `${habitCompletionRate}%`, height: "100%", borderRadius: 99, background: "var(--primary, #7957e8)", transition: "width .3s ease" }}
                  />
                </div>
                <h2>{habitCompletionRate}%</h2>
                <p className="muted">{todayHabitsDone} of {habits.length} habits completed today · {totalHabitCheckins} total check-ins</p>
                <button className="secondary-btn" onClick={() => setActive("Habit Tracker")}>Review habits</button>
              </section>

              <section className="panel page-panel">
                <span className="eyebrow">WORKSPACE SNAPSHOT</span>
                <h2>Your saved data</h2>
                <div className="habit-list">
                  <div className="habit-row"><strong>Tasks</strong><span>{tasks.length}</span></div>
                  <div className="habit-row"><strong>Notes</strong><span>{notes.length}</span></div>
                  <div className="habit-row"><strong>Habits</strong><span>{habits.length}</span></div>
                  <div className="habit-row"><strong>Transactions</strong><span>{transactions.length}</span></div>
                </div>
                <p className="muted" style={{ marginTop: 12 }}>Analytics update automatically when you change your NOVAKIT data.</p>
              </section>
            </div>
          </>
        )}

        {/* NOTES */}
        {active === "My Notes" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">YOUR IDEAS, YOUR SPACE</span>
                <h2>Capture your <span>thoughts.</span></h2>
                <p>Create, edit and organize your personal notes.</p>
              </div>
              <div className="welcome-star">✦</div>
            </section>

            <div className="panel page-panel">
              <h2>{editingNote ? "Edit Note" : "Create New Note"}</h2>
              <form onSubmit={saveNote}>
                <input
                  className="note-input"
                  placeholder="Note title..."
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  required
                />
                <textarea
                  className="note-input"
                  placeholder="Write something..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows="5"
                  required
                />
                <button className="primary-btn" type="submit">
                  {editingNote ? "Update Note" : "+ Save Note"}
                </button>
                {editingNote && (
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setEditingNote(null);
                      setNoteTitle("");
                      setNoteText("");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="section-heading">
              <h2>Saved Notes ({notes.length})</h2>
              <input
                className="search-input"
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="tools-grid">
              {filteredNotes.map(note => (
                <article className="tool-card" key={note.id}>
                  <h3>{note.title}</h3>
                  <p className="note-content">{note.text}</p>
                  <small className="muted">{note.date || ""}</small>
                  <div className="button-row">
                    <button className="secondary-btn" onClick={() => editNote(note)}>
                      Edit
                    </button>
                    <button className="delete-btn" onClick={() => deleteNote(note.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredNotes.length === 0 && (
              <p className="empty-state">No matching notes found.</p>
            )}
          </>
        )}

        {/* PLANNER */}
        {active === "Planner" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">PLAN YOUR DAY</span>
                <h2>Stay <span>organized.</span></h2>
                <p>Your personal daily task manager.</p>
              </div>
              <div className="welcome-star">✦</div>
            </section>

            <div className="panel page-panel">
              <div className="panel-heading">
                <h2>My Tasks</h2>
                <span className="small-label">{completedTasks}/{tasks.length} DONE</span>
              </div>

              <form className="task-form" onSubmit={addTask}>
                <input
                  value={taskText}
                  onChange={e => setTaskText(e.target.value)}
                  placeholder="Add a new task..."
                  required
                />
                <input
                  type="date"
                  value={taskDate}
                  onChange={e => setTaskDate(e.target.value)}
                  aria-label="Task due date"
                />
                <button type="submit">+ Add</button>
              </form>

              <input
                className="search-input"
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <div className="task-list">
                {filteredTasks.map(task => (
                  <div className="task task-row" key={task.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id)}
                      />
                      <span className={task.done ? "completed" : ""}>
                        {task.text}
                        {task.date && <small className="task-date">Due: {task.date}</small>}
                      </span>
                    </label>
                    <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {filteredTasks.length === 0 && (
                <p className="empty-state">No tasks found. Add a task to get started.</p>
              )}
            </div>
          </>
        )}

        {/* EXPENSES */}
        {active === "Expenses" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">MANAGE YOUR MONEY</span>
                <h2>Track your <span>finances.</span></h2>
                <p>Keep a record of your income and spending.</p>
              </div>
              <div className="welcome-star">₹</div>
            </section>

            <div className="finance-grid">
              <div className="finance-card">
                <span>Total Income</span>
                <h2 className="income-text">{money(totalIncome)}</h2>
              </div>
              <div className="finance-card">
                <span>Total Expenses</span>
                <h2 className="expense-text">{money(totalExpense)}</h2>
              </div>
              <div className="finance-card">
                <span>Available Balance</span>
                <h2>{money(balance)}</h2>
              </div>
            </div>

            <div className="panel page-panel">
              <h2>Add Transaction</h2>
              <form onSubmit={addTransaction}>
                <select
                  className="note-input"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <input
                  className="note-input"
                  placeholder="Description..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
                <input
                  className="note-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount in ₹"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
                <button className="primary-btn" type="submit">
                  + Add Transaction
                </button>
              </form>
            </div>

            <div className="panel page-panel">
              <h2>Transaction History</h2>
              {transactions.length === 0 ? (
                <p className="empty-state">No transactions yet.</p>
              ) : (
                <div className="transaction-list">
                  {transactions.map(item => (
                    <div className="transaction" key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <p>{item.date} • {item.type}</p>
                      </div>
                      <div className="transaction-right">
                        <strong className={item.type === "income" ? "income-text" : "expense-text"}>
                          {item.type === "income" ? "+" : "-"}{money(item.amount)}
                        </strong>
                        <button className="delete-btn" onClick={() => deleteTransaction(item.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* STUDY MODE */}
        {active === "Study Mode" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">FOCUS ON WHAT MATTERS</span>
                <h2>Deep work. <span>Better learning.</span></h2>
                <p>Use a focus timer to organize your study sessions.</p>
              </div>
              <div className="welcome-star">◉</div>
            </section>

            <div className="panel focus-timer">
              <span className="eyebrow">FOCUS TIMER</span>
              <div className="timer-display">{formatTime(secondsLeft)}</div>

              <div className="timer-settings">
                <label htmlFor="focus-duration">Session length</label>
                <select
                  id="focus-duration"
                  value={focusMinutes}
                  onChange={e => changeFocusTime(e.target.value)}
                  disabled={timerRunning}
                >
                  <option value={15}>15 minutes</option>
                  <option value={25}>25 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div className="button-row timer-buttons">
                <button
                  className="primary-btn"
                  onClick={() => {
                    if (secondsLeft === 0) resetTimer();
                    setTimerRunning(true);
                  }}
                >
                  {timerRunning ? "Running..." : "Start Focus"}
                </button>
                <button className="secondary-btn" onClick={() => setTimerRunning(false)}>
                  Pause
                </button>
                <button className="secondary-btn" onClick={resetTimer}>
                  Reset
                </button>
              </div>
            </div>

            <div className="panel page-panel">
              <h2>Completed Focus Sessions</h2>
              <p className="muted">Total sessions: {sessions.length}</p>
              <p className="muted">
                Total focused time: {sessions.reduce((sum, item) => sum + item.minutes, 0)} minutes
              </p>
            </div>
          </>
        )}

        {/* HABIT TRACKER */}
        {active === "Habit Tracker" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">SMALL STEPS, BIG PROGRESS</span>
                <h2>Build better <span>habits.</span></h2>
                <p>Track your daily habits and celebrate consistency.</p>
              </div>
              <div className="welcome-star">◎</div>
            </section>

            <div className="panel page-panel">
              <h2>Add a Habit</h2>
              <form className="task-form" onSubmit={addHabit}>
                <input
                  value={habitText}
                  onChange={e => setHabitText(e.target.value)}
                  placeholder="e.g. Read for 20 minutes"
                  required
                />
                <button type="submit">+ Add Habit</button>
              </form>
            </div>

            <div className="panel page-panel">
              <h2>Today's Habits</h2>
              <div className="habit-list">
                {habits.map(habit => {
                  const done = habit.completedDates.includes(today);
                  return (
                    <div className="habit-row" key={habit.id}>
                      <div>
                        <strong>{habit.name}</strong>
                        <small className="muted">
                          {habit.completedDates.length} completed days
                        </small>
                      </div>
                      <div className="button-row">
                        <button
                          className={done ? "secondary-btn" : "primary-btn"}
                          onClick={() => toggleHabit(habit.id)}
                        >
                          {done ? "Completed ✓" : "Mark Done"}
                        </button>
                        <button className="delete-btn" onClick={() => deleteHabit(habit.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {habits.length === 0 && (
                <p className="empty-state">Add your first habit to begin.</p>
              )}
            </div>
          </>
        )}

        {/* QR TOOLS */}
        {active === "QR Tools" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">CREATE AND SCAN</span>
                <h2>Your QR <span>workspace.</span></h2>
                <p>Generate QR codes or scan them with your camera.</p>
              </div>
              <div className="welcome-star">▦</div>
            </section>
            <QRTools />
          </>
        )}

        {/* SETTINGS */}
        {active === "Settings" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">PERSONALIZE YOUR SPACE</span>
                <h2>Your <span>settings.</span></h2>
                <p>Manage your profile and application data.</p>
              </div>
              <div className="welcome-star">⚙</div>
            </section>

            <div className="panel page-panel">
              <h2>Profile</h2>
              <label className="field-label">Display name</label>
              <input
                className="note-input"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="panel page-panel">
              <h2>Cloud Sync</h2>
              <p className="muted">{syncStatus}</p>
              <p className="muted">Your workspace is stored in your private Firebase account space and syncs automatically after changes.</p>
            </div>

            <div className="panel page-panel">
              <h2>Data Backup</h2>
              <p className="muted">
                Export your notes, tasks, expenses, habits and study history.
              </p>
              <button className="primary-btn" onClick={exportData}>
                Download Backup
              </button>
            </div>

            <div className="panel page-panel">
              <h2>About NOVAKIT</h2>
              <p className="muted">NOVAKIT — Your Smart Life Kit.</p>
              <p className="muted">Version 1.0 • Personal workspace</p>
            </div>
          </>
        )}

        <footer>✦ NOVAKIT • SMART LIFE ALL-IN-ONE</footer>
      </main>
    </div>
  );
}

export default App;




