import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type Sender = "bot" | "user";

type ActivePage = "chat" | "timesheets" | "settings" | "help";

type Message = {
  id: string;
  sender: Sender;
  text: string;
  time: string;
};

type TimesheetRow = {
  id: string;
  chargeCode: string;
  workLocation: string;
  hours: number[]; // Mon..Fri
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function nowTimeLabel() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getMonday(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // snap to Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addWeeksISO(weekStartISO: string, deltaWeeks: number) {
  const start = new Date(weekStartISO);
  const shifted = addDays(start, deltaWeeks * 7);
  return toISODate(getMonday(shifted));
}

// weekStartStr is yyyy-mm-dd from the date input
function getWeekDates(weekStartStr: string) {
  const start = new Date(weekStartStr);
  // create 5 dates: Mon..Fri based on the selected start date
  const days = [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date(start);
    d.setDate(start.getDate() + offset);
    return d;
  });
  return days;
}

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function previousWorkingDay(d: Date) {
  const copy = new Date(d);
  while (isWeekend(copy)) copy.setDate(copy.getDate() - 1);
  return copy;
}

function lastWorkingDayOfMonth(year: number, monthIndex0: number) {
  // last day of month: new Date(year, month+1, 0)
  const last = new Date(year, monthIndex0 + 1, 0);
  return previousWorkingDay(last);
}

