/* eslint-disable @next/next/no-img-element, jsx-a11y/media-has-caption */
import type { RichBlock } from "../data";

export default function PublicRichContent({ blocks = [] }: { blocks?: RichBlock[] }) {
  if (!blocks.length) return <p className="public-rich-empty">发布方暂未补充更多正文内容。</p>;
  return <div className="public-rich-content">{blocks.map((block) => {
    if (block.type === "heading") return <h2 key={block.id}>{block.title}</h2>;
    if (block.type === "quote") return <blockquote key={block.id}>{block.text || block.title}</blockquote>;
    if (block.type === "image") return <figure key={block.id}><img src={block.url} alt={block.caption || block.title || "内容配图"}/>{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    if (block.type === "gallery") return <div className="public-rich-gallery" key={block.id}>{(block.items || []).map((item) => <img src={item} alt={block.title || "图集图片"} key={item}/>)}</div>;
    if (block.type === "video") return <figure key={block.id}><video src={block.url} controls playsInline preload="metadata"/>{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    if (block.type === "agenda") return <section className="public-agenda" key={block.id}><h3>{block.title || "活动议程"}</h3>{String(block.text || block.title || "").split("｜").map((item) => <p key={item}>{item}</p>)}</section>;
    if (block.type === "card") return <aside className="public-rich-card" key={block.id}><h3>{block.title}</h3><p>{block.text}</p></aside>;
    if (block.type === "attachment") return <a className="public-attachment" href={block.url} target="_blank" rel="noreferrer" key={block.id}>下载附件 · {block.title || "资料"} ↗</a>;
    return <p key={block.id}>{block.text}</p>;
  })}</div>;
}
