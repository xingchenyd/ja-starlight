/* eslint-disable @next/next/no-img-element, jsx-a11y/media-has-caption */
import Link from "next/link";
import type { Activity } from "../../data";
import PublicRichContent from "../../components/PublicRichContent";
import { workspacePath } from "../../../lib/ui/workspace-routes";

export default function ActivityDetailView({ activity }: { activity: Activity }) {
  return <main className="public-detail-page"><header className="public-detail-nav"><Link href="/">星光计划</Link><Link href="/activities">← 返回成长活动</Link></header>
    <section className="public-detail-hero"><div className="public-detail-cover">{activity.coverType === "video" ? <video src={activity.cover} controls playsInline/> : <img src={activity.cover} alt={activity.title}/>}</div><div><small>{activity.category} · {activity.publisher || "星光计划"}</small><h1>{activity.title}</h1><p>{activity.summary}</p><div className="public-detail-meta"><span>{activity.date}</span><span>{activity.place}</span><span>{activity.registered}/{activity.capacity} 人</span></div><Link className="primary-btn" href={workspacePath("student", "activities", activity.id)}>填写信息并报名</Link></div></section>
    <section className="public-detail-body"><article><PublicRichContent blocks={activity.bodyBlocks}/></article><aside><h2>活动信息</h2><p><span>发布方</span>{activity.publisher || "星光计划"}</p><p><span>活动日期</span>{activity.date}</p><p><span>活动地点</span>{activity.place}</p><p><span>报名状态</span>{activity.status}</p>{activity.abilityTags?.length ? <div className="chips">{activity.abilityTags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}</aside></section>
  </main>;
}
