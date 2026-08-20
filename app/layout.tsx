import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={title:{default:"JA 星光计划",template:"%s｜JA 星光计划"},description:"连接青年、企业与真实世界的成长机会。",icons:{icon:"/favicon.svg"},openGraph:{title:"JA 星光计划",description:"让每一次探索，都成为未来的光。",images:["/og.png"]},twitter:{card:"summary_large_image",images:["/og.png"]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
