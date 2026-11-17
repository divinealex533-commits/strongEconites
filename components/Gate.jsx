"use client";
import { useRef, useState } from "react";
import { useApp } from "./App";
import { burst } from "@/lib/confetti";
import { DEPTS, LEVELS, DEFAULT_PREFIXES, matricOk, matricEmail, normMatric } from "@/lib/shared";

function Intro({ mode, onOpen, className }) {
  const [tossed, setTossed] = useState(false);
  const btn = useRef(null);
  const login = mode === "login";
  const tap = () => {
    if (tossed) return;
    setTossed(true);
    const r = btn.current.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 3);
    setTimeout(onOpen, 650);
  };
  return (
    <div className="intro">
      <div className="board" aria-hidden="true">
        <svg viewBox="0 0 320 190" className="chalk-graph">
          <path className="ax" d="M40 20 V160 H300" />
          <text x="22" y="28">P</text><text x="296" y="178">Q</text>
          <path className="dl" d="M60 40 C140 90 200 120 280 150" /><text x="282" y="146" className="lbl">D</text>
          <path className="sl" d="M60 150 C140 120 200 90 280 40" /><text x="282" y="40" className="lbl">S</text>
          <circle className="eq" cx="170" cy="96" r="6" /><text x="180" y="88" className="lbl eqt">E</text>
        </svg>
        <div className="chalk">{login ? "Welcome back, Econite." : `Welcome to ${className}.`}</div>
        <div className="chalk small">Where demand meets supply, the class meets.</div>
      </div>
      <button ref={btn} type="button" className={"capbtn" + (tossed ? " tossed" : "")} onClick={tap}
        aria-label={login ? "Open the login form" : "Open the sign-up form"}>
        <img src="/logo.jpg" alt="" width="132" height="132" /><span className="tapme">Tap me</span>
      </button>
      <p className="intro-hint">Tap the cap to {login ? "log in" : "sign up"}</p>
    </div>
  );
}

export default function Gate() {
  const { sb, settings, toast, showWelcome } = useApp();
  const [mode, setMode] = useState("login");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cls = settings.className || "SSE ECONITES";
  const prefixes = settings.matricPrefixes || DEFAULT_PREFIXES;
  const prefixText = prefixes.split(",").map((s) => s.trim()).join(" or ");

  const switchTo = (m) => { setMode(m); setOpen(false); };

  async function signUp(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const matric = normMatric(f.get("matric"));
    if (!matricOk(matric, prefixes)) return toast("That matric number isn't allowed. Use your UNIBEN number, e.g. EDU24***** or B1******.");
    if (f.get("password") !== f.get("password2")) return toast("The two passwords don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: f.get("fullName"), matric, department: f.get("department"), level: f.get("level"),
          phone: f.get("phone"), password: f.get("password"),
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { toast(out.error || "Couldn't create your account."); return; }
      const { error } = await sb.auth.signInWithPassword({ email: matricEmail(matric), password: String(f.get("password")) });
      if (error) { toast("Account created. Log in with your matric number and password."); switchTo("login"); return; }
      showWelcome();
    } catch { toast("Network problem. Check your data and try again."); }
    finally { setBusy(false); }
  }

  async function logIn(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const matric = normMatric(f.get("matric"));
    if (!/^(EDU|B1)/.test(matric) || !matricOk(matric, prefixes)) return toast("Log in with your UNIBEN matric number, e.g. EDU24***** or B1******.");
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: matricEmail(matric), password: String(f.get("password")) });
    setBusy(false);
    if (error) return toast(/network|fetch/i.test(error.message) ? "Network problem. Try again." : "Matric number or password is wrong.");
    showWelcome();
  }

  return (
    <div className={"gate-shell" + (open ? " open" : "")}>
      <Intro key={mode} mode={mode} className={cls} onOpen={() => setOpen(true)} />
      <div className="gate-reveal">
        {mode === "signup" ? (
          <section className="gate">
            <div className="gatecopy">
              <span className="label">Students only</span>
              <h2>Join {cls}</h2>
              <p>Sign up with your UNIBEN matric number. Numbers must start with {prefixText}, like EDU24***** or B1******. A course rep confirms you before you can chat.</p>
              <p>Already have an account? <button type="button" className="linkbtn" onClick={() => switchTo("login")}>Log in</button></p>
            </div>
            <form className="panel" onSubmit={signUp}>
              <div className="row">
                <label>Full name<input name="fullName" required maxLength={80} placeholder="Surname First Middle" autoComplete="name" /></label>
                <label>Matric number<input name="matric" required maxLength={20} placeholder="EDU24*****" className="mono" autoCapitalize="characters" autoComplete="username" /></label>
              </div>
              <div className="row">
                <label>Department<select name="department" defaultValue="Social Science Education">{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></label>
                <label>Level<select name="level">{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
              </div>
              <label>WhatsApp number <span className="hint">optional · lets classmates call you</span><input name="phone" maxLength={20} inputMode="tel" /></label>
              <div className="row">
                <label>Create a password<input name="password" type="password" required minLength={6} autoComplete="new-password" /></label>
                <label>Confirm password<input name="password2" type="password" required minLength={6} autoComplete="new-password" /></label>
              </div>
              <button disabled={busy}>{busy ? "Creating account…" : "Create my account"}</button>
              <p className="hint" style={{ margin: 0 }}>Use a new password, not your Kofa or email password.</p>
            </form>
          </section>
        ) : (
          <section className="gate narrow">
            <div className="gatecopy"><span className="label">Students only</span><h2>Log in to {cls}</h2></div>
            <form className="panel" onSubmit={logIn}>
              <label>Matric number<input name="matric" required className="mono" placeholder="EDU24*****" autoCapitalize="characters" autoComplete="username" /></label>
              <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
              <button disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
              <p className="hint" style={{ margin: 0 }}>Forgot your password? Ask the site admin to reset it for you.</p>
              <p style={{ margin: 0 }}>New here? <button type="button" className="linkbtn big" onClick={() => switchTo("signup")}>Create an account</button></p>
            </form>
          </section>
        )}
      </div>
      {!open && (
        <p className="intro-switch">
          {mode === "login"
            ? <>New to {cls}? <button type="button" className="linkbtn big" onClick={() => switchTo("signup")}>Sign up instead</button></>
            : <>Have an account? <button type="button" className="linkbtn big" onClick={() => switchTo("login")}>Log in instead</button></>}
        </p>
      )}
    </div>
  );
}
