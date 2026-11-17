"use client";
import { useState } from "react";
import { useApp } from "../App";
import { DAYS, PAGES, fmtDate, safeUrl, todayISO } from "@/lib/shared";

export const pageNameOf = (st, k) => st.pageNames?.[k] || PAGES.find((p) => p[0] === k)[1];

export function ConfirmButton({ onConfirm, children = "Delete", confirmText = "Tap again to confirm" }) {
  const [armed, setArmed] = useState(false);
  return (
    <button type="button" className="danger" onClick={() => {
      if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
      setArmed(false); onConfirm();
    }}>{armed ? confirmText : children}</button>
  );
}

export function useUpcoming() {
  const { events } = useApp();
  const t = todayISO();
  return events.filter((e) => e.kind !== "lecture" && e.date && e.date >= t)
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
}

export function AnnItem({ a }) {
  const { canPost, members, sb, loadContent, toast } = useApp();
  const author = members.find((m) => m.id === a.author_id);
  const act = async (fn, ok) => { const { error } = await fn; if (error) toast("Couldn't save. Try again."); else { if (ok) toast(ok); loadContent(); } };
  return (
    <article className={"item" + (a.pinned ? " pinned" : "")}>
      <div className="meta">{a.pinned && <span className="chip gold">PINNED</span>}<span>{fmtDate(a.created_at)}</span><span>· {author?.full_name || "Course rep"}</span></div>
      <h3>{a.title}</h3><p>{a.body}</p>
      {canPost && <div className="actions">
        <button className="ghost" onClick={() => act(sb.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id))}>{a.pinned ? "Unpin" : "Pin"}</button>
        <ConfirmButton onConfirm={() => act(sb.from("announcements").delete().eq("id", a.id), "Deleted")} />
      </div>}
    </article>
  );
}

export function EventItem({ e }) {
  const { canPost, sb, loadContent, toast } = useApp();
  const chip = { exam: "chip red", test: "chip gold" }[e.kind] || "chip";
  const time = [e.start_time, e.end_time].filter(Boolean).join("–");
  return (
    <article className="item">
      <div className="meta"><span className={chip}>{e.kind.toUpperCase()}</span>{e.course_code && <span className="mono">{e.course_code}</span>}<span>{fmtDate(e.date)}{time && " · " + time}</span></div>
      <h3>{e.title}</h3>{e.venue && <p className="muted">Venue: {e.venue}</p>}
      {canPost && <div className="actions"><ConfirmButton onConfirm={async () => {
        const { error } = await sb.from("events").delete().eq("id", e.id); if (error) toast("Couldn't delete."); else loadContent();
      }} /></div>}
    </article>
  );
}

export function NoteItem({ n }) {
  const { canPost, sb, loadContent, toast } = useApp();
  const late = n.kind === "assignment" && n.due && n.due < todayISO();
  const open = async () => {
    const { data, error } = await sb.storage.from("notes").createSignedUrl(n.file_path, 3600);
    if (error) return toast("Couldn't open that file.");
    window.open(data.signedUrl, "_blank", "noopener");
  };
  const del = async () => {
    if (n.file_path) await sb.storage.from("notes").remove([n.file_path]);
    const { error } = await sb.from("notes").delete().eq("id", n.id);
    if (error) toast("Couldn't delete."); else loadContent();
  };
  const url = safeUrl(n.url);
  return (
    <article className="item">
      <div className="meta">
        <span className={n.kind === "assignment" ? "chip gold" : "chip"}>{n.kind === "assignment" ? "ASSIGNMENT" : "NOTE"}</span>
        {n.course_code && <span className="mono">{n.course_code}</span>}
        {n.due && <span>Due {fmtDate(n.due)}</span>}{late && <span className="chip red">PAST DUE</span>}
      </div>
      <h3>{n.title}</h3>{n.details && <p>{n.details}</p>}
      <div className="actions">
        {n.file_path && <button className="ghost" onClick={open}>Open file ↗</button>}
        {url && <a href={url} target="_blank" rel="noopener noreferrer">Open link ↗</a>}
        {canPost && <ConfirmButton onConfirm={del} />}
      </div>
    </article>
  );
}

