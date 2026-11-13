"use client";

import { useEffect, useRef, useState } from "react";
import BrandLogo from "./components/BrandLogo";

const chapters = [
  { id: "jobs", label: "实习 / 项目机会", mobile: "实习机会" },
  { id: "events", label: "成长活动", mobile: "成长活动" },
  { id: "content", label: "成长内容", mobile: "成长内容" },
  { id: "journey", label: "成长路径", mobile: "成长路径" },
];

export default function HomeHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const header = headerRef.current;
    const root = header?.closest<HTMLElement>(".public-home");
    if (!header || !root) return;

    const hero = root.querySelector<HTMLElement>(".cinema-hero");
    const targets = chapters.flatMap(({ id }) => {
      const node = document.getElementById(id);
      return node ? [{ id, node }] : [];
    });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveal = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          reveal?.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll(".home-reveal").forEach((node) => reveal?.observe(node));

    let frame = 0;
    let last = "";
    const update = () => {
      frame = 0;
      const top = header.offsetHeight;
      const scrollTop = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
      const cutoff = top + Math.min(150, window.innerHeight * 0.19);
      let active = "";
      for (const { id, node } of targets) {
        if (node.getBoundingClientRect().top <= cutoff) active = id;
      }
      if (last !== active) {
        last = active;
        setCurrent(active);
      }
      header.style.setProperty("--home-progress", String(Math.min(1, Math.max(0, scrollable ? scrollTop / scrollable : 0))));
      if (hero && (heroBottom > 0 || reduced.matches)) {
        const depth = reduced.matches ? 0 : Math.min(50, scrollTop * 0.11);
        hero.style.setProperty("--home-depth", `${depth}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      reveal?.disconnect();
      resize?.disconnect();
    };
  }, []);

  return (
    <header className="home-masthead" ref={headerRef}>
      <nav className="shell home-nav" aria-label="星光计划首页导航">
        <a className="brand brand-official" href="#top" aria-label="Star Plan 星光计划首页"><BrandLogo decorative /></a>
        <div className="navlinks">
          {chapters.map((chapter) => (
            <a className="home-chapter-link" key={chapter.id} href={`#${chapter.id}`} aria-current={current === chapter.id ? "location" : undefined}>
              <span>{chapter.label}</span>
              {chapter.label !== chapter.mobile && <span className="chapter-short">{chapter.mobile}</span>}
            </a>
          ))}
        </div>
        <div className="actions"><a className="text-link" href="/auth/enterprise">企业登录</a><a className="button small" href="/auth/student">学生登录</a></div>
      </nav>
      <div className="home-reading-progress" aria-hidden="true" />
    </header>
  );
}
