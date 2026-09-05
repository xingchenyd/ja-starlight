import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export type AuthStory = { image: string; eyebrow: string; title: string; description: string };

export default function AuthShell({ eyebrow, title, description, stories, children }: { eyebrow: string; title: string; description: string; stories?: AuthStory[]; children: ReactNode }) {
  const items = stories?.length ? stories : [{ image: "/media/ja-official-career-market.jpg", eyebrow, title, description }];
  return <main className="auth-page">
    <section className="auth-visual" aria-label="星光计划成长故事">
      <div className="auth-story-track">
        {items.map((story, index) => <article className="auth-story-slide" key={`${story.image}-${story.title}`}>
          <Image src={story.image} alt={story.title} fill sizes="(max-width: 880px) 100vw, 55vw" priority={index === 0}/>
          <div className="auth-visual-shade"/>
          <div className="auth-story">
            <span>{story.eyebrow}</span><h1>{story.title}</h1><p>{story.description}</p>
            <div aria-label={`第 ${index + 1} 张，共 ${items.length} 张`}>{items.map((_, marker) => <i className={marker === index ? "active" : ""} key={marker}/>)}</div>
          </div>
        </article>)}
      </div>
      {items.length > 1 ? <span className="auth-swipe-hint">← 左右滑动浏览 →</span> : null}
    </section>
    <section className="auth-stage">
      <a className="auth-back" href="/">← 返回首页</a>{children}
      <p className="auth-legal">登录或注册即表示你同意<Link href="/terms">平台使用规则</Link>和<Link href="/privacy">隐私政策</Link></p>
    </section>
  </main>;
}
