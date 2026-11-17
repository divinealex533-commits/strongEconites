"use client";
import { useState } from "react";
import { useApp } from "../App";
import { ConfirmButton, pageNameOf } from "./Main";
import Avatar from "../Avatar";
import { DEFAULT_PREFIXES, DEFAULT_WELCOME, DEPTS, LEVELS, PAGES, ROLES, safeUrl } from "@/lib/shared";

function waLink(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return "https://wa.me/" + d;
}

async function adminApi(sb, body) {
  const { data } = await sb.auth.getSession();
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + (data.session?.access_token || "") },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Something went wrong.");
}

function ResetPassword({ m }) {
  const { sb, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  if (!open) return <button className="ghost" onClick={() => setOpen(true)}>Reset password</button>;
  return (
    <form className="inline-form" onSubmit={async (e) => {
      e.preventDefault();
      try { await adminApi(sb, { action: "reset", userId: m.id, password: pw }); toast(`Password reset. Tell ${m.full_name.split(" ")[0]} the new one.`); setOpen(false); setPw(""); }
      catch (err) { toast(err.message); }
    }}>
      <input value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required placeholder="New password" aria-label={"New password for " + m.full_name} />
      <button>Save</button><button type="button" className="ghost" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

export function Classmates() {
  const { sb, uid, me, setMe, members, loadMembers, isAdmin, settings: st, toast } = useApp();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const approvedList = members.filter((m) => m.approved || m.is_admin);
  const pending = members.filter((m) => !m.approved && !m.is_admin);
  const shown = (isAdmin ? members : approvedList).filter((m) => !q || [m.full_name, m.matric, m.department].join(" ").toLowerCase().includes(q.toLowerCase()));

  async function saveProfile(e) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k) => String(f.get(k) || "").trim();
    setBusy(true);
    const patch = { full_name: g("fullName"), department: g("department"), level: g("level"), role: g("role"), phone: g("phone").replace(/[^\d+ ]/g, "") };
    const { data, error } = await sb.from("profiles").update(patch).eq("id", uid).select().single();
    setBusy(false);
    if (error) return toast("Couldn't save. Try again.");
    setMe(data); loadMembers(); toast("Profile saved");
  }
  const setFlag = async (m, patch, ok) => {
    const { error } = await sb.from("profiles").update(patch).eq("id", m.id);
    if (error) toast("Couldn't save. Try again."); else { toast(ok); loadMembers(); }
  };
  const remove = async (m) => { try { await adminApi(sb, { action: "remove", userId: m.id }); toast("Removed"); loadMembers(); } catch (err) { toast(err.message); } };

  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "class")}</h2><span className="muted">{approvedList.length} approved{isAdmin && ` · ${pending.length} waiting`}</span></div>

      {isAdmin && pending.length > 0 && (
        <section className="panel list"><h3>Waiting for approval ({pending.length})</h3>
          <p className="hint" style={{ margin: 0 }}>Approve only people you know are in this class.</p>
          {pending.map((m) => (
            <div className="pend" key={m.id}>
              <div><b>{m.full_name}</b> <span className="mono">{m.matric}</span><div className="muted small">{m.department} · {m.level}</div></div>
              <div className="actions">
                <button className="ghost" onClick={() => setFlag(m, { approved: true }, "Approved")}>Approve</button>
                <ConfirmButton onConfirm={() => remove(m)}>Remove</ConfirmButton>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="panel"><h3 style={{ marginBottom: 12 }}>Your class profile</h3>
        <form onSubmit={saveProfile}>
          <div className="row">
            <label>Full name<input name="fullName" required maxLength={80} defaultValue={me.full_name} /></label>
            <label>Matric number <span className="hint">ask a class rep to change it</span><input value={me.matric} disabled className="mono" /></label>
          </div>
          <div className="row">
            <label>Department<select name="department" defaultValue={me.department}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label>Level<select name="level" defaultValue={me.level}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label>Role<select name="role" defaultValue={me.role}>{ROLES.map((l) => <option key={l}>{l}</option>)}</select></label>
          </div>
          <label>WhatsApp / phone <span className="hint">optional · visible to classmates</span><input name="phone" maxLength={20} defaultValue={me.phone} inputMode="tel" /></label>
          <button disabled={busy}>Save changes</button>
        </form>
      </section>

      <label>Search classmates<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, matric number or department" /></label>
      <div className="members">
        {shown.map((m) => {
          const wa = waLink(m.phone);
          return (
            <div className="member" key={m.id}>
              <Avatar person={m} size={44} />
              <div>
                <div className="nm">{m.full_name}{m.id === uid && <span className="muted"> (you)</span>}</div>
                <div className="muted small"><span className="mono">{m.matric}</span> · {m.level}
                  {m.role !== "Student" && <> · <span className="chip gold">{m.role}</span></>}
                  {m.is_admin && <> · <span className="chip">ADMIN</span></>}
                  {!m.approved && !m.is_admin && <> · <span className="chip gold">PENDING</span></>}</div>
                <div className="muted small">{m.department}</div>
                {wa && m.id !== uid && <div className="actions" style={{ marginTop: 4 }}><a href={wa} target="_blank" rel="noopener noreferrer">Chat or call on WhatsApp ↗</a></div>}
                {isAdmin && m.id !== uid && (
                  <div className="actions" style={{ marginTop: 6 }}>
                    <ResetPassword m={m} />
                    <button className="ghost" onClick={() => setFlag(m, { is_admin: !m.is_admin }, m.is_admin ? "No longer a class rep admin" : "Made a class rep admin")}>{m.is_admin ? "Remove admin" : "Make admin"}</button>
                    <ConfirmButton onConfirm={() => remove(m)}>Remove</ConfirmButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!shown.length && <p className="empty">No one matches.</p>}
      </div>
    </>
  );
}

export function Manage() {
  const { sb, isAdmin, settings: st, setSettings, toast } = useApp();
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return <div className="notice">Only class reps can manage the site.</div>;
  const pn = st.pageNames || {};

  async function save(e) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const g = (k) => String(f.get(k) || "").trim();
    const pageNames = {};
    PAGES.forEach(([k]) => { const v = g("page_" + k); if (v) pageNames[k] = v; });
    const links = g("links").split("\n").map((l) => { const i = l.lastIndexOf("|"); return i < 0 ? null : { label: l.slice(0, i).trim(), url: l.slice(i + 1).trim() }; })
      .filter((l) => l && l.label && safeUrl(l.url));
    const data = {
      ...st, className: g("className"), setName: g("setName"), session: g("session"), level: g("level"),
      school: g("school"), faculty: g("faculty"), department: g("department"), matricPrefixes: g("prefixes") || DEFAULT_PREFIXES,
      welcomeMessage: g("welcome"), groupLink: safeUrl(g("groupLink")), groupLabel: g("groupLabel"), pageNames, links,
    };
    setBusy(true);
    const { error } = await sb.from("settings").update({ data }).eq("id", 1);
    setBusy(false);
    if (error) return toast("Couldn't save settings.");
    setSettings(data); toast("Site settings saved");
  }

  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "manage")}</h2></div>
      <form className="panel" onSubmit={save}>
        <h3>Class details</h3>
        <div className="row">
          <label>Class name<input name="className" maxLength={80} defaultValue={st.className} /></label>
          <label>Set / graduating class<input name="setName" maxLength={40} defaultValue={st.setName} placeholder="Class of 2027" /></label>
          <label>Session<input name="session" maxLength={20} defaultValue={st.session} placeholder="2026/2027" /></label>
          <label>Level<input name="level" maxLength={20} defaultValue={st.level} placeholder="300L" /></label>
        </div>
        <div className="row">
          <label>School<input name="school" maxLength={80} defaultValue={st.school || "University of Benin"} /></label>
          <label>Faculty<input name="faculty" maxLength={80} defaultValue={st.faculty || "Faculty of Education"} /></label>
          <label>Department<input name="department" maxLength={80} defaultValue={st.department} /></label>
        </div>
        <label>Allowed matric numbers <span className="hint">prefixes separated by commas, e.g. EDU24, B1. Numbers must look like EDU24***** or B1******.</span>
          <input name="prefixes" className="mono" maxLength={80} defaultValue={st.matricPrefixes || DEFAULT_PREFIXES} /></label>
        <h3>Welcome message</h3>
        <label>Shown after every sign-up and login <span className="hint">{"{name}"} becomes the student's name, {"{class}"} the class name</span>
          <textarea name="welcome" maxLength={600} defaultValue={st.welcomeMessage || DEFAULT_WELCOME} /></label>
        <div className="row">
          <label>Class group link <span className="hint">WhatsApp or Telegram invite link</span><input name="groupLink" type="url" maxLength={300} placeholder="https://chat.whatsapp.com/…" defaultValue={st.groupLink} /></label>
          <label>Button text<input name="groupLabel" maxLength={40} placeholder="Join our class group" defaultValue={st.groupLabel} /></label>
        </div>
        <h3>Page names</h3>
        <div className="row">{PAGES.map(([k, d]) => <label key={k}>{d}<input name={"page_" + k} maxLength={40} defaultValue={pn[k] || ""} placeholder={d} /></label>)}</div>
        <h3>School links</h3>
        <label>One link per line: Name | https://address
          <textarea name="links" className="mono tall" defaultValue={(st.links || []).map((l) => `${l.label} | ${l.url}`).join("\n")} /></label>
        <button disabled={busy}>{busy ? "Saving…" : "Save site settings"}</button>
      </form>
    </>
  );
}
