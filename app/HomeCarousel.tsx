/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./components/motion";
import {
  isPublicNow,
  sortPublicRecords,
  type PublicCatalogRecord,
} from "../lib/catalog/public-catalog";
import { getPublicCatalog } from "../lib/catalog/client-catalog";

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
    title: "星光计划学生公司大赛：让成果被看见",
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
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides);
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();
  const paused = reducedMotion || userPaused || focusPaused || hovered;
  const pointerActivation = useRef(false);

  useEffect(() => {
    let live = true;
    getPublicCatalog()
      .then((records) => {
        if (!live) return;
        const published = sortPublicRecords(
          (records as CatalogRecord[]).filter(
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
      () => setActive((value) => (value + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const move = (delta: number) =>
    setActive((value) => (value + delta + slides.length) % slides.length);

  return (
    <div
      className="cinema-stage"
      aria-label="正在发生的成长故事"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDownCapture={() => {
        pointerActivation.current = true;
      }}
      onPointerUpCapture={() => {
        pointerActivation.current = false;
      }}
      onPointerCancelCapture={() => {
        pointerActivation.current = false;
      }}
      onFocusCapture={() => {
        if (!pointerActivation.current) setFocusPaused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusPaused(false);
        }
      }}
    >
      <div
        className="cinema-track"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <a
            className="cinema-slide"
            href={slide.href}
            key={`${slide.image}-${index}`}
            aria-hidden={active !== index}
            tabIndex={active === index ? 0 : -1}
          >
            <img
              src={slide.image}
              alt={slide.title}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              onError={(event) => {
                if (
                  !event.currentTarget.src.endsWith(
                    "ja-official-career-market.jpg",
                  )
                ) {
                  event.currentTarget.src =
                    "/media/ja-official-career-market.jpg";
                }
              }}
            />
            <span className="cinema-shade" />
            <div className="cinema-caption">
              <small>{slide.eyebrow}</small>
              <h2>{slide.title}</h2>
              <p>{slide.meta}</p>
              <b>打开内容 ↗</b>
            </div>
          </a>
        ))}
      </div>

      <div className="cinema-controls">
        <button onClick={() => move(-1)} aria-label="上一张">←</button>
        <span aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <button onClick={() => move(1)} aria-label="下一张">→</button>
        <button
          className="cinema-pause"
          onClick={() => {
            const shouldResume = userPaused || focusPaused;
            setUserPaused(!shouldResume);
            setFocusPaused(false);
          }}
          aria-label={userPaused || focusPaused ? "继续轮播" : "暂停轮播"}
        >
          {userPaused || focusPaused ? "▶" : "Ⅱ"}
        </button>
      </div>
      <div className="cinema-progress" aria-hidden="true">
        {slides.map((slide, index) => (
          <i className={index === active ? "active" : ""} key={slide.href} />
        ))}
      </div>
    </div>
  );
}
