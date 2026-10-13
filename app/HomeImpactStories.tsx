/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { HomeImpactMetrics } from "./HomeLiveMetrics";
import { useReducedMotion } from "./components/motion";

const stories = [
  {
    image: "/media/ja-official-market.jpg",
    role: "成长路径 · 实践积累",
    title: "把一次探索，沉淀为可以呈现的成果。",
    copy: "记录自己的访谈、观察和复盘，将成长档案与简历一起分享给企业。",
  },
  {
    image: "/media/ja-official-student-company.jpg",
    role: "成长路径 · 团队共创",
    title: "真实用户的反馈，让课堂里的想法第一次成为产品。",
    copy: "通过团队项目实践定价、表达、用户沟通与复盘，记录过程与成果。",
  },
  {
    image: "/media/ja-official-planning.jpg",
    role: "成长路径 · 职业探索",
    title: "比岗位名称更重要的，是理解一份工作真正如何发生。",
    copy: "通过导师对话和任务实践建立行业认知，寻找适合自己的下一步。",
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
            <h2 id="home-voices-title">成长的更多可能</h2>
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
