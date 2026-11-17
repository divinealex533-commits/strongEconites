"use client";
import { useEffect, useRef } from "react";
import { useApp } from "./App";
import { burst } from "@/lib/confetti";
import { DEFAULT_WELCOME, firstName, safeUrl } from "@/lib/shared";

export default function Welcome({ onClose }) {
  const { me, settings: st, isAdmin } = useApp();
  const card = useRef(null);
  const first = firstName(me.full_name);
  const msg = (st.welcomeMessage || DEFAULT_WELCOME).replace(/\{name\}/g, first).replace(/\{class\}/g, st.className || "SSE ECONITES");
  const link = safeUrl(st.groupLink);

  useEffect(() => {
    const r = card.current.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + 40);
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welTitle" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="welcome-card" ref={card}>
        <img src="/logo.jpg" alt="" width="96" height="96" />
        <span className="label">{me.matric}</span>
        <h2 id="welTitle">Welcome, {first}!</h2>
        <p>{msg}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          {link && <a className="btnlink" href={link} target="_blank" rel="noopener noreferrer">{st.groupLabel || "Join our class group"} ↗</a>}
          <button className="ghost" onClick={onClose} autoFocus={!link}>{link ? "Later" : "Let's go"}</button>
        </div>
        {!link && isAdmin && <p className="hint">Add your class group link on Manage Site and it will show here.</p>}
      </div>
    </div>
  );
}
