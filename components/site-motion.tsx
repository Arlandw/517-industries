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
    document.documentElement.classList.add("js-motion");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13, rootMargin: "0px 0px -7%" });
    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("js-motion");
    };
  }, []);
  return null;
}
