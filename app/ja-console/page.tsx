import type {Metadata} from "next";
import JAConsole from "./JAConsole";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"平台运营后台",robots:{index:false,follow:false}};
export default async function AdminPage(){return <JAConsole operator="JA 测试管理员"/>}
