import type {Metadata} from "next";
import {activities} from "../../data";
import ActivityDetailView from "./ActivityDetailView";
import DynamicActivityDetail from "./DynamicActivityDetail";
const SITE="https://star-plan.com";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params,item=activities.find((activity)=>activity.id===id);if(!item)return {title:"成长活动详情",description:"查看星光计划成长活动。",openGraph:{images:[]},twitter:{images:[]}};const image=new URL(item.cover,SITE).toString();return {title:item.title,description:item.summary,openGraph:{title:item.title,description:item.summary,images:[image]},twitter:{title:item.title,description:item.summary,images:[image]}}}
export default async function ActivityPage({params}:{params:Promise<{id:string}>}){const {id}=await params,item=activities.find((activity)=>activity.id===id);return item?<ActivityDetailView activity={item}/>:<DynamicActivityDetail id={id}/>}
