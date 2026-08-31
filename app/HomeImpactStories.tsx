/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { HomeImpactMetrics } from "./HomeLiveMetrics";
import { useReducedMotion } from "./components/motion";

const stories = [
  {
    image: "/media/ja-official-market.jpg",
    role: "学生成长故事 · 湖南大学",
    title: "从一次职业市集，到一份可以呈现的用户研究成果。",
    copy: "张晨把活动中的访谈、观察和复盘写进成长时间轴，并生成公开档案随简历一起投递。",
  },
  {
    image: "/media/ja-official-student-company.jpg",
    role: "学生公司 · 长沙地区",
    title: "真实用户的反馈，让课堂里的想法第一次成为产品。",
    copy: "团队在展销现场完成定价、表达、销售与复盘，把过程和成果沉淀为认证经历。",
  },
  {
    image: "/media/ja-official-planning.jpg",
    role: "职业探索 · 企业导师",
    title: "比岗位名称更重要的，是理解一份工作真正如何发生。",
    copy: "学生通过导师对话和任务实践建立行业认知，再回到平台继续寻找适合自己的机会。",
  },
];

export default function HomeImpactStories() {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const paused = userPaused || hovered;

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % stories.length),
      7500,
    );
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  return (
    <>
      <HomeImpactMetrics />
      <section className="home-voices shell" aria-labelledby="home-voices-title">
        <div className="home-voices-head">
          <div>
            <p className="eyebrow">GROWTH IN ACTION</p>
            <h2 id="home-voices-title">成长者故事</h2>
          </div>
          <div className="home-voices-controls">
            {stories.map((story, index) => (
              <button
                key={story.title}
                className={index === active ? "active" : ""}
                onClick={() => setActive(index)}
                aria-label={`查看第 ${index + 1} 个成长故事`}
                aria-current={index === active ? "true" : undefined}
              />
            ))}
            <button
              className="voice-pause"
              onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "继续播放成长故事" : "暂停成长故事"}
            >
              {userPaused ? "▶" : "Ⅱ"}
            </button>
          </div>
        </div>
        <div
          className="home-voice-stage"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {stories.map((story, index) => (
            <article
              className={index === active ? "active" : ""}
              key={story.title}
              aria-hidden={index !== active}
            >
              <img src={story.image} alt="" loading="lazy" decoding="async" />
              <div>
                <small>{story.role}</small>
                <h3>{story.title}</h3>
                <p>{story.copy}</p>
                <a href="/auth/student">开始记录我的成长 →</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
