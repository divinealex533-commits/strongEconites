"use client";
import { useApp } from "../App";
import { AnnItem, EventItem, useUpcoming } from "./Main";
import { useRef, useState } from "react";
import { degreeClass, fmtDate, gpaOf, grade, todayISO } from "@/lib/shared";
import { squareAvatar } from "@/lib/image";
import Avatar from "../Avatar";
import { useGallery, GalleryUpload } from "./Gallery";

function PhotoPicker() {
  const { sb, uid, me, setMe, loadMembers, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await squareAvatar(file);
      const path = `${uid}/avatar.jpg`;
      const up = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw new Error("Upload failed. Try again.");
      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      const avatar_url = pub.publicUrl + "?v=" + Date.now();
      const { data, error } = await sb.from("profiles").update({ avatar_url }).eq("id", uid).select().single();
      if (error) throw new Error("Couldn't save your photo.");
      setMe(data); loadMembers(); toast("Profile photo updated");
    } catch (err) { toast(err.message); }
    finally { setBusy(false); }
  }
  return (
    <div className="photo-pick">
      <button type="button" className="avatar-btn" onClick={() => input.current.click()} aria-label="Change profile photo" disabled={busy}>
        <Avatar person={me} size={88} />
        <span className="cam">{busy ? "…" : "📷"}</span>
      </button>
      <input ref={input} type="file" accept="image/*" className="sr" onChange={pick} />
    </div>
  );
}

function GalleryStrip() {
  const [items, reload] = useGallery(8);
  return (
    <section className="panel list">
      <div className="pagehead"><h3>Class photos</h3><a href="#gallery">Open gallery →</a></div>
      {items && items.length > 0 && <div className="strip">{items.map((it) => <a key={it.id} href="#gallery" className="strip-img"><img src={it.url} alt={it.caption || "Class photo"} loading="lazy" /></a>)}</div>}
      {items && !items.length && <p className="empty">No class photos yet. Be the first to add one.</p>}
      <details className="add"><summary>Add a photo</summary><GalleryUpload onDone={reload} compact /></details>
    </section>
  );
}

function CourseForm() {
  const { dash, saveDash } = useApp();
  return (
    <form onSubmit={(e) => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      const c = { code: String(f.get("code")).trim().toUpperCase(), title: String(f.get("title") || "").trim(), units: Math.max(0, parseInt(f.get("units")) || 0), score: null };
      saveDash({ ...dash, courses: [...dash.courses, c] }); form.reset();
    }}>
      <div className="row">
        <label>Code<input name="code" required maxLength={12} placeholder="SSE 221" /></label>
        <label>Title<input name="title" maxLength={80} placeholder="Principles of Economics" /></label>
        <label>Units<input name="units" type="number" min={0} max={12} defaultValue={2} /></label>
      </div>
      <button>Add course</button>
    </form>
  );
}

export function Dashboard() {
  const { me, events, notes, ann, dash, saveDash } = useApp();
  const up = useUpcoming();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayLec = events.filter((e) => e.kind === "lecture" && e.day === dayName).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const tasks = notes.filter((n) => n.kind === "assignment").sort((a, b) => String(a.due || "9").localeCompare(String(b.due || "9")));
  const open = tasks.filter((n) => !dash.done[n.id]);
  const units = dash.courses.reduce((t, c) => t + (+c.units || 0), 0);
  const gpa = gpaOf(dash.courses);
  const nextExam = up.find((e) => e.kind === "exam" || e.kind === "test");
  const daysTo = (d) => Math.max(0, Math.round((new Date(d + "T12:00:00") - new Date(todayISO() + "T12:00:00")) / 864e5));
  const toggle = (id, on) => { const done = { ...dash.done }; if (on) done[id] = true; else delete done[id]; saveDash({ ...dash, done }); };
  const removeCourse = (i) => saveDash({ ...dash, courses: dash.courses.filter((_, j) => j !== i) });

  return (
    <>
      <div className="pagehead"><h2>My Dashboard</h2><span className="chip">APPROVED MEMBER</span></div>
      <section className="panel idcard">
        <PhotoPicker />
        <div><h3>{me.full_name}</h3><div className="mono">{me.matric}</div>
          <div className="muted">{me.department} · {me.level} · {me.role}</div>
          <span className="hint">{me.avatar_url ? "Tap your photo to change it." : "Tap the circle to add your photo."}</span> <a href="#class">Edit profile</a></div>
      </section>
      <div className="stats">
        <div className="stat"><span className="label">Lectures today</span><b>{todayLec.length}</b></div>
        <div className="stat"><span className="label">Assignments open</span><b>{open.length}</b></div>
        <div className="stat"><span className="label">Tests & exams ahead</span><b>{up.filter((e) => e.kind !== "event").length}</b></div>
        <div className="stat"><span className="label">My GPA</span><b>{gpa == null ? "–" : gpa.toFixed(2)}</b><a href="#gpa" className="small-link">Calculator</a></div>
      </div>
      {nextExam && (
        <section className="countdown"><span className="label">Next {nextExam.kind}</span>
          <div><b className="big">{daysTo(nextExam.date)}</b> {daysTo(nextExam.date) === 1 ? "day" : "days"} to <b className="mono">{nextExam.course_code}</b> {nextExam.title}</div>
          <a href="#study" className="btnlink light">Revise in Study Hub</a></section>
      )}
      <div className="grid2">
        <section className="list"><h3>Today · {dayName}</h3>
          {todayLec.map((e) => <div className="slot" key={e.id}><span className="t">{[e.start_time, e.end_time].filter(Boolean).join("–")}</span><b className="mono">{e.course_code}</b><span>{e.title}</span>{e.venue && <span className="muted">{e.venue}</span>}</div>)}
          {!todayLec.length && <p className="empty">No lectures on the timetable today.</p>}</section>
        <section className="list"><h3>My assignments</h3>
          {tasks.map((n) => <label key={n.id} className={"check" + (dash.done[n.id] ? " done" : "")}>
            <input type="checkbox" checked={Boolean(dash.done[n.id])} onChange={(e) => toggle(n.id, e.target.checked)} />
            <span><b className="mono">{n.course_code}</b> {n.title}<br /><span className="muted">{n.due ? "Due " + fmtDate(n.due) : "No due date"}</span></span>
          </label>)}
          {!tasks.length && <p className="empty">No assignments posted.</p>}
          <p className="hint">Ticks are private to you.</p></section>
      </div>
      <div className="grid2">
        <section className="list"><h3>Coming up</h3>{up.slice(0, 4).map((e) => <EventItem key={e.id} e={e} />)}{!up.length && <p className="empty">Nothing scheduled.</p>}</section>
        <section className="panel list"><h3>My courses this semester</h3>
          {dash.courses.length > 0 ? <div className="tablewrap"><table><thead><tr><th>Code</th><th>Title</th><th>Units</th><th></th></tr></thead><tbody>
            {dash.courses.map((c, i) => <tr key={i}><td className="mono">{c.code}</td><td>{c.title}</td><td className="num">{c.units}</td><td><button className="danger" onClick={() => removeCourse(i)}>Remove</button></td></tr>)}
            <tr><td /><td><b>Total</b></td><td className="num"><b>{units}</b></td><td /></tr></tbody></table></div>
            : <p className="empty">Add the courses you registered on Kofa to keep them handy.</p>}
          <CourseForm /><p className="hint">Only you can see this list.</p></section>
      </div>
      <GalleryStrip />
      <section className="panel list"><h3>Kofa shortcuts</h3>
        <p style={{ margin: 0 }}>Course registration, fees, results and hostel are on the official portal. Log in there with your own details.</p>
        <div className="actions"><a className="btnlink" href="https://waeup.uniben.edu" target="_blank" rel="noopener noreferrer">Open Kofa portal ↗</a>
          <a className="btnlink ghostlink" href="https://educ.uniben.edu" target="_blank" rel="noopener noreferrer">Faculty of Education ↗</a></div></section>
      {ann[0] && <section className="list"><h3>Latest announcement</h3><AnnItem a={ann[0]} /></section>}
    </>
  );
}

