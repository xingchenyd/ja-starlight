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

const fallbackSlides: Slide[] = [{
  image: "/media/ja-official-career-market.jpg",
  eyebrow: "星光计划",
  title: "在真实实践中，开启下一段成长。",
  meta: "发现机会 · 参与活动 · 记录成长",
  href: "/activities",
}];

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
  const [onScreen, setOnScreen] = useState(true);
  const reducedMotion = useReducedMotion();
  const paused = reducedMotion || userPaused || focusPaused || hovered || !onScreen;
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerActivation = useRef(false);
  const touch = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastSwipe = useRef(0);

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
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setTimeout(
      () => setActive((value) => (value + 1) % slides.length),
      6500,
    );
    return () => window.clearTimeout(timer);
  }, [active, paused, slides.length]);

  const move = (delta: number) =>
    setActive((value) => (value + delta + slides.length) % slides.length);

  return (
    <div
      className="cinema-stage"
      ref={stageRef}
      role="region"
      aria-label="正在发生的成长故事"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDownCapture={(event) => {
        pointerActivation.current = true;
        if (event.pointerType === "touch" && event.isPrimary && !(event.target as HTMLElement).closest("button")) {
          touch.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }
      }}
      onPointerUpCapture={(event) => {
        pointerActivation.current = false;
        const start = touch.current;
        touch.current = null;
        if (!start || start.id !== event.pointerId || slides.length < 2) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.45) return;
        lastSwipe.current = Date.now();
        move(dx > 0 ? -1 : 1);
      }}
      onPointerCancelCapture={() => {
        pointerActivation.current = false;
        touch.current = null;
      }}
      onClickCapture={(event) => {
        if (event.detail && Date.now() - lastSwipe.current < 400) {
          event.preventDefault();
          event.stopPropagation();
        }
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
      <div className="cinema-track">
        {slides.map((slide, index) => (
          <a
            className="cinema-slide"
            href={slide.href}
            key={`${slide.image}-${index}`}
            aria-hidden={active !== index}
            tabIndex={active === index ? 0 : -1}
          >
            {((index - active + slides.length) % slides.length <= 1 ||
                (active - index + slides.length) % slides.length <= 1) && <img
              src={slide.image}
              alt=""
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
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
            />}
            <span className="cinema-shade" />
            <div className="cinema-caption">
              <small>{slide.eyebrow}</small>
              <h2>{slide.title}</h2>
              <p>{slide.meta}</p>
              <b>打开内容 <span aria-hidden="true">↗</span></b>
            </div>
          </a>
        ))}
      </div>

      <div className="cinema-controls">
        <span aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        {slides.length > 1 && <><button type="button" onClick={() => move(-1)} aria-label="上一张">←</button>
        <button type="button" onClick={() => move(1)} aria-label="下一张">→</button>
        {!reducedMotion && <button
          type="button"
          className="cinema-pause"
          onClick={() => {
            const shouldResume = userPaused || focusPaused;
            setUserPaused(!shouldResume);
            setFocusPaused(false);
          }}
          aria-label={userPaused || focusPaused ? "继续轮播" : "暂停轮播"}
        >
          {userPaused || focusPaused ? "▶" : "Ⅱ"}
        </button>}</>}
      </div>
      <div className="cinema-progress" aria-hidden="true"><i style={{ transform: `scaleX(${(active + 1) / slides.length})` }} /></div>
    </div>
  );
}