function LinkCard({ l }) {
  const u = safeUrl(l.url); if (!u) return null;
  return <a className="link" href={u} target="_blank" rel="noopener noreferrer"><b>{l.label}</b><span className="u">{u.replace(/^https?:\/\//, "")}</span></a>;
}

export function Home() {
  const { settings: st, ann, members, notes, me } = useApp();
  const up = useUpcoming();
  const openTasks = notes.filter((n) => n.kind === "assignment" && n.due && n.due >= todayISO()).length;
  return (
    <>
      <div className="pagehead"><h2>Hi, {String(me.full_name).split(" ").slice(-1)[0]}</h2><a href="#me">My dashboard →</a></div>
      <div className="stats">
        <div className="stat"><span className="label">Classmates</span><b>{members.filter((m) => m.approved || m.is_admin).length}</b></div>
        <div className="stat"><span className="label">Upcoming</span><b>{up.length}</b></div>
        <div className="stat"><span className="label">Open assignments</span><b>{openTasks}</b></div>
        <div className="stat"><span className="label">Announcements</span><b>{ann.length}</b></div>
      </div>
      <div className="grid2">
        <section className="list"><div className="pagehead"><h2 className="h-sm">{pageNameOf(st, "news")}</h2><a href="#news">See all</a></div>
          {ann.slice(0, 3).map((a) => <AnnItem key={a.id} a={a} />)}
          {!ann.length && <p className="empty">No announcements yet.</p>}</section>
        <section className="list"><div className="pagehead"><h2 className="h-sm">Coming up</h2><a href="#timetable">Timetable</a></div>
          {up.slice(0, 4).map((e) => <EventItem key={e.id} e={e} />)}
          {!up.length && <p className="empty">No tests, exams or events scheduled.</p>}</section>
      </div>
      <div className="grid2">
        <a className="feature" href="#about">
          <span className="label">Tap to open</span><b>{pageNameOf(st, "about")}</b>
          <span className="muted">Vice-Chancellor and school leaders, school rules, the UNIBEN anthem and the national anthem.</span>
        </a>
        <a className="feature alt" href="#gallery">
          <span className="label">Memories</span><b>{pageNameOf(st, "gallery")}</b>
          <span className="muted">Class photos from lectures, presentations and events. Add yours.</span>
        </a>
      </div>
      <section className="list"><div className="pagehead"><h2 className="h-sm">{pageNameOf(st, "links")}</h2><a href="#links">All links</a></div>
        <div className="links">{(st.links || []).slice(0, 4).map((l, i) => <LinkCard key={i} l={l} />)}</div></section>
    </>
  );
}

export function News() {
  const { settings: st, ann, canPost, sb, uid, loadContent, toast } = useApp();
  const [busy, setBusy] = useState(false);
  async function post(e) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    setBusy(true);
    const { error } = await sb.from("announcements").insert({ title: String(f.get("title")).trim(), body: String(f.get("body")).trim(), pinned: f.get("pinned") === "on", author_id: uid });
    setBusy(false);
    if (error) return toast("Couldn't post. Try again.");
    form.reset(); toast("Announcement posted"); loadContent();
  }
  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "news")}</h2></div>
      {canPost && <details className="add"><summary>Post an announcement</summary>
        <form onSubmit={post}>
          <label>Title<input name="title" required maxLength={140} /></label>
          <label>Message<textarea name="body" required maxLength={4000} /></label>
          <label className="inline"><input type="checkbox" name="pinned" /> Pin to top</label>
          <button disabled={busy}>Post announcement</button>
        </form></details>}
      <div className="list">{ann.map((a) => <AnnItem key={a.id} a={a} />)}{!ann.length && <p className="empty">No announcements yet.</p>}</div>
    </>
  );
}

