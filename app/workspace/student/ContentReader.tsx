/* eslint-disable @next/next/no-img-element, jsx-a11y/media-has-caption */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentItem, RichBlock } from "../../data";
import { Dialog } from "../../components/ui";
import { studentRequest } from "./useStudentData";

type ContentComment = { id: string; author: string; text: string; reply?: string; repliedBy?: string; createdAt?: string; mine?: boolean };

function Block({ block }: { block: RichBlock }) {
  if (block.type === "heading") return <h2>{block.title}</h2>;
  if (block.type === "image" && block.url) return <figure><img src={block.url} alt={block.caption || block.title || "内容图片"} />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  if (block.type === "gallery" && block.items?.length) return <figure><div className="content-reader-gallery">{block.items.map((url) => <img key={url} src={url} alt={block.caption || "内容图集"} />)}</div>{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  if (block.type === "video" && block.url) return <video controls preload="metadata" src={block.url} />;
  if (block.type === "quote") return <blockquote>{block.text}</blockquote>;
  if (block.type === "card") return <aside className="content-reader-callout"><b>{block.title}</b><p>{block.text}</p></aside>;
  if (block.type === "agenda") return <div className="content-reader-agenda"><b>{block.title}</b><p>{block.text}</p></div>;
  if (block.type === "attachment" && block.url) return <a className="content-reader-attachment" href={block.url} target="_blank" rel="noreferrer">{block.title || "查看附件"} ↗</a>;
  return <p>{block.text || block.title}</p>;
}

export default function ContentReader({ item, open, onClose, flash }: { item: ContentItem | null; open: boolean; onClose: () => void; flash: (message: string) => void }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeSaving, setLikeSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const submittingRef = useRef(false);
  const lastSubmitted = useRef("");

  useEffect(() => {
    if (!item || !open) return;
    let active = true;
    studentRequest(`/api/social?contentId=${encodeURIComponent(item.id)}`)
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (!active) return;
        if (!ok) throw new Error(payload.error || "互动数据加载失败");
        setLiked(Boolean(payload.liked)); setLikeCount(Number(payload.likeCount || 0)); setComments(payload.comments || []);
      })
      .catch((error) => { if (active) flash(error instanceof Error ? error.message : "互动数据加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [flash, item, open]);

  const toggleLike = async () => {
    if (!item || likeSaving) return;
    const rollback = { liked, likeCount };
    const optimistic = !liked;
    setLiked(optimistic); setLikeCount((count) => Math.max(0, count + (optimistic ? 1 : -1))); setLikeSaving(true);
    try {
      const response = await studentRequest("/api/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "toggle-like", contentId: item.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "点赞失败");
      setLiked(Boolean(payload.liked)); setLikeCount(Number(payload.likeCount || 0));
    } catch (error) {
      setLiked(rollback.liked); setLikeCount(rollback.likeCount); flash(error instanceof Error ? error.message : "点赞失败");
    } finally { setLikeSaving(false); }
  };

  const addComment = async () => {
    if (!item || submittingRef.current) return;
    const text = draft.trim();
    if (text.length < 2) return;
    if (text === lastSubmitted.current) return flash("这条评论刚刚已经提交");
    submittingRef.current = true; setCommentSaving(true);
    try {
      const response = await studentRequest("/api/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add-comment", contentId: item.id, text }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "评论发布失败");
      lastSubmitted.current = text; setComments((current) => [payload.comment, ...current]); setDraft(""); flash("评论已发布");
    } catch (error) { flash(error instanceof Error ? error.message : "评论发布失败"); }
    finally { submittingRef.current = false; setCommentSaving(false); }
  };

  const removeComment = async (comment: ContentComment) => {
    if (!comment.mine) return;
    const previous = comments;
    setComments((current) => current.filter((entry) => entry.id !== comment.id));
    try {
      const response = await studentRequest(`/api/social?commentId=${encodeURIComponent(comment.id)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "评论删除失败");
    } catch (error) { setComments(previous); flash(error instanceof Error ? error.message : "评论删除失败"); }
  };

  return <Dialog open={open && Boolean(item)} title={item?.title || "成长内容"} description={item ? `${item.publisher || "星光计划"} · ${item.category} · ${item.duration}` : undefined} onClose={onClose}>
    {item ? <article className={`refined-content-reader reader-${item.mediaType}`}>
      {item.mediaType === "video" ? <section className="content-video-stage"><video controls preload="metadata" poster={item.cover}>{item.videoUrl ? <source src={item.videoUrl} /> : null}</video>{!item.videoUrl ? <span>视频文件由发布方上传后即可在此播放</span> : null}</section> : <img className="content-article-hero" src={item.cover} alt={item.title} />}
      <header><div className="content-reader-tags"><span>{item.mediaType === "video" ? "视频" : "图文"}</span><span>{item.level}</span>{item.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div><p>{item.summary}</p></header>
      <div className="content-reader-body">{item.bodyBlocks?.map((block) => <Block key={block.id} block={block} />) || <p>发布方正在完善内容正文。</p>}</div>
      {item.attachments?.length ? <section className="content-reader-attachments"><h2>资料与附件</h2>{item.attachments.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">附件 {index + 1} ↗</a>)}</section> : null}
      <section className="content-social refined-content-social">
        <button className={liked ? "active" : ""} disabled={likeSaving} onClick={toggleLike}>♥ {liked ? "已点赞" : "点赞"} · {likeCount}</button>
        <label><span>评论</span><textarea rows={3} maxLength={800} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="写下问题或想法，发布方可以在这里回复" /><small>{draft.trim().length} / 800</small></label>
        <button className="primary-btn" disabled={commentSaving || draft.trim().length < 2} onClick={addComment}>{commentSaving ? "正在发布…" : "发布评论"}</button>
        {loading ? <p className="social-empty">正在读取评论…</p> : null}
        {!loading && !comments.length ? <p className="social-empty">还没有评论，欢迎提出第一个问题。</p> : null}
        {comments.map((comment) => <article className="comment-item" key={comment.id}><header><b>{comment.author}</b>{comment.createdAt ? <small>{new Date(comment.createdAt).toLocaleString("zh-CN")}</small> : null}</header><p>{comment.text}</p>{comment.reply ? <blockquote><b>{comment.repliedBy || "内容发布方"}回复</b><p>{comment.reply}</p></blockquote> : null}{comment.mine ? <button onClick={() => removeComment(comment)}>删除我的评论</button> : null}</article>)}
      </section>
    </article> : null}
  </Dialog>;
}
