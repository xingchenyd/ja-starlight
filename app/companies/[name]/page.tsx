import type {Metadata} from "next";
import CompanyPublicProfile from "./CompanyPublicProfile";
export async function generateMetadata({params}:{params:Promise<{name:string}>}):Promise<Metadata>{const{name}=await params,company=decodeURIComponent(name);return{title:`${company}｜企业主页`,description:`查看${company}在星光计划发布的岗位、活动与成长内容。`,openGraph:{title:`${company}｜企业主页`,description:`查看${company}的公开机会与成长内容。`,images:[]},twitter:{title:`${company}｜企业主页`,description:`查看${company}的公开机会与成长内容。`,images:[]}}}
export default async function CompanyPage({params}:{params:Promise<{name:string}>}){const{name}=await params;return <CompanyPublicProfile name={decodeURIComponent(name)}/>}
