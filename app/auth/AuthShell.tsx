import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <main className="auth-page"><section className="auth-visual" aria-label="JA 星光计划活动现场"><Image src="/media/ja-official-career-market.jpg" alt="JA 青年成长活动" fill sizes="(max-width: 880px) 100vw, 55vw" priority/><div className="auth-visual-shade"/><Link className="auth-logo" href="/"><Image src="/media/ja-china-logo.jpg" alt="JA China" width={58} height={58}/><span><b>Star Plan 星光计划</b><small>JA CHINA · HUNAN</small></span></Link><div className="auth-story"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p><div><i/><i/><i/></div></div></section><section className="auth-stage"><Link className="auth-back" href="/">← 返回首页</Link>{children}<p className="auth-legal">登录或注册即表示你同意<Link href="/terms">平台使用规则</Link>和<Link href="/privacy">隐私政策</Link></p></section></main>;
}
