import type {Metadata} from "next";
import "./globals.css";
import "./challenges.css";
import "./mobile.css";
import "./star-plan-theme.css";

export const metadata:Metadata={metadataBase:new URL("https://star-plan.com"),title:{default:"星光计划",template:"%s｜星光计划"},description:"连接湖南青年、企业与真实世界的实习、项目和成长机会。",icons:{icon:{url:"/star-plan-icon.png",type:"image/png",sizes:"96x96"}},openGraph:{title:"星光计划",description:"让每一次探索，都成为未来的光。",images:[{url:"/star-plan-share.jpg",width:1200,height:630,alt:"星光计划"}]},twitter:{card:"summary_large_image",images:["/star-plan-share.jpg"]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
