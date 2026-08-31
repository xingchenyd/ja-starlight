/* eslint-disable @next/next/no-img-element, jsx-a11y/media-has-caption */
import Link from "next/link";
import type { ContentItem } from "../../data";
import PublicRichContent from "../../components/PublicRichContent";
import { workspacePath } from "../../../lib/ui/workspace-routes";
export default function ContentDetailView({item}:{item:ContentItem}){return <main className="public-detail-page article-detail"><header className="public-detail-nav"><Link href="/">星光计划</Link><Link href="/content">← 返回成长内容</Link></header><article className="article-shell"><small>{item.publisher||"星光计划"} · {item.category} · {item.duration}</small><h1>{item.title}</h1><p className="article-lead">{item.summary}</p><div className="article-cover">{item.coverType==="video"?<video src={item.cover} controls playsInline preload="metadata"/>:<img src={item.cover} alt={item.title}/>}</div><PublicRichContent blocks={item.bodyBlocks}/><footer><div className="chips">{item.tags?.map(tag=><span key={tag}>{tag}</span>)}</div><Link href={workspacePath("student", "content", item.id)}>进入学生空间点赞与评论 →</Link></footer></article></main>}
