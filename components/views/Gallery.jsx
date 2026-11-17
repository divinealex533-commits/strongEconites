"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../App";
import { ConfirmButton, pageNameOf } from "./Main";
import { shrinkImage } from "@/lib/image";
import { fmtDate } from "@/lib/shared";
import Avatar from "../Avatar";

// Loads gallery rows plus short-lived links to view each photo.
export function useGallery(limit = 120) {
  const { sb } = useApp();
  const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const { data, error } = await sb.from("gallery").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error || !data) { setItems([]); return; }
    if (!data.length) { setItems([]); return; }
    const { data: urls } = await sb.storage.from("gallery").createSignedUrls(data.map((d) => d.path), 60 * 60 * 6);
    const byPath = new Map((urls || []).map((u) => [u.path, u.signedUrl]));
    setItems(data.map((d) => ({ ...d, url: byPath.get(d.path) || "" })));
  }, [sb, limit]);
  useEffect(() => { load(); }, [load]);
  return [items, load];
}

export function GalleryUpload({ onDone, compact = false }) {
  const { sb, uid, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  async function submit(e) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const file = f.get("photo");
    if (!file || !file.size) return toast("Choose a photo first.");
    setBusy(true);
    try {
      const blob = await shrinkImage(file);
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const up = await sb.storage.from("gallery").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw new Error("Upload failed. Check your data and try again.");
      const { error } = await sb.from("gallery").insert({ user_id: uid, path, caption: String(f.get("caption") || "").trim().slice(0, 200) });
      if (error) { await sb.storage.from("gallery").remove([path]); throw new Error("Couldn't save the photo."); }
      form.reset(); setPreview(""); toast("Photo added to the class gallery"); onDone && onDone();
    } catch (err) { toast(err.message); }
    finally { setBusy(false); }
  }
  return (
    <form className={"upload" + (compact ? " compact" : "")} onSubmit={submit}>
      <label className="dropzone">
        {preview ? <img src={preview} alt="Selected photo" /> : <span><b>Tap to choose a photo</b><span className="hint">From your gallery or camera</span></span>}
        <input name="photo" type="file" accept="image/*" className="sr"
          onChange={(e) => { const file = e.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : ""); }} />
      </label>
      <label>Caption <span className="hint">optional</span><input name="caption" maxLength={200} placeholder="e.g. SSE 221 group presentation" /></label>
      <button disabled={busy}>{busy ? "Uploading…" : "Add to gallery"}</button>
    </form>
  );
}

export default function Gallery() {
  const { uid, canPost, members, settings: st, sb, toast } = useApp();
  const [items, reload] = useGallery();
  const [view, setView] = useState(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const del = async (it) => {
    await sb.storage.from("gallery").remove([it.path]);
    const { error } = await sb.from("gallery").delete().eq("id", it.id);
    if (error) toast("Couldn't delete."); else { setView(null); reload(); }
  };
  return (
    <>
      <div className="pagehead"><h2>{pageNameOf(st, "gallery")}</h2><span className="muted">{items ? items.length : "…"} photos</span></div>
      <details className="add"><summary>Add a photo</summary><GalleryUpload onDone={reload} /></details>
      {items === null ? <p className="muted">Loading photos…</p> : !items.length ? <p className="empty">No photos yet. Add the first one.</p> : (
        <div className="gallery">
          {items.map((it) => (
            <button key={it.id} className="tile" onClick={() => setView(it)} aria-label={it.caption || "Open photo"}>
              <img src={it.url} alt={it.caption || "Class photo"} loading="lazy" />
              {it.caption && <span className="cap">{it.caption}</span>}
            </button>
          ))}
        </div>
      )}
      {view && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setView(null); }}>
          <figure>
            <img src={view.url} alt={view.caption || "Class photo"} />
            <figcaption>
              <span className="who-row"><Avatar person={byId.get(view.user_id)} size={28} /> {byId.get(view.user_id)?.full_name || "Classmate"} · {fmtDate(view.created_at)}</span>
              {view.caption && <p>{view.caption}</p>}
              <div className="actions">
                <button className="ghost" onClick={() => setView(null)} autoFocus>Close</button>
                {(view.user_id === uid || canPost) && <ConfirmButton onConfirm={() => del(view)} />}
              </div>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