function stripTime(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function nextDeadlinesFrom(today: Date) {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-based

  // Mid-month = 15th, if weekend -> previous working day
  const midThis = previousWorkingDay(new Date(y, m, 15));

  // End-month = last working day
  const endThis = lastWorkingDayOfMonth(y, m);

  const pickNext = (candidate: Date, fallback: Date) =>
    candidate >= stripTime(today) ? candidate : fallback;

  // If we already passed the mid-month deadline, next mid-month is next month 15th
  const midNextMonth = previousWorkingDay(new Date(y, m + 1, 15));
  const nextMid = pickNext(midThis, midNextMonth);

  // If we already passed end-month deadline, next end-month is next month’s last working day
  const endNextMonth = lastWorkingDayOfMonth(y, m + 1);
  const nextEnd = pickNext(endThis, endNextMonth);

  return { nextMid, nextEnd };
}

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function missingDayIndices(totals: number[]) {
  const idxs: number[] = [];
  totals.forEach((t, i) => {
    if ((t || 0) <= 0) idxs.push(i);
  });
  return idxs;
}

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>("chat");

  // Week start defaults to THIS week’s Monday
  const [weekStart, setWeekStart] = useState<string>(() => toISODate(getMonday(new Date())));
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "bot",
      text:
        "Hi! 👋 I’m Timesheet Pal, your friendly timesheet assistant.\n\n" +
        "I can help you check hours, spot missing days, and guide you to submission.\n\n" +
        "What would you like to do?",
      time: "10:30 AM",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Timesheet state (manual entry)
  const [rows, setRows] = useState<TimesheetRow[]>([
    { id: "r1", chargeCode: "Work Schedule", workLocation: "MA", hours: [7.5, 7.5, 7.5, 7.5, 7.5] },
    { id: "r2", chargeCode: "Travel Time", workLocation: "MA", hours: [0, 0, 0, 0, 0] },
    { id: "r3", chargeCode: "Public Holiday", workLocation: "MA", hours: [0, 0, 0, 0, 0] },
  ]);

  // Simple “submitted” status per weekday (prototype)
  const [submittedDays, setSubmittedDays] = useState<boolean[]>([false, false, false, false, false]);

  // Derived totals
  const dayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0];
    for (const r of rows) {
      r.hours.forEach((h, i) => (totals[i] += h || 0));
    }
    return totals;
  }, [rows]);

  const weekTotal = useMemo(() => dayTotals.reduce((a, b) => a + b, 0), [dayTotals]);

  const missingDaysCount = useMemo(() => dayTotals.filter((t) => t <= 0).length, [dayTotals]);

  const { nextMid, nextEnd } = useMemo(() => nextDeadlinesFrom(new Date()), []);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: `r${Date.now()}`, chargeCode: "", workLocation: "MA", hours: [0, 0, 0, 0, 0] },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, patch: Partial<TimesheetRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function updateHour(id: string, dayIndex: number, value: string) {
    const num = value.trim() === "" ? 0 : clampNumber(Number(value), 0, 24);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = [...r.hours];
        next[dayIndex] = num;
        return { ...r, hours: next };
      })
    );
  }

  function send(userText?: string) {
    const text = (userText ?? input).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `u${Date.now()}`,
      sender: "user",
      text,
      time: nowTimeLabel(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Prototype bot reply (no real API)
    const t = text.toLowerCase();
    let reply = "Got it ✅";

    if (t.includes("hours") || t.includes("show hours") || t.includes("week")) {
      reply =
        `This week’s total is **${weekTotal.toFixed(1)} hours**.\n` +
        `Daily totals: ${dayTotals.map((v) => v.toFixed(1)).join(" / ")} (Mon→Fri).`;
    } else if (t.includes("missing")) {
      reply =
        missingDaysCount === 0
          ? "Nice — no missing days this week 🎉"
          : `You have **${missingDaysCount} missing day(s)** (0 hours logged). Want me to open the Timesheets tab?`;
    } else if (t.includes("submit")) {
      reply =
        `To submit: make sure your entries look right, then submit by:\n` +
        `• Mid-month deadline: **${formatLongDate(nextMid)}**\n` +
        `• Month-end deadline: **${formatLongDate(nextEnd)}**\n\n` +
        `Want me to mark this week as “submitted” (prototype)?`;
    } else if (t.includes("help")) {
      reply =
        "Quick options:\n" +
        "• **Show hours**\n" +
        "• **Missing days**\n" +
        "• **Submit timesheet**\n" +
        "• **Open Timesheets**";
    } else if (t.includes("open timesheets") || t.includes("timesheets")) {
      reply = "Opening Timesheets now ✅";
      setActivePage("timesheets");
    }

    const botMsg: Message = {
      id: `b${Date.now() + 1}`,
      sender: "bot",
      text: reply,
      time: nowTimeLabel(),
    };
    setMessages((prev) => [...prev, botMsg]);
  }

  function submitWeek() {
    const missingIdxs = missingDayIndices(dayTotals);

    // Add a "user" message so it feels like a real action in the chat history
    const userMsg: Message = {
      id: `u${Date.now()}`,
      sender: "user",
      text: "Submit all entries",
      time: nowTimeLabel(),
    };

    if (missingIdxs.length > 0) {
      const dates = missingIdxs.map((i) => formatLongDate(weekDates[i]));
      setActivePage("timesheets");

      const botMsg: Message = {
        id: `b${Date.now() + 1}`,
        sender: "bot",
        text:
          "I can’t submit yet — these day(s) have 0 hours:\n" +
          dates.map((d) => `• ${d}`).join("\n") +
          "\n\nFill those in and try again ✅",
        time: nowTimeLabel(),
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);
      return;
    }

    setSubmittedDays([true, true, true, true, true]);

    const botMsg: Message = {
      id: `b${Date.now() + 1}`,
      sender: "bot",
      text:
        "Done ✅ I’ve marked this week as submitted (prototype).\n\n" +
        `Mid-month deadline: ${formatLongDate(nextMid)}\n` +
        `Month-end deadline: ${formatLongDate(nextEnd)}`,
      time: nowTimeLabel(),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
  }

  // UI bits
  const progressPct = clampNumber((weekTotal / 40) * 100, 0, 100);

  return (
    <div className="appShell">
      {/* Top bar */}
      <header className="topBar">
        <div className="brand">
          <div className="brandIcon">TP</div>
          <div>
            <div className="brandName">Timesheet Pal</div>
            <div className="brandSub">Your AI timesheet assistant</div>
          </div>
        </div>

        <div className="statusPill">
          <span className="dot" />
          Online
        </div>
      </header>

      <main className="layout">
        {/* Left nav */}
        <aside className="leftNav">
          <div className="navGroupTitle">Menu</div>

          <button
            className={`navItem ${activePage === "chat" ? "active" : ""}`}
            onClick={() => setActivePage("chat")}
          >
            💬 Chat
          </button>
          <button
            className={`navItem ${activePage === "timesheets" ? "active" : ""}`}
            onClick={() => setActivePage("timesheets")}
          >
            🧾 Timesheets
          </button>
          <button
            className={`navItem ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
          >
            ⚙️ Settings
          </button>
          <button
            className={`navItem ${activePage === "help" ? "active" : ""}`}
            onClick={() => setActivePage("help")}
          >
            ❓ Help
          </button>

          <div className="navFooter">
            <div className="userChip">
              <div className="userAvatar">JD</div>
              <div>
                <div className="userName">n DoJohe</div>
                <div className="userEmail">john@company.com</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center panel */}
        <section className="centerPanel">
          {activePage === "chat" && (
            <div className="chatCard">
              <div className="chatHeader">
                <div className="chatTitleRow">
                  <div className="botIcon">🤖</div>
                  <div>
                    <div className="chatTitle">Timesheet Pal</div>
                    <div className="chatSub">Ask me anything about your timesheet</div>
                  </div>
                </div>
              </div>

              <div className="messages">
                {messages.map((m) => (
                  <div key={m.id} className={`msgRow ${m.sender === "user" ? "right" : "left"}`}>
                    <div className={`bubble ${m.sender}`}>
                      <div className="bubbleText">
                        {m.text.split("\n").map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                      <div className="bubbleTime">{m.time}</div>
                    </div>
                  </div>
                ))}
                {/* IMPORTANT: keep this to auto-scroll */}
                <div ref={bottomRef} />
              </div>

              <div className="quickActions">
                <button className="qaBtn" onClick={() => send("Show hours")}>Show hours</button>
                <button className="qaBtn" onClick={() => send("Missing days")}>Missing days</button>
                <button className="qaBtn" onClick={() => send("Submit timesheet")}>Submit timesheet</button>
                <button className="qaBtn" onClick={() => send("Get help")}>Get help</button>
              </div>

              <div className="composer">
                <input
                  className="composerInput"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                />
                <button className="sendBtn" type="button" onClick={() => send()}>
                  Send ➤
                </button>
              </div>
            </div>
          )}

          {activePage === "timesheets" && (
            <div className="timesheetCard">
              <div className="tsHeader">
                <div>
                  <div className="tsTitle">Manual Timesheet</div>
                  <div className="tsSub">Week view (Mon–Fri) with real calendar dates</div>
                </div>

                <div className="tsControls">
                  <button className="tsBtn" onClick={() => setWeekStart((w) => addWeeksISO(w, -1))}>← Prev</button>

                  <label className="tsLabel">
                    Week starting
                    <input
                      className="tsDate"
                      type="date"
                      value={weekStart}
                      onChange={(e) => {
                        // snap to Monday automatically
                        const picked = new Date(e.target.value);
                        setWeekStart(toISODate(getMonday(picked)));
                      }}
                    />
                  </label>

                  <button className="tsBtn" onClick={() => setWeekStart(toISODate(getMonday(new Date())))}>
                    This week
                  </button>
                  <button className="tsBtn" onClick={() => setWeekStart((w) => addWeeksISO(w, 1))}>Next →</button>

                  <button className="tsBtn" onClick={addRow}>+ Add row</button>
                </div>
              </div>

              <div className="tsActions">
                <button className="tsMiniBtn" onClick={() => alert("Prototype: save not wired yet")}>Save</button>
                <button className="tsMiniBtn" onClick={() => alert("Prototype: delete not wired yet")}>Delete</button>
                <button className="tsMiniBtn" onClick={() => alert("Prototype: set template not wired yet")}>Set template</button>
                <button className="tsMiniBtn" onClick={() => send("Help")}>Help</button>
              </div>

              <div className="tsTableWrap">
                <table className="tsTable">
                  <thead>
                    <tr>
                      <th className="colWide">Charge codes</th>
                      <th>Work location</th>
                      <th>{formatLongDate(weekDates[0])}</th>
                      <th>{formatLongDate(weekDates[1])}</th>
                      <th>{formatLongDate(weekDates[2])}</th>
                      <th>{formatLongDate(weekDates[3])}</th>
                      <th>{formatLongDate(weekDates[4])}</th>
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const rowTotal = r.hours.reduce((a, b) => a + (b || 0), 0);
                      return (
                        <tr key={r.id}>
                          <td className="colWide">
                            <input
                              className="tsInput"
                              value={r.chargeCode}
                              onChange={(e) => updateRow(r.id, { chargeCode: e.target.value })}
                              placeholder="e.g. Work Schedule"
                            />
                          </td>
                          <td>
                            <input
                              className="tsInput"
                              value={r.workLocation}
                              onChange={(e) => updateRow(r.id, { workLocation: e.target.value })}
                              placeholder="e.g. MA"
                            />
                          </td>

                          {r.hours.map((h, i) => (
                            <td key={i}>
                              <input
                                className="tsNum"
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={h === 0 ? "" : h}
                                onChange={(e) => updateHour(r.id, i, e.target.value)}
                                placeholder="0"
                              />
                            </td>
                          ))}

                          <td className="tsTotal">{rowTotal.toFixed(1)}</td>
                          <td>
                            <button className="tsDelete" onClick={() => removeRow(r.id)} title="Remove row">
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="tsTotalsRow">
                      <td className="colWide">Total hours</td>
                      <td />
                      {dayTotals.map((t, i) => (
                        <td key={i} className="tsTotal">
                          {t.toFixed(1)}
                        </td>
                      ))}
                      <td className="tsTotal">{weekTotal.toFixed(1)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="tsFooterNote">
                Submission deadlines (prototype rules): mid-month = 15th (previous working day if weekend),
                and month-end = last working day.
              </div>
            </div>
          )}

          {activePage === "settings" && (
            <div className="simpleCard">
              <h2>Settings (prototype)</h2>
              <p>We can add: target hours, preferred work location, and export options.</p>
            </div>
          )}

          {activePage === "help" && (
            <div className="simpleCard">
              <h2>Help (prototype)</h2>
              <p>Try: “Show hours”, “Missing days”, “Submit timesheet”, or click Timesheets for manual entry.</p>
            </div>
          )}
        </section>

        {/* Right panel */}
        <aside className="rightPanel">
          <div className="panelTitle">Weekly Overview</div>

          <div className="card info">
            <div className="cardRow">
              <div className="cardIcon">🕒</div>
              <div>
                <div className="cardLabel">This week’s hours</div>
                <div className="cardBig">{weekTotal.toFixed(1)} hours</div>
              </div>
            </div>
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="cardSub">{progressPct.toFixed(0)}% of 40 hours target</div>
          </div>

          <div className="card warn">
            <div className="cardRow">
              <div className="cardIcon">⚠️</div>
              <div>
                <div className="cardLabel">Missing days</div>
                <div className="cardBig">
                  {missingDaysCount} {missingDaysCount === 1 ? "day" : "days"}
                </div>
                <div className="cardSub">
                  {missingDaysCount === 0 ? "None 🎉" : "0 hours logged"}
                </div>
              </div>
            </div>
          </div>

          <div className="card ok">
            <div className="cardRow">
              <div className="cardIcon">✅</div>
              <div>
                <div className="cardLabel">Submitted status (prototype)</div>
                <div className="cardBig">
                  {submittedDays.filter(Boolean).length} of 5 days
                </div>
              </div>
            </div>

            <div className="submittedList">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, i) => (
                <div key={day} className="submittedRow">
                  <span>{day}</span>
                  <button
                    className={`pill ${submittedDays[i] ? "yes" : "no"}`}
                    onClick={() =>
                      setSubmittedDays((prev) => {
                        const copy = [...prev];
                        copy[i] = !copy[i];
                        return copy;
                      })
                    }
                    type="button"
                  >
                    {submittedDays[i] ? "Submitted" : "Pending"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panelTitle" style={{ marginTop: 14 }}>
            Deadlines
          </div>

          <div className="card">
            <div className="deadlineRow">
              <div>
                <div className="cardLabel">Mid-month submission</div>
                <div className="cardBig">{formatLongDate(nextMid)}</div>
              </div>
            </div>
            <div className="deadlineRow">
              <div>
                <div className="cardLabel">Month-end submission</div>
                <div className="cardBig">{formatLongDate(nextEnd)}</div>
              </div>
            </div>
          </div>

          <div className="panelTitle" style={{ marginTop: 14 }}>
            Quick Actions
          </div>
          <button className="bigBtn" onClick={submitWeek}>Submit all entries</button>
          <button className="bigBtn secondary" onClick={() => alert("Prototype: download not wired yet")}>
            Download report (prototype)
          </button>
        </aside>
      </main>
    </div>
  );
}