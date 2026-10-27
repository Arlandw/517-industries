"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const LINKS = [
  { href: "#company", label: "Company" },
  { href: "#exploration", label: "Exploration" },
  { href: "#approach", label: "Approach" },
  { href: "#dallas", label: "Where we are" },
] as const;

export function AltNav() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>("");
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sections = LINKS.map(({ href }) => document.querySelector<HTMLElement>(href)).filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(`#${entry.target.id}`);
        else setCurrent((value) => (value === `#${entry.target.id}` ? "" : value));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.documentElement.classList.add("alt-lock");
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("alt-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="alt-header" data-open={open || undefined}>
      <div className="alt-nav-bar">
        <a href="#top" className="alt-brand" aria-label="517 Industries home" onClick={() => setOpen(false)}>
          <img src="/assets/517-wordmark.svg" alt="" width="780" height="82" />
        </a>
        <nav className="alt-nav-links" aria-label="Main navigation">
          {LINKS.map(({ href, label }) => (
            <a key={href} href={href} aria-current={current === href ? "location" : undefined}>{label}</a>
          ))}
        </nav>
        <button
          ref={toggleRef}
          type="button"
          className="alt-menu-toggle"
          aria-expanded={open}
          aria-controls="alt-menu-panel"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
      <div id="alt-menu-panel" className="alt-menu-panel" inert={!open}>
        <nav aria-label="Mobile navigation">
          {LINKS.map(({ href, label }, index) => (
            <a key={href} href={href} style={{ "--i": index } as CSSProperties} aria-current={current === href ? "location" : undefined} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}
