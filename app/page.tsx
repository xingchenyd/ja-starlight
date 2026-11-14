import type { Metadata } from "next";
import StudioHome from "./home-design/StudioHome";
export const metadata: Metadata = {title:"星光计划｜连接青年与未来",description:"连接湖南青年、企业与真实世界的实习、项目和成长机会。"};
export default function Home() { return <StudioHome />; }
