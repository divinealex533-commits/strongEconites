"use client";
import { useState } from "react";
import { useApp } from "../App";
import { pageNameOf } from "./Main";
import { safeUrl } from "@/lib/shared";

const TABS = [["leaders", "Leaders"], ["rules", "Rules"], ["school", "School Anthem"], ["nigeria", "National Anthem"]];

function Anthem({ title, text, url, isAdmin }) {
  return (
    <section className="panel anthem">
      <span className="label">Stand and sing</span>
      <h3>{title}</h3>
      {text ? <div className="lyrics">{text}</div>
        : <p className="muted">{isAdmin ? "Paste the words under Edit page so classmates can learn them here." : "A class rep will add the words here soon."}</p>}
      {safeUrl(url) && <a href={safeUrl(url)} target="_blank" rel="noopener noreferrer">Official page ↗</a>}
    </section>
  );
}

function Editor({ about, onClose }) {
  const { sb, settings: st, setSettings, toast } = useApp();
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k) => String(f.get(k) || "").trim();
    const lines = (k) => g(k).split("\n").map((l) => l.trim()).filter(Boolean);
    const leaders = lines("leaders").map((l) => { const [role, name, note] = l.split("|").map((x) => (x || "").trim()); return { role, name, note: note || "" }; }).filter((x) => x.role && x.name);
    const rules = lines("rules").map((l) => { const i = l.indexOf("|"); return i < 0 ? { group: "General", text: l } : { group: l.slice(0, i).trim() || "General", text: l.slice(i + 1).trim() }; }).filter((r) => r.text);
    const next = { ...about, leaders, rules, checked: g("checked"), handbookUrl: safeUrl(g("handbookUrl")),
      schoolAnthemTitle: g("schoolAnthemTitle"), schoolAnthem: g("schoolAnthem"), nationalAnthemTitle: g("nationalAnthemTitle"), nationalAnthem: g("nationalAnthem") };
    const data = { ...st, about: next };
    setBusy(true);
    const { error } = await sb.from("settings").update({ data }).eq("id", 1);
    setBusy(false);
    if (error) return toast("Couldn't save. Try again.");
    setSettings(data); toast("Page updated"); onClose();
  }
  return (
    <form className="panel" onSubmit={save}>
      <h3>Edit this page</h3>
      <label>Leaders <span className="hint">one per line: Role | Name | note (optional)</span>
        <textarea name="leaders" className="tall" defaultValue={(about.leaders || []).map((l) => [l.role, l.name, l.note].filter(Boolean).join(" | ")).join("\n")} /></label>
      <label>Rules <span className="hint">one per line: Group | Rule</span>
        <textarea name="rules" className="tall" defaultValue={(about.rules || []).map((r) => `${r.group} | ${r.text}`).join("\n")} /></label>
      <div className="row">
        <label>Last checked<input name="checked" maxLength={40} defaultValue={about.checked} /></label>
        <label>Student handbook link<input name="handbookUrl" type="url" defaultValue={about.handbookUrl} /></label>
      </div>
      <label>School anthem title<input name="schoolAnthemTitle" maxLength={80} defaultValue={about.schoolAnthemTitle} /></label>
      <label>School anthem words<textarea name="schoolAnthem" className="tall" maxLength={4000} defaultValue={about.schoolAnthem} /></label>
      <label>National anthem title<input name="nationalAnthemTitle" maxLength={80} defaultValue={about.nationalAnthemTitle} /></label>
      <label>National anthem words<textarea name="nationalAnthem" className="tall" maxLength={4000} defaultValue={about.nationalAnthem} /></label>
      <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Save page"}</button><button type="button" className="ghost" onClick={onClose}>Cancel</button></div>
    </form>
  );
}

export default function About() {
  const { settings: st, isAdmin } = useApp();
  const about = st.about || {};
  const [tab, setTab] = useState("leaders");
  const [editing, setEditing] = useState(false);
  const groups = [...new Set((about.rules || []).map((r) => r.group))];

  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "about")}</h2>{isAdmin && !editing && <button className="ghost" onClick={() => setEditing(true)}>Edit page</button>}</div>
      {editing ? <Editor about={about} onClose={() => setEditing(false)} /> : (
        <>
          <div className="tabs" role="tablist">
            {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{label}</button>)}
          </div>

          {tab === "leaders" && (
            <section className="list">
              <div className="leaders">
                {(about.leaders || []).map((l, i) => (
                  <article className="leader" key={i}>
                    <span className="seal" aria-hidden="true">{String(l.name).replace(/^(Prof\.|Dr\.|Mr\.|Mrs\.)\s*/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                    <div><span className="label">{l.role}</span><h3>{l.name}</h3>{l.note && <p className="muted small">{l.note}</p>}</div>
                  </article>
                ))}
                {!(about.leaders || []).length && <p className="empty">No leaders added yet.</p>}
              </div>
              <p className="hint">Leaders change from time to time{about.checked ? `; last checked ${about.checked}` : ""}. Class reps can update this list.</p>
            </section>
          )}

          {tab === "rules" && (
            <section className="list">
              {groups.map((g) => (
                <details className="rulegroup" key={g} open>
                  <summary>{g}</summary>
                  <ul>{about.rules.filter((r) => r.group === g).map((r, i) => <li key={i}>{r.text}</li>)}</ul>
                </details>
              ))}
              {!groups.length && <p className="empty">No rules added yet.</p>}
              <p className="hint">Summarised from the {about.rulesSource || "UNIBEN Student Handbook"}. The handbook is the official version.</p>
              {safeUrl(about.handbookUrl) && <a className="btnlink" href={safeUrl(about.handbookUrl)} target="_blank" rel="noopener noreferrer">Read the Student Handbook ↗</a>}
            </section>
          )}

          {tab === "school" && <Anthem title={about.schoolAnthemTitle || "The University of Benin Anthem"} text={about.schoolAnthem} url={about.schoolAnthemUrl} isAdmin={isAdmin} />}
          {tab === "nigeria" && <Anthem title={about.nationalAnthemTitle || "Nigerian National Anthem"} text={about.nationalAnthem} isAdmin={isAdmin} />}
        </>
      )}
    </>
  );
}
