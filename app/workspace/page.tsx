import type { Metadata } from "next";
import PlatformApp from "./PlatformApp";

export const metadata:Metadata={title:"工作台｜JA 星光计划",description:"学生、企业与 JA 运营协作工作台"};
export default async function Workspace({searchParams}:{searchParams:Promise<{role?:string}>}){const {role}=await searchParams;return <PlatformApp initialRole={role==="enterprise"?"enterprise":"student"}/>}
