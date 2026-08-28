import type {Metadata} from "next";
import {contents} from "../../data";
import ContentDetailView from "./ContentDetailView";
import DynamicContentDetail from "./DynamicContentDetail";
const SITE="https://ja-starlight.vercel.app";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params,item=contents.find((content)=>content.id===id);if(!item)return {title:"成长内容详情",description:"阅读 JA Star Plan 成长内容。",openGraph:{images:[]},twitter:{images:[]}};const image=new URL(item.cover,SITE).toString();return {title:item.title,description:item.summary,openGraph:{title:item.title,description:item.summary,images:[image]},twitter:{title:item.title,description:item.summary,images:[image]}}}
export default async function ContentPage({params}:{params:Promise<{id:string}>}){const{id}=await params,item=contents.find((content)=>content.id===id);return item?<ContentDetailView item={item}/>:<DynamicContentDetail id={id}/>}