export function Gpa() {
  const { dash, saveDash } = useApp();
  const cs = dash.courses, g = gpaOf(cs), units = cs.reduce((t, c) => t + (+c.units || 0), 0);
  const setScore = (i, v) => saveDash({ ...dash, courses: cs.map((c, j) => (j === i ? { ...c, score: v === "" ? null : Math.max(0, Math.min(100, +v)) } : c)) });
  return (
    <>
      <div className="pagehead"><h2>CGPA Calculator</h2><span className="muted">UNIBEN 5-point scale</span></div>
      <div className="stats">
        <div className="stat"><span className="label">GPA</span><b>{g == null ? "–" : g.toFixed(2)}</b></div>
        <div className="stat"><span className="label">Class</span><b className="b-sm">{degreeClass(g) || "–"}</b></div>
        <div className="stat"><span className="label">Total units</span><b>{units}</b></div>
      </div>
      <section className="panel list">
        {cs.length > 0 ? <div className="tablewrap"><table><thead><tr><th>Course</th><th>Units</th><th>Score</th><th>Grade</th><th>Points</th><th /></tr></thead><tbody>
          {cs.map((c, i) => { const gr = grade(c.score); return (
            <tr key={i}><td><b className="mono">{c.code}</b><div className="muted small">{c.title}</div></td><td className="num">{c.units}</td>
              <td><input className="scorein" type="number" min={0} max={100} inputMode="numeric" defaultValue={c.score ?? ""} aria-label={"Score for " + c.code}
                onBlur={(e) => { if (String(c.score ?? "") !== e.target.value) setScore(i, e.target.value); }} /></td>
              <td><span className={"grade g" + (gr ? gr[0] : "")}>{gr ? gr[0] : "–"}</span></td><td className="num">{gr ? gr[1] * (+c.units || 0) : "–"}</td>
              <td><button className="danger" onClick={() => saveDash({ ...dash, courses: cs.filter((_, j) => j !== i) })}>Remove</button></td></tr>); })}
        </tbody></table></div> : <p className="empty">Add your courses below, then type in your scores.</p>}
        <CourseForm />
      </section>
      <section className="panel list"><h3>How it's worked out</h3>
        <div className="tablewrap"><table><thead><tr><th>Score</th><th>Grade</th><th>Points</th></tr></thead><tbody>
          {[["70–100", "A", 5], ["60–69", "B", 4], ["50–59", "C", 3], ["45–49", "D", 2], ["40–44", "E", 1], ["0–39", "F", 0]].map((r) => <tr key={r[1]}><td>{r[0]}</td><td>{r[1]}</td><td className="num">{r[2]}</td></tr>)}
        </tbody></table></div>
        <p className="hint" style={{ margin: 0 }}>GPA = total (units × points) ÷ total units. First Class 4.50–5.00 · Second Upper 3.50–4.49 · Second Lower 2.40–3.49 · Third 1.50–2.39 · Pass 1.00–1.49. Confirm against your departmental handbook. Your scores are private to you.</p>
      </section>
    </>
  );
}
