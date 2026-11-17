"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PAGES } from "@/lib/shared";
import Header from "./Header";
import Gate from "./Gate";
import Welcome from "./Welcome";
import { Home, News, Timetable, Notes, Links } from "./views/Main";
import { Dashboard, Gpa } from "./views/Me";
import Chat from "./views/Chat";
import Study from "./views/Study";
import { Classmates, Manage } from "./views/Admin";
import Gallery from "./views/Gallery";
import About from "./views/About";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function useHashRoute() {
  const read = () => {
    if (typeof window === "undefined") return "home";
    const h = window.location.hash.slice(1);
    return PAGES.some((p) => p[0] === h) ? h : "home";
  };
  const [route, setRoute] = useState("home");
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export default function App({ aiEnabled }) {
  const sb = supabase();
  const route = useHashRoute();
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [settings, setSettings] = useState({});
  const [me, setMe] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [members, setMembers] = useState([]);
  const [ann, setAnn] = useState([]);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [dash, setDash] = useState({ done: {}, courses: [], quizzes: [] });
  const [toastMsg, setToastMsg] = useState("");
  const [welcome, setWelcome] = useState(false);

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => setToastMsg(""), 3400);
  }, []);

  // settings are public (header, sign-up screen)
  const loadSettings = useCallback(async () => {
    const { data } = await sb.from("settings").select("data").eq("id", 1).single();
    if (data) setSettings(data.data || {});
  }, [sb]);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const uid = session?.user?.id || null;

  const loadMe = useCallback(async () => {
    if (!uid) { setMe(null); setMeLoaded(true); return; }
    const { data } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
    setMe(data || null); setMeLoaded(true);
  }, [sb, uid]);
  useEffect(() => { setMeLoaded(false); loadMe(); }, [loadMe]);

  // hear approval changes live
  useEffect(() => {
    if (!uid) return;
    const ch = sb.channel("me-" + uid)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, (p) => setMe(p.new))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, uid]);

  const member = Boolean(me && (me.approved || me.is_admin));
  const isAdmin = Boolean(me?.is_admin);

  const loadMembers = useCallback(async () => {
    const { data } = await sb.from("profiles").select("*").order("full_name");
    setMembers(data || []);
  }, [sb]);
  const loadContent = useCallback(async () => {
    const [a, e, n] = await Promise.all([
      sb.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(200),
      sb.from("events").select("*").limit(500),
      sb.from("notes").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    setAnn(a.data || []); setEvents(e.data || []); setNotes(n.data || []);
  }, [sb]);
  const loadDash = useCallback(async () => {
    if (!uid) return;
    const { data } = await sb.from("private_dash").select("data").eq("user_id", uid).maybeSingle();
    const d = data?.data || {};
    setDash({ done: d.done || {}, courses: d.courses || [], quizzes: d.quizzes || [] });
  }, [sb, uid]);

  useEffect(() => {
    if (!member) return;
    loadMembers(); loadContent(); loadDash();
    const refresh = () => { if (document.visibilityState === "visible") { loadContent(); loadMembers(); } };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [member, loadMembers, loadContent, loadDash]);

  const saveDash = useCallback(async (next) => {
    setDash(next);
    const { error } = await sb.from("private_dash").upsert({ user_id: uid, data: next, updated_at: new Date().toISOString() });
    if (error) toast("Couldn't save to your dashboard.");
  }, [sb, uid, toast]);

  const logout = useCallback(async () => {
    await sb.auth.signOut();
    setMe(null); setMembers([]); setAnn([]); setEvents([]); setNotes([]);
    window.location.hash = "home";
  }, [sb]);

  const value = useMemo(() => ({
    sb, aiEnabled, session, uid, me, setMe, loadMe, isAdmin, member, settings, setSettings, loadSettings,
    members, loadMembers, ann, events, notes, loadContent, dash, saveDash, toast, route, logout,
    showWelcome: () => setWelcome(true),
  }), [sb, aiEnabled, session, uid, me, loadMe, isAdmin, member, settings, loadSettings, members, loadMembers,
    ann, events, notes, loadContent, dash, saveDash, toast, route, logout]);

  let body;
  if (session === undefined || (session && !meLoaded)) {
    body = <section className="gate narrow"><p className="muted">Loading your class…</p></section>;
  } else if (!session) {
    body = <Gate />;
  } else if (!me) {
    body = (
      <section className="gate narrow"><div className="gatecopy"><h2>Account not found</h2>
        <p>This login has no class profile. Log out and sign up again with your matric number.</p></div>
        <button onClick={logout}>Log out</button></section>
    );
  } else if (!member) {
    body = <Pending />;
  } else {
    const V = { home: Home, me: Dashboard, chat: Chat, study: Study, gpa: Gpa, news: News, timetable: Timetable,
      class: Classmates, notes: Notes, links: Links, manage: Manage, gallery: Gallery, about: About }[route] || Home;
    body = <V />;
  }

  return (
    <Ctx.Provider value={value}>
      <Header showNav={Boolean(session && member)} />
      <main><div className="wrap" id="view">{body}</div></main>
      {welcome && me && <Welcome onClose={() => setWelcome(false)} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  );
}

function Pending() {
  const { me, settings, logout, showWelcome } = useApp();
  return (
    <section className="gate narrow">
      <div className="gatecopy">
        <span className="label">Almost in</span>
        <h2>Hi {String(me.full_name).split(" ").slice(-1)[0]}, you're signed up</h2>
        <p>A class rep needs to confirm you're in {settings.className || "SSE ECONITES"} before you can see the chat, timetable and notes. This page updates by itself once you're approved.</p>
      </div>
      <div className="panel list">
        <div><b>{me.full_name}</b> <span className="mono">{me.matric}</span></div>
        <div className="muted">{me.department} · {me.level}</div>
        <div className="actions">
          <button className="ghost" onClick={showWelcome}>Open welcome message</button>
          <button className="danger" onClick={logout}>Log out</button>
        </div>
      </div>
    </section>
  );
}
