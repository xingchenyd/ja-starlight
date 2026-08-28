/* eslint-disable @next/next/no-html-link-for-pages */
"use client";
import {useEffect,useState} from "react";
import type {ContentItem} from "../../data";
import ContentDetailView from "./ContentDetailView";
type CatalogRecord={id:string;kind:string;payload:Record<string,unknown>};
function normalize(record:CatalogRecord):ContentItem{const p=record.payload;return {...p,id:record.id,title:String(p.title||"未命名内容"),summary:String(p.summary||""),category:String(p.category||"职业探索"),duration:String(p.duration||"预计 10 分钟"),level:String(p.level||"通用"),cover:String(p.cover||"/media/ja-official-forum.jpg"),mediaType:p.mediaType==="video"?"video":"article",publisher:String(p.publisher||p.company||"JA China"),bodyBlocks:Array.isArray(p.bodyBlocks)?p.bodyBlocks:[],tags:Array.isArray(p.tags)?p.tags.map(String):[]} as unknown as ContentItem}
export default function DynamicContentDetail({id}:{id:string}){const[item,setItem]=useState<ContentItem|null>(null),[loading,setLoading]=useState(true);useEffect(()=>{let live=true;fetch(`/api/catalog?id=${encodeURIComponent(id)}`).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>live&&setItem(normalize(data.record))).catch(()=>{}).finally(()=>live&&setLoading(false));return()=>{live=false}},[id]);if(loading)return <main className="public-detail-state"><h1>正在读取内容…</h1></main>;if(!item)return <main className="public-detail-state"><h1>内容不存在或尚未公开</h1><a href="/content">返回成长内容</a></main>;return <ContentDetailView item={item}/>}
