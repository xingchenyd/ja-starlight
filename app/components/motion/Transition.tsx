"use client";

import { useEffect, useState, type ReactNode } from "react";

export type TransitionDirection = "forward" | "back" | "none";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function runViewTransition(update: () => void) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    update();
    return;
  }
  const documentWithTransition = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !documentWithTransition.startViewTransition) {
    update();
    return;
  }
  documentWithTransition.startViewTransition(update);
}

export function PageTransition({ identity, direction = "forward", children, className = "" }: { identity: string; direction?: TransitionDirection; children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div
      key={identity}
      data-direction={reduced ? "none" : direction}
      className={`motion-page-enter ${className}`.trim()}
    >
      {children}
    </div>
  );
}

