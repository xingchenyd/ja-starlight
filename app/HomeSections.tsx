/* eslint-disable @next/next/no-img-element */
"use client";
import {useEffect,useMemo,useState} from "react";
import {activities,contents,jobs,type Activity,type ContentItem,type Job} from "./data";

type StoredRecord={id:string;kind:string;payload:Record<string,unknown>;updatedAt?:string};
const jobCategories=["全部类别","产品运营","技术研发","数据分析","品牌内容","智能制造","金融与商业","项目实践","公益实践"];
function asJob(record:StoredRecord){return {...record.payload,id:record.id} as unknown as Job}
function asActivity(record:StoredRecord){return {...record.payload,id:record.id} as unknown as Activity}
function asContent(record:StoredRecord){return {...record.payload,id:record.id} as unknown as ContentItem}
function byPublishDate(a:{publishedAt?:string;date?:string;sortOrder?:number},b:{publishedAt?:string;date?:string;sortOrder?:number}){return Number(b.sortOrder||0)-Number(a.sortOrder||0)||String(b.publishedAt||b.date||"").localeCompare(String(a.publishedAt||a.date||""))}

export default function HomeSections(){
 const [catalog,setCatalog]=useState<StoredRecord[]>([]),[jobCategory,setJobCategory]=useState("全部类别"),[expanded,setExpanded]=useState<Record<string,boolean>>({});
 useEffect(()=>{let live=true;fetch("/api/catalog").then(r=>r.json()).then(data=>{if(live)setCatalog(data.records||[])}).catch(()=>{});return()=>{live=false}},[]);
 const publicJobs=useMemo(()=>[...catalog.filter(r=>r.kind==="job").map(asJob),...jobs].sort(byPublishDate),[catalog]);
 const publicActivities=useMemo(()=>[...catalog.filter(r=>r.kind==="activity").map(asActivity),...activities].sort(byPublishDate),[catalog]);
 const publicContents=useMemo(()=>[...catalog.filter(r=>r.kind==="content").map(asContent),...contents].sort(byPublishDate),[catalog]);
 const filteredJobs=publicJobs.filter(job=>jobCategory==="全部类别"||job.jobCategory===jobCategory);
 const jobList=expanded.jobs?filteredJobs:filteredJobs.slice(0,3),activityList=expanded.activities?publicActivities:publicActivities.slice(0,3),contentList=expanded.contents?publicContents:publicContents.slice(0,3);
 const more=(key:string,total:number)=><button className="home-more" onClick={()=>setExpanded(v=>({...v,[key]:!v[key]}))}>{expanded[key]?"收起":`查看更多 ${total}`}</button>;
 return <section className="home-sections shell">
  <div className="home-section-head" id="jobs"><small>OPPORTUNITIES</small><h2>实习项目机会</h2></div>
  <div className="home-category-select" aria-label="机会类别筛选">{jobCategories.map(item=><button key={item} className={jobCategory===item?"active":""} onClick={()=>setJobCategory(item)}>{item}</button>)}</div>
  <div className="home-job-list">{jobList.map(job=><article key={job.id}><div className="home-company-mark" style={{background:job.logoUrl?"white":job.color}}>{job.logoUrl?<img src={job.logoUrl} alt={`${job.company} logo`}/>:job.logo}</div><div><h3><a href={`/companies/${encodeURIComponent(job.company)}`}>{job.company}</a></h3><h4>{job.title}</h4><p>{job.summary}</p><small>{job.city} · {job.duration} · {job.publishedAt} · {job.salary||"薪资面议"}</small></div><a href={`/opportunities/${encodeURIComponent(job.id)}`}>查看详情</a></article>)}</div>
  {filteredJobs.length>3&&more("jobs",filteredJobs.length)}

  <div className="home-section-head" id="events"><small>ACTIVITIES</small><h2>成长活动</h2></div>
  <div className="home-card-row">{activityList.map(activity=><a href={`/activities/${encodeURIComponent(activity.id)}`} key={activity.id}><img src={activity.cover} alt={activity.title}/><span>{activity.category}</span><h3>{activity.title}</h3><small>{activity.publisher||"JA China"} · {activity.date}</small></a>)}</div>
  {publicActivities.length>3&&more("activities",publicActivities.length)}

  <div className="home-section-head" id="content"><small>CONTENTS</small><h2>成长内容</h2></div>
  <div className="home-card-row content-row">{contentList.map(content=><a href={`/content/${encodeURIComponent(content.id)}`} key={content.id}><img src={content.cover} alt={content.title}/><span>{content.mediaType==="video"?"视频":"文章"}</span><h3>{content.title}</h3><p>{content.summary}</p><small>{content.duration}</small></a>)}</div>
  {publicContents.length>3&&more("contents",publicContents.length)}
 </section>
}
