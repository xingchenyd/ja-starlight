/* eslint-disable @next/next/no-img-element, jsx-a11y/media-has-caption */
"use client";
import { useState } from "react";
export default function PublicationImages({ cover, coverType, gallery, onCover, onGallery, upload, onBusy }: { cover: string; coverType: string; gallery: string[]; onCover: (url: string, type: string) => void; onGallery: (urls: string[]) => void; upload: (file: File) => Promise<{ url: string | null; type: string } | null>; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async (files: File[], isCover: boolean) => {
    if (!files.length || busy) return;
    if (!isCover && gallery.length + files.length > 12) { setError("活动配图最多12张，请减少选择数量"); return; }
    setBusy(true); onBusy(true); setError("");
    const added: string[] = [];
    try {
      for (const file of files) {
        const result = await upload(file);
        if (!result?.url) throw new Error(`“${file.name}”上传失败，请重试`);
        if (isCover) onCover(result.url, result.type.startsWith("video/") ? "video" : "image");
        else { added.push(result.url); onGallery([...gallery, ...added]); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "上传失败，请重试"); }
    finally { setBusy(false); onBusy(false); }
  };
  return <section className="publication-images full"><h2>添加图片</h2><p>封面用于活动列表；活动配图会展示在介绍下方。已上传的图片可移除或调整顺序。</p>
    {error && <p role="alert" className="field-error">{error}</p>}
    <label className="media-upload">活动封面<input disabled={busy} type="file" accept="image/*,video/mp4,video/webm" onChange={e => { void send(Array.from(e.target.files || []), true); e.target.value = ""; }} /></label>
    {cover && <div className="publication-cover-preview">{coverType === "video" ? <video controls src={cover} /> : <img src={cover} alt="活动封面预览" />}<button type="button" className="secondary-btn" disabled={busy} onClick={() => onCover("", "image")}>移除封面</button></div>}
    <label className="media-upload">活动配图（可一次选择多张，最多12张）<input disabled={busy} type="file" accept="image/*" multiple onChange={e => { void send(Array.from(e.target.files || []), false); e.target.value = ""; }} /></label>
    <div className="publication-gallery">{gallery.map((url, i) => <figure key={`${url}-${i}`}><img src={url} alt={`活动配图${i + 1}`} /><figcaption><span>配图 {i + 1}</span><button type="button" disabled={busy || !i} aria-label={`前移配图${i + 1}`} onClick={() => { const next = [...gallery]; [next[i], next[i - 1]] = [next[i - 1], next[i]]; onGallery(next); }}>←</button><button type="button" disabled={busy || i === gallery.length - 1} aria-label={`后移配图${i + 1}`} onClick={() => { const next = [...gallery]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; onGallery(next); }}>→</button><button type="button" disabled={busy} onClick={() => onGallery(gallery.filter((_, j) => i !== j))}>移除</button></figcaption></figure>)}</div>
    {busy && <p role="status">正在上传，请等待完成后发布…</p>}
  </section>;
}
