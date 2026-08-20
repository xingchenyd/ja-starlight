import type {Metadata} from "next";
import {requireChatGPTUser} from "../chatgpt-auth";
import JAConsole from "./JAConsole";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"平台运营后台",robots:{index:false,follow:false}};
export default async function AdminPage(){const user=await requireChatGPTUser("/ja-console");return <JAConsole operator={user.displayName}/>}
