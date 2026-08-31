/* eslint-disable @next/next/no-html-link-for-pages */
"use client";
import { useEffect, useState } from "react";
import type { Activity } from "../../data";
import ActivityDetailView from "./ActivityDetailView";
type CatalogRecord={id:string;kind:string;payload:Record<string,unknown>};
function normalize(record:CatalogRecord):Activity{const p=record.payload;return {...p,id:record.id,title:String(p.title||"未命名活动"),summary:String(p.summary||""),date:String(p.date||"待定"),place:String(p.place||"待定"),category:String(p.category||"成长活动"),capacity:Number(p.capacity||0),registered:Number(p.registered||0),status:String(p.status||"报名中"),cover:String(p.cover||"/media/ja-official-career-market.jpg"),publisher:String(p.publisher||p.company||"星光计划"),bodyBlocks:Array.isArray(p.bodyBlocks)?p.bodyBlocks:[]} as unknown as Activity}
export default function DynamicActivityDetail({id}:{id:string}){const [item,setItem]=useState<Activity|null>(null),[loading,setLoading]=useState(true);useEffect(()=>{let live=true;fetch(`/api/catalog?id=${encodeURIComponent(id)}`).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>live&&setItem(normalize(data.record))).catch(()=>{}).finally(()=>live&&setLoading(false));return()=>{live=false}},[id]);if(loading)return <main className="public-detail-state"><h1>正在读取活动详情…</h1></main>;if(!item)return <main className="public-detail-state"><h1>活动不存在或尚未公开</h1><a href="/activities">返回成长活动</a></main>;return <ActivityDetailView activity={item}/>}
