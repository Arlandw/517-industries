"use client";

import { useEffect } from "react";

export function SiteMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13, rootMargin: "0px 0px -7%" });
    nodes.forEach((node) => observer.observe(node));

    const hero = document.querySelector<HTMLElement>(".hero");
    const move = (event: PointerEvent) => {
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      hero.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };
    hero?.addEventListener("pointermove", move, { passive: true });
    return () => {
      observer.disconnect();
      hero?.removeEventListener("pointermove", move);
    };
  }, []);
  return null;
}
