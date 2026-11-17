"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../App";
import { fmtDate, todayISO } from "@/lib/shared";

const TOPICS = ["Elasticity of demand with Nigerian examples", "Inflation and the CBN's monetary policy", "Opportunity cost and scale of preference",
  "Bloom's taxonomy for writing lesson objectives", "How to write a Social Studies lesson plan", "National income: GDP vs GNP"];

// light formatting for **bold** and # headings, rendered safely as React nodes
function Rich({ text }) {
  return text.split("\n").map((line, i) => {
    const h = line.match(/^#+\s*(.+)$/);
    const parts = (h ? h[1] : line).split(/\*\*(.+?)\*\*/g);
    return <span key={i}>{parts.map((p, j) => (j % 2 || h ? <b key={j}>{p}</b> : p))}{"\n"}</span>;
  });
}

async function api(sb, path, body) {
  const { data } = await sb.auth.getSession();
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + (data.session?.access_token || "") },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Something went wrong. Try again.");
  return out;
}

export default function Study() {
  const { sb, aiEnabled, dash, saveDash, toast } = useApp();
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const log = useRef(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [chat, busy]);

  if (!aiEnabled) return (
    <>
      <div className="pagehead"><h2>Study Hub</h2></div>
      <div className="notice">The tutor and quiz maker switch on once the site owner adds an AI key in the hosting settings.</div>
    </>
  );

  async function ask(question) {
    const text = (question ?? q).trim(); if (!text || busy) return;
    const next = [...chat, { role: "user", content: text }];
    setChat(next); setQ(""); setBusy(true);
    try { const out = await api(sb, "/api/tutor", { messages: next }); setChat([...next, { role: "assistant", content: out.text }]); }
    catch (e) { setChat([...next, { role: "assistant", content: e.message }]); }
    finally { setBusy(false); }
  }

  async function makeQuiz(e) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const topic = String(f.get("topic")).trim(), level = String(f.get("level"));
    setQuizBusy(true);
    try { const out = await api(sb, "/api/quiz", { topic, level }); setQuiz({ topic, level, questions: out.questions, picks: {}, done: false, score: 0 }); }
    catch (err) { toast(err.message); }
    finally { setQuizBusy(false); }
  }

  function mark() {
    const score = quiz.questions.reduce((t, qq, i) => t + (quiz.picks[i] === qq.answer ? 1 : 0), 0);
    setQuiz({ ...quiz, done: true, score });
    saveDash({ ...dash, quizzes: [...(dash.quizzes || []), { topic: quiz.topic, score, total: quiz.questions.length, at: todayISO() }].slice(-30) });
  }

  const codes = [...new Set(dash.courses.map((c) => c.code).filter(Boolean))];
  const hist = (dash.quizzes || []).slice(-6).reverse();

  return (
    <>
      <div className="pagehead"><h2>Study Hub</h2><span className="muted">Tutor and practice quizzes for SSE courses</span></div>
      <div className="grid2 study">
        <section className="panel list">
          <div className="pagehead"><h3>Ask the tutor</h3>{chat.length > 0 && <button className="ghost" onClick={() => setChat([])}>Clear</button>}</div>
          <div className="tutorlog" ref={log}>
            {!chat.length && <><p className="muted" style={{ margin: 0 }}>Ask anything from your courses. Try one of these:</p>
              <div className="chips">{TOPICS.map((t) => <button key={t} className="chipbtn" onClick={() => ask("Explain " + t)}>{t}</button>)}</div></>}
            {chat.map((m, i) => <div key={i} className={"tmsg " + m.role}>{m.role === "user" ? m.content : <Rich text={m.content} />}</div>)}
            {busy && <div className="tmsg assistant thinking">Thinking…</div>}
          </div>
          <form className="composer flat" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <label className="sr" htmlFor="tutorQ">Question</label>
            <textarea id="tutorQ" rows={2} maxLength={1500} value={q} onChange={(e) => setQ(e.target.value)} disabled={busy}
              placeholder="e.g. What is the difference between a want and a need?"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
            <button disabled={busy || !q.trim()}>Ask</button>
          </form>
          <p className="hint" style={{ margin: 0 }}>The tutor can make mistakes. Check important facts against your lecture notes.</p>
        </section>

        <section className="panel list"><h3>Practice quiz</h3>
          {quizBusy ? <p className="muted">Writing your questions…</p> : !quiz ? (
            <form onSubmit={makeQuiz}>
              <label>Topic or course<input name="topic" required list="qzList" maxLength={120} placeholder="e.g. Theory of consumer behaviour" /></label>
              <datalist id="qzList">{codes.map((c) => <option key={c} value={c} />)}{TOPICS.map((t) => <option key={t} value={t} />)}</datalist>
              <label>Difficulty<select name="level" defaultValue="300 level"><option>100–200 level</option><option>300 level</option><option>400 level / final year</option></select></label>
              <button>Make a 5-question quiz</button>
            </form>
          ) : (
            <div className="list">
              <div className="meta muted">{quiz.topic} · {quiz.level}</div>
              {quiz.questions.map((qq, i) => (
                <div className="qq" key={i}><b>{i + 1}. {qq.q}</b>
                  <div className="opts">{qq.options.map((o, j) => {
                    const pick = quiz.picks[i] === j, right = quiz.done && j === qq.answer, wrong = quiz.done && pick && j !== qq.answer;
                    return <button key={j} type="button" disabled={quiz.done}
                      className={"opt" + (pick ? " picked" : "") + (right ? " right" : "") + (wrong ? " wrong" : "")}
                      onClick={() => setQuiz({ ...quiz, picks: { ...quiz.picks, [i]: j } })}>{"ABCD"[j]}. {o}</button>;
                  })}</div>
                  {quiz.done && <p className="explain">{qq.explain}</p>}
                </div>
              ))}
              {quiz.done
                ? <><div className="score">You scored <b>{quiz.score}/{quiz.questions.length}</b></div><button onClick={() => setQuiz(null)}>New quiz</button></>
                : <button onClick={mark} disabled={Object.keys(quiz.picks).length < quiz.questions.length}>Mark my answers</button>}
            </div>
          )}
          {hist.length > 0 && <div><span className="label">Your recent scores</span>
            <div className="tablewrap"><table><tbody>{hist.map((h, i) => <tr key={i}><td>{h.topic}</td><td className="num">{h.score}/{h.total}</td><td className="muted">{fmtDate(h.at)}</td></tr>)}</tbody></table></div></div>}
        </section>
      </div>
    </>
  );
}