export function Timetable() {
  const { settings: st, events, canPost, sb, loadContent, toast } = useApp();
  const up = useUpcoming();
  const [kind, setKind] = useState("lecture");
  const lec = events.filter((e) => e.kind === "lecture");
  const past = events.filter((e) => e.kind !== "lecture" && e.date && e.date < todayISO()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  async function add(e) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const g = (k) => String(f.get(k) || "").trim();
    if (kind !== "lecture" && !g("date")) return toast("Pick a date for tests, exams and events.");
    const { error } = await sb.from("events").insert({
      kind, course_code: g("code").toUpperCase(), title: g("title"), day: kind === "lecture" ? g("day") : "",
      date: kind === "lecture" ? null : g("date"), start_time: g("start"), end_time: g("end"), venue: g("venue"),
    });
    if (error) return toast("Couldn't add. Try again.");
    form.reset(); setKind("lecture"); toast("Added to timetable"); loadContent();
  }
  const delSlot = async (id) => { const { error } = await sb.from("events").delete().eq("id", id); if (error) toast("Couldn't remove."); else loadContent(); };
  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "timetable")}</h2></div>
      {canPost && <details className="add"><summary>Add to timetable</summary>
        <form onSubmit={add}>
          <div className="row">
            <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="lecture">Weekly lecture</option><option value="test">Test</option><option value="exam">Exam</option><option value="event">Event</option></select></label>
            <label>Course code<input name="code" placeholder="SSE 221" maxLength={20} /></label>
            <label>Title<input name="title" required placeholder="Principles of Economics" maxLength={120} /></label>
          </div>
          <div className="row">
            {kind === "lecture"
              ? <label>Day<select name="day">{DAYS.map((d) => <option key={d}>{d}</option>)}</select></label>
              : <label>Date<input type="date" name="date" required /></label>}
            <label>Starts<input type="time" name="start" /></label><label>Ends<input type="time" name="end" /></label>
          </div>
          <label>Venue<input name="venue" placeholder="Faculty of Education lecture theatre" maxLength={120} /></label>
          <button>Add</button>
        </form></details>}
      <section className="list"><h3>Weekly lectures</h3>
        <div className="weekscroll"><div className="week">{DAYS.map((d) => {
          const s = lec.filter((e) => e.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return <div className="day" key={d}><h3>{d}</h3>
            {s.map((e) => <div className="slot" key={e.id}>
              <span className="t">{e.start_time}{e.end_time && "–" + e.end_time}</span><b className="mono">{e.course_code}</b><span>{e.title}</span>
              {e.venue && <span className="muted">{e.venue}</span>}
              {canPost && <ConfirmButton onConfirm={() => delSlot(e.id)}>Remove</ConfirmButton>}
            </div>)}
            {!s.length && <span className="empty">No lectures</span>}</div>;
        })}</div></div></section>
      <section className="list"><h3>Tests, exams & events</h3>{up.map((e) => <EventItem key={e.id} e={e} />)}{!up.length && <p className="empty">Nothing scheduled.</p>}</section>
      {past.length > 0 && <section className="list"><h3 className="muted">Past</h3>{past.map((e) => <EventItem key={e.id} e={e} />)}</section>}
    </>
  );
}

export function Notes() {
  const { settings: st, notes, canPost, sb, loadContent, toast } = useApp();
  const [busy, setBusy] = useState(false);
  async function share(e) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const g = (k) => String(f.get(k) || "").trim();
    const file = f.get("file");
    setBusy(true);
    try {
      let file_path = "";
      if (file && file.size) {
        if (file.size > 20 * 1024 * 1024) { toast("Files must be 20 MB or smaller."); return; }
        file_path = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
        const { error } = await sb.storage.from("notes").upload(file_path, file, { contentType: file.type || undefined });
        if (error) { toast("Upload failed. Try again."); return; }
      }
      const { error } = await sb.from("notes").insert({
        kind: g("kind"), course_code: g("code").toUpperCase(), title: g("title"), details: g("details"),
        url: safeUrl(g("url")), file_path, due: g("due") || null,
      });
      if (error) { toast("Couldn't share. Try again."); return; }
      form.reset(); toast("Shared with the class"); loadContent();
    } finally { setBusy(false); }
  }
  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "notes")}</h2></div>
      {canPost && <details className="add"><summary>Share a note or assignment</summary>
        <form onSubmit={share}>
          <div className="row">
            <label>Type<select name="kind"><option value="note">Lecture note</option><option value="assignment">Assignment</option></select></label>
            <label>Course code<input name="code" placeholder="SSE 221" maxLength={20} /></label>
            <label>Due date <span className="hint">assignments</span><input type="date" name="due" /></label>
          </div>
          <label>Title<input name="title" required maxLength={140} /></label>
          <label>Details<textarea name="details" maxLength={3000} placeholder="Instructions, pages to read, how to submit" /></label>
          <div className="row">
            <label>Link <span className="hint">Google Drive, etc.</span><input name="url" type="url" placeholder="https://" /></label>
            <label>Or upload a file <span className="hint">PDF or image, up to 20 MB</span><input name="file" type="file" accept=".pdf,image/*,.doc,.docx,.ppt,.pptx,.txt" /></label>
          </div>
          <button disabled={busy}>{busy ? "Sharing…" : "Share"}</button>
        </form></details>}
      <div className="list">{notes.map((n) => <NoteItem key={n.id} n={n} />)}{!notes.length && <p className="empty">No notes or assignments shared yet.</p>}</div>
    </>
  );
}

export function Links() {
  const { settings: st, isAdmin } = useApp();
  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "links")}</h2>{isAdmin && <a href="#manage">Edit links</a>}</div>
      <div className="links">{(st.links || []).map((l, i) => <LinkCard key={i} l={l} />)}</div>
      <p className="hint">Links open the official school websites. Log in to the student portal only on the portal's own page.</p>
    </>
  );
}
