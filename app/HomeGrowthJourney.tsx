/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

const journey = [
  {
    number: "01",
    label: "DISCOVER",
    title: "发现真实机会",
    copy: "从长沙企业的真实岗位、项目和行业体验中，找到值得投入的下一步。",
    image: "/media/ja-official-career-market.jpg",
    href: "/opportunities",
    action: "浏览机会",
  },
  {
    number: "02",
    label: "EXPERIENCE",
    title: "进入真实现场",
    copy: "在企业参访、职业市集和实践工作坊中，把行业认知变成亲身经历。",
    image: "/media/ja-official-manufacturing.jpg",
    href: "/activities",
    action: "查看活动",
  },
  {
    number: "03",
    label: "ACHIEVE",
    title: "完成一份成果",
    copy: "每次活动都可以沉淀任务、作品、反馈和星光计划认证，不只停留在“参加过”。",
    image: "/media/ja-official-coy-awards.jpg",
    href: "/content",
    action: "获取成长方法",
  },
  {
    number: "04",
    label: "SHARE",
    title: "让成长被看见",
    copy: "把认证经历与自主添加的实践汇总成公开成长档案，随简历一起分享给企业。",
    image: "/media/ja-official-student-company.jpg",
    href: "/auth/student",
    action: "进入学生空间",
  },
];

export default function HomeGrowthJourney() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(Number(visible.target.getAttribute("data-step")));
      },
      { rootMargin: "-28% 0px -42%", threshold: [0.25, 0.55, 0.8] },
    );
    stepRefs.current.forEach((step) => step && observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="growth-story" aria-labelledby="growth-story-title">
      <header className="shell growth-story-head">
        <p className="eyebrow">A GROWTH JOURNEY</p>
        <h2 id="growth-story-title">每一步，都沉淀为可验证的成长。</h2>
        <p>机会不是终点。星光计划把探索、实践、成果和认证连接成一条持续积累的成长路径。</p>
      </header>
      <div className="shell growth-story-layout">
        <div className="growth-story-visual" aria-live="polite">
          {journey.map((step, index) => (
            <img
              src={step.image}
              alt=""
              loading="lazy"
              decoding="async"
              className={index === active ? "active" : ""}
              key={step.image}
              aria-hidden="true"
            />
          ))}
          <div>
            <small>{journey[active].label}</small>
            <strong>{journey[active].number}</strong>
            <span>{journey[active].title}</span>
          </div>
        </div>
        <div className="growth-story-steps">
          {journey.map((step, index) => (
            <article
              className={index === active ? "active" : ""}
              data-step={index}
              key={step.number}
              ref={(element) => {
                stepRefs.current[index] = element;
              }}
            >
              <span>{step.number}</span>
              <small>{step.label}</small>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <a href={step.href}>{step.action} →</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
