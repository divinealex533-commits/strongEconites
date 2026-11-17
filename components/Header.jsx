"use client";
import { useApp } from "./App";
import { PAGES } from "@/lib/shared";

const WORDS = ["DEMAND", "SUPPLY", "ELASTICITY", "OPPORTUNITY COST", "GDP", "INFLATION", "LESSON PLAN", "PEDAGOGY",
  "MICRO · MACRO", "SOCIAL STUDIES", "₦ NAIRA", "BLOOM'S TAXONOMY"];

export default function Header({ showNav }) {
  const { settings: st, me, isAdmin, route, logout } = useApp();
  const pageName = (k) => st.pageNames?.[k] || PAGES.find((p) => p[0] === k)[1];
  const school = [st.school || "University of Benin", st.faculty || "Faculty of Education", st.department].filter(Boolean).join(" · ");
  return (
    <>
      <header className="mast">
        <div className="mast-bars" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
        <div className="wrap mast-in">
          <img className="crest" src="/logo.jpg" alt="ECONITES logo" width="88" height="88" />
          <div className="mast-text">
            <div className="school">{school}</div>
            <h1 id="className">{st.className || "SSE ECONITES"}</h1>
            <div className="set">
              {st.setName && <span className="tag">{st.setName}</span>}
              {st.session && <span className="tag ghost">{st.session} session</span>}
              {st.level && <span className="tag ghost">{st.level}</span>}
            </div>
          </div>
          {me && (
            <div className="who">
              <span className="avatar-sm">{String(me.full_name || "?").charAt(0).toUpperCase()}</span>
              <span><span className="mono">{me.matric}</span>{isAdmin && <> · <span className="mono">ADMIN</span></>}</span>
              <button className="ghost light" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
        <div className="ticker" aria-hidden="true">
          <div className="ticker-run">{[...WORDS, ...WORDS].map((w, i) => <span key={i}>{w}</span>)}</div>
        </div>
      </header>
      {showNav && (
        <div className="rail"><div className="wrap"><nav aria-label="Pages">
          {PAGES.filter((p) => p[0] !== "manage" || isAdmin).map(([k]) => (
            <a key={k} href={"#" + k} aria-current={k === route ? "page" : undefined}>{pageName(k)}</a>
          ))}
        </nav></div></div>
      )}
    </>
  );
}
