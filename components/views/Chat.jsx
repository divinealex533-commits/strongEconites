"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../App";
import { pageNameOf } from "./Main";

export default function Chat() {
  const { sb, uid, me, members, isAdmin, settings: st, toast } = useApp();
  const [msgs, setMsgs] = useState([]);
  const [online, setOnline] = useState({});
  const [text, setText] = useState("");
  const [status, setStatus] = useState("connecting");
  const box = useRef(null);
  const chan = useRef(null);
  const typingTimer = useRef(null);
  const nameOf = useMemo(() => { const m = new Map(members.map((p) => [p.id, p.full_name])); return (id) => m.get(id) || "Classmate"; }, [members]);

  // history + live inserts/deletes
  useEffect(() => {
    let alive = true;
    sb.from("messages").select("*").order("created_at", { ascending: false }).limit(200).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setStatus("error"); return; }
      setMsgs((data || []).reverse());
    });
    const ch = sb.channel("class-chat", { config: { presence: { key: uid } } });
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
      setMsgs((cur) => (cur.some((m) => m.id === p.new.id) ? cur : [...cur.filter((m) => !(m.pending && m.user_id === p.new.user_id && m.body === p.new.body)), p.new].slice(-300)));
    })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => setMsgs((cur) => cur.filter((m) => m.id !== p.old.id)))
      .on("presence", { event: "sync" }, () => setOnline({ ...ch.presenceState() }))
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") { setStatus("live"); await ch.track({ typing: false, at: Date.now() }); }
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
      });
    chan.current = ch;
    return () => { alive = false; sb.removeChannel(ch); };
  }, [sb, uid]);

  // keep scrolled to the newest message when already near the bottom
  useEffect(() => {
    const el = box.current; if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [msgs]);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, []);

  const setTyping = (on) => { chan.current?.track({ typing: on, at: Date.now() }).catch(() => {}); };

  async function send(e) {
    e?.preventDefault();
    const body = text.trim(); if (!body) return;
    setText(""); clearTimeout(typingTimer.current); setTyping(false);
    const temp = { id: "tmp-" + Date.now(), user_id: uid, body, created_at: new Date().toISOString(), pending: true };
    setMsgs((cur) => [...cur, temp]);
    const { error } = await sb.from("messages").insert({ user_id: uid, body });
    if (error) { setMsgs((cur) => cur.filter((m) => m.id !== temp.id)); setText(body); toast("Message not sent. Check your connection."); }
  }
  async function remove(id) {
    const { error } = await sb.from("messages").delete().eq("id", id);
    if (error) toast("Couldn't delete that message."); else setMsgs((cur) => cur.filter((m) => m.id !== id));
  }

  const onlineIds = Object.keys(online);
  const typers = onlineIds.filter((id) => id !== uid && online[id].some((p) => p.typing)).map(nameOf);
  let lastDay = "";

  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "chat")}</h2>
        <span className="muted">{status === "live" ? "Live" : status === "error" ? "Reconnecting…" : "Connecting…"}</span></div>
      <div className="online"><span className="dot" /><b>{onlineIds.length}</b> online{onlineIds.length > 0 && ": " + onlineIds.map((id) => (id === uid ? "you" : nameOf(id))).join(", ")}
        {typers.length > 0 && <span className="typing"> · {typers.slice(0, 3).join(", ")} {typers.length > 1 ? "are" : "is"} typing…</span>}</div>
      <section className="chatbox">
        <div className="msgs" ref={box} aria-live="polite">
          {!msgs.length && <p className="empty center">No messages yet. Say hello to the class.</p>}
          {msgs.map((m) => {
            const d = new Date(m.created_at), day = d.toDateString(), mine = m.user_id === uid;
            const sep = day !== lastDay; lastDay = day;
            return (
              <div key={m.id} style={{ display: "contents" }}>
                {sep && <div className="daysep">{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</div>}
                <div className={"msg" + (mine ? " mine" : "") + (m.pending ? " pending" : "")}>
                  {!mine && <span className="from">{nameOf(m.user_id)}</span>}
                  <p>{m.body}</p>
                  <span className="tm">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{m.pending ? " · sending" : ""}
                    {!m.pending && (mine || isAdmin) && <> · <button className="linkbtn" onClick={() => remove(m.id)}>delete</button></>}</span>
                </div>
              </div>
            );
          })}
        </div>
        <form className="composer" onSubmit={send}>
          <label className="sr" htmlFor="chatText">Message</label>
          <textarea id="chatText" rows={1} maxLength={1000} placeholder={`Message ${st.className || "the class"}`} value={text}
            onChange={(e) => { setText(e.target.value); setTyping(true); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 2500); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
          <button disabled={!text.trim()}>Send</button>
        </form>
      </section>
      <p className="hint">To call a classmate, use their WhatsApp link on the {pageNameOf(st, "class")} page. Signed in as {me.matric}.</p>
    </>
  );
}
