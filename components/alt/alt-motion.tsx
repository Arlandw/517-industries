"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/alt/icons";

function useReducedMotion() {
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

// Section reveals and the tagline word reveal. Each plays once and never replays on scroll back.
export function AltMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".alt");
    if (!root) return;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-alt-reveal]"));
    const words = Array.from(root.querySelectorAll<HTMLElement>(".alt-tagline-word"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveals.forEach((node) => node.classList.add("is-in"));
      words.forEach((node) => node.classList.add("is-on"));
      return;
    }
    root.classList.add("alt-js");

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.3, rootMargin: "0px 0px -5% 0px" });
    reveals.forEach((node) => revealObserver.observe(node));

    // The trigger line sits 35% above the bottom of the viewport; each word lights as it crosses.
    const wordObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-on");
        wordObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -35% 0px" });
    words.forEach((node) => wordObserver.observe(node));

    return () => {
      revealObserver.disconnect();
      wordObserver.disconnect();
      root.classList.remove("alt-js");
    };
  }, []);
  return null;
}

// Pause control for the only continuous motion on the page, the slow hero image drift.
// The drift also stops on its own while the hero is off screen.
export function AltMotionToggle() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".alt");
    if (!root) return;
    if (paused || reduced) root.dataset.paused = "";
    else delete root.dataset.paused;
  }, [paused, reduced]);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".alt-hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      hero.toggleAttribute("data-offscreen", !entry.isIntersecting);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const still = paused || reduced;
  return (
    <button type="button" className="alt-motion-toggle" onClick={() => setPaused((value) => !value)} disabled={reduced} aria-pressed={still}>
      <Icon name={still ? "play" : "pause"} />
      {reduced ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
