/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "./components/motion";
import {
  isPublicNow,
  sortPublicRecords,
  type PublicCatalogRecord,
} from "../lib/catalog/public-catalog";

type Slide = {
  image: string;
  eyebrow: string;
  title: string;
  meta: string;
  href: string;
};
type CatalogRecord = PublicCatalogRecord & {
  kind: "activity" | "content";
};
const fallbackSlides: Slide[] = [
  {
    image: "/media/ja-official-career-market.jpg",
    eyebrow: "成长活动",
    title: "未来职业市集：把职业探索带到真实现场",
    meta: "青年与企业面对面 · 活动报名",
    href: "/activities/act-04",
  },
  {
    image: "/media/ja-official-forum.jpg",
    eyebrow: "校企同频",
    title: "创变未来人才引擎：与导师坐在同一张圆桌",
    meta: "嘉宾对谈 · 行业理解",
    href: "/content/con-07",
  },
  {
    image: "/media/ja-official-coy-awards.jpg",
    eyebrow: "学生公司",
    title: "JA 中国学生公司大赛：让成果被看见",
    meta: "创新实践 · 团队协作",
    href: "/content/con-10",
  },
  {
    image: "/media/ja-official-market.jpg",
    eyebrow: "项目展销",
    title: "产品展销会：从一个想法到真实用户反馈",
    meta: "商业实践 · 路演复盘",
    href: "/activities/act-06",
  },
  {
    image: "/media/ja-official-manufacturing.jpg",
    eyebrow: "职业体验",
    title: "智造未来一日营：走进制造业真实工作流",
    meta: "企业参访 · 岗位观察",
    href: "/activities/act-01",
  },
  {
    image: "/media/ja-official-student-company.jpg",
    eyebrow: "创业实践",
    title: "Shining Universe 学生公司：把小产品推向市场",
    meta: "项目作品 · 成长档案",
    href: "/content/con-06",
  },
];

function fromCatalog(record: CatalogRecord): Slide | null {
  const cover = String(record.payload.cover || "");
  const title = String(record.payload.title || "");
  if (!cover || !title) return null;
  return {
    image: cover,
    eyebrow: record.kind === "activity" ? "最新活动" : "成长内容",
    title,
    meta: String(
      record.payload.category ||
        (record.kind === "activity" ? "活动报名" : "文章 / 视频"),
    ),
    href:
      record.kind === "activity"
        ? `/activities/${encodeURIComponent(record.id)}`
        : `/content/${encodeURIComponent(record.id)}`,
  };
}

export default function HomeCarousel() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides),
    [active, setActive] = useState(0),
    [userPaused, setUserPaused] = useState(false),
    [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const paused = reducedMotion || userPaused || hovered;
  useEffect(() => {
    let live = true;
    fetch("/api/catalog?pageSize=100")
      .then((response) => response.json())
      .then((data) => {
        if (!live) return;
        const published = sortPublicRecords(
          ((data.records || []) as CatalogRecord[]).filter(
            (record) =>
              (record.kind === "activity" || record.kind === "content") &&
              isPublicNow(record.payload),
          ),
        )
          .filter(
            (record): record is CatalogRecord =>
              record.kind === "activity" || record.kind === "content",
          )
          .map(fromCatalog)
          .filter(Boolean) as Slide[];
        if (published.length) {
          setSlides(published);
          setActive(0);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((v) => (v + 1) % slides.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);
  const move = (delta: number) =>
    setActive((v) => (v + delta + slides.length) % slides.length);
  return (
    <section
      className="story-stage shell"
      aria-label="JA 活动与成长内容轮播"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setUserPaused(true)}
    >
      <div className="story-heading">
        <div>
          <p className="eyebrow">LIVE STORIES · STAR PLAN</p>
          <h2>正在发生的成长故事</h2>
        </div>
        <p>
          企业与 JA
          审核发布的封面会原样出现在这里。推荐内容优先展示，左右切换，点击即可进入报名或阅读。
        </p>
      </div>
      <div className="story-viewport">
        <div
          className="story-track"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <a
              className="story-slide"
              href={slide.href}
              key={`${slide.image}-${index}`}
              aria-hidden={active !== index}
              tabIndex={active === index ? 0 : -1}
            >
              <img
                src={slide.image}
                alt={slide.title}
                onError={(event) => {
                  if (!event.currentTarget.src.endsWith("ja-official-career-market.jpg")) {
                    event.currentTarget.src = "/media/ja-official-career-market.jpg";
                  }
                }}
              />
              <div className="story-shade" />
              <span className="story-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="story-caption">
                <small>{slide.eyebrow}</small>
                <h3>{slide.title}</h3>
                <p>{slide.meta}</p>
                <b>
                  打开内容 <i>↗</i>
                </b>
              </div>
            </a>
          ))}
        </div>
        <div className="story-controls">
          <button onClick={() => move(-1)} aria-label="上一张">
            ←
          </button>
          <span className="story-status" aria-live="polite">
            {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <button onClick={() => move(1)} aria-label="下一张">
            →
          </button>
          <button
            className="story-pause"
            onClick={() => setUserPaused((value) => !value)}
            aria-label={userPaused ? "继续轮播" : "暂停轮播"}
            title={userPaused ? "继续轮播" : "暂停轮播"}
          >
            {userPaused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </div>
    </section>
  );
}
