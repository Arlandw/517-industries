"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=7250+Dallas+Pkwy+Suite+400+Plano+TX+75024";

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="arrow"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.4" /></svg>
);

// Monochrome hairline US flag (517studio.com option B). Only motion is a gentle staggered fade-in
// of the bands on reveal, skipped under reduced motion and while the Pause motion control is on.
const FlagArt = () => (
  <svg className="flag-art" viewBox="-2 -2 764 404" role="img" aria-labelledby="home-flag-title"><title id="home-flag-title">Flag of the United States, drawn in hairlines</title><defs><path id="home-flag-star" d="M0 -12.3 2.8 -3.8 11.7 -3.8 4.5 1.5 7.2 10 0 4.7 -7.2 10 -4.5 1.5 -11.7 -3.8 -2.8 -3.8Z"/></defs>
      <rect className="flag-frame" width="760" height="400"/>
      <rect className="flag-band" style={{ "--i": 0 } as CSSProperties} x="304" y="0" width="456" height="30.8"/>
      <rect className="flag-band" style={{ "--i": 1 } as CSSProperties} x="304" y="61.5" width="456" height="30.8"/>
      <rect className="flag-band" style={{ "--i": 2 } as CSSProperties} x="304" y="123.1" width="456" height="30.8"/>
      <rect className="flag-band" style={{ "--i": 3 } as CSSProperties} x="304" y="184.6" width="456" height="30.8"/>
      <rect className="flag-band" style={{ "--i": 4 } as CSSProperties} x="0" y="246.2" width="760" height="30.8"/>
      <rect className="flag-band" style={{ "--i": 5 } as CSSProperties} x="0" y="307.7" width="760" height="30.8"/>
      <rect className="flag-band" style={{ "--i": 6 } as CSSProperties} x="0" y="369.2" width="760" height="30.8"/>
      <g className="flag-union">
      <rect className="flag-band" width="304" height="215.4"/><g className="flag-stars">
        <use href="#home-flag-star" x="25.3" y="21.5"/>
        <use href="#home-flag-star" x="76" y="21.5"/>
        <use href="#home-flag-star" x="126.7" y="21.5"/>
        <use href="#home-flag-star" x="177.3" y="21.5"/>
        <use href="#home-flag-star" x="228" y="21.5"/>
        <use href="#home-flag-star" x="278.7" y="21.5"/>
        <use href="#home-flag-star" x="50.7" y="43.1"/>
        <use href="#home-flag-star" x="101.3" y="43.1"/>
        <use href="#home-flag-star" x="152" y="43.1"/>
        <use href="#home-flag-star" x="202.7" y="43.1"/>
        <use href="#home-flag-star" x="253.3" y="43.1"/>
        <use href="#home-flag-star" x="25.3" y="64.6"/>
        <use href="#home-flag-star" x="76" y="64.6"/>
        <use href="#home-flag-star" x="126.7" y="64.6"/>
        <use href="#home-flag-star" x="177.3" y="64.6"/>
        <use href="#home-flag-star" x="228" y="64.6"/>
        <use href="#home-flag-star" x="278.7" y="64.6"/>
        <use href="#home-flag-star" x="50.7" y="86.2"/>
        <use href="#home-flag-star" x="101.3" y="86.2"/>
        <use href="#home-flag-star" x="152" y="86.2"/>
        <use href="#home-flag-star" x="202.7" y="86.2"/>
        <use href="#home-flag-star" x="253.3" y="86.2"/>
        <use href="#home-flag-star" x="25.3" y="107.7"/>
        <use href="#home-flag-star" x="76" y="107.7"/>
        <use href="#home-flag-star" x="126.7" y="107.7"/>
        <use href="#home-flag-star" x="177.3" y="107.7"/>
        <use href="#home-flag-star" x="228" y="107.7"/>
        <use href="#home-flag-star" x="278.7" y="107.7"/>
        <use href="#home-flag-star" x="50.7" y="129.2"/>
        <use href="#home-flag-star" x="101.3" y="129.2"/>
        <use href="#home-flag-star" x="152" y="129.2"/>
        <use href="#home-flag-star" x="202.7" y="129.2"/>
        <use href="#home-flag-star" x="253.3" y="129.2"/>
        <use href="#home-flag-star" x="25.3" y="150.8"/>
        <use href="#home-flag-star" x="76" y="150.8"/>
        <use href="#home-flag-star" x="126.7" y="150.8"/>
        <use href="#home-flag-star" x="177.3" y="150.8"/>
        <use href="#home-flag-star" x="228" y="150.8"/>
        <use href="#home-flag-star" x="278.7" y="150.8"/>
        <use href="#home-flag-star" x="50.7" y="172.3"/>
        <use href="#home-flag-star" x="101.3" y="172.3"/>
        <use href="#home-flag-star" x="152" y="172.3"/>
        <use href="#home-flag-star" x="202.7" y="172.3"/>
        <use href="#home-flag-star" x="253.3" y="172.3"/>
        <use href="#home-flag-star" x="25.3" y="193.8"/>
        <use href="#home-flag-star" x="76" y="193.8"/>
        <use href="#home-flag-star" x="126.7" y="193.8"/>
        <use href="#home-flag-star" x="177.3" y="193.8"/>
        <use href="#home-flag-star" x="228" y="193.8"/>
        <use href="#home-flag-star" x="278.7" y="193.8"/></g></g></svg>
);

export function HomeBase() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ref.current;
    const toggle = document.querySelector<HTMLElement>(".motion-toggle");
    if (!section || !toggle) return;
    const sync = () => {
      if (toggle.getAttribute("aria-pressed") === "true") section.dataset.still = "";
      else delete section.dataset.still;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(toggle, { attributes: true, attributeFilter: ["aria-pressed"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="home-base section-pad" id="dallas" aria-labelledby="home-base-title">
      <div className="section-heading reveal" data-reveal><p className="eyebrow mono"><span className="section-number">04</span> Where we are</p></div>
      <div className="home-base-grid">
        <div className="home-base-intro reveal" data-reveal><h2 id="home-base-title">Proudly built<br />and based in<br />Dallas, Texas, USA.</h2></div>
        <figure className="home-flag flag-mono reveal reveal-delay" data-reveal><FlagArt /></figure>
      </div>
      <div className="office-panels">
        <div className="office-details reveal" data-reveal>
          <div className="office-meta mono"><span>Office</span><span>Plano, TX</span></div>
          <address><span>7250 Dallas Pkwy, Suite 400</span><span>Plano, TX 75024</span></address>
          <a className="text-link" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Open in Google Maps <Arrow /></a>
        </div>
        <figure className="office-map reveal reveal-delay" data-reveal>
          <div className="map-frame">
            <img src="/assets/office-map.svg" width="800" height="560" loading="lazy" decoding="async" alt="Street map of the Legacy area of Plano, Texas, with a pin at 7250 Dallas Parkway, beside the Dallas North Tollway and Legacy Drive." />
            <span className="map-label map-label-tollway mono" aria-hidden="true">Dallas N Tollway</span>
            <span className="map-label map-label-legacy mono" aria-hidden="true">Legacy Dr</span>
            <span className="map-pin" aria-hidden="true" />
          </div>
          <figcaption className="mono">Map data <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></figcaption>
        </figure>
      </div>
    </section>
  );
}
