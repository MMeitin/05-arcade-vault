"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Renders visible (SSR / no JS). Once mounted, arms `.reveal` and adds `.in`
// when the section enters the viewport. Skipped with prefers-reduced-motion.
export function Reveal({ className, style, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove("reveal", "in");
    };
  }, []);

  return (
    <section ref={ref} className={className} style={style}>
      {children}
    </section>
  );
}
