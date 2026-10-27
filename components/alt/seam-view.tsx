"use client";

import { useEffect, useRef } from "react";
import { boot } from "./seam/boot";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=7250+Dallas+Pkwy+Suite+400+Plano+TX+75024";
const OSM_URL = "https://www.openstreetmap.org/copyright";

// Runs before first paint so the static HTML starts in the right layout (stage or flow) with no flash.
const PREPAINT = `(function(){var d=document.currentScript&&document.currentScript.parentElement;if(!d)return;try{var s=localStorage.getItem("seam-reduced");var r=s?s==="1":matchMedia("(prefers-reduced-motion: reduce)").matches;var m=innerWidth<768;var c=navigator.connection;var sd=!!(c&&(c.saveData||/(^|-)(2g|3g)$/.test(c.effectiveType||"")));d.dataset.seamBoot="1";d.dataset.reduced=r?"1":"0";d.dataset.layout=r||m?"flow":"stage";d.dataset.narrow=m?"1":"0";d.dataset.saveData=sd?"1":"0";d.dataset.prebang=r?"0":"1"}catch(e){}})();`;

function Poster({ id, className }: { id: string; className?: string }) {
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={`/alt/seam/img/${id}.avif`} />
      <img src={`/alt/seam/img/${id}.webp`} alt="" loading="lazy" decoding="async" />
    </picture>
  );
}

export function SeamView() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const ctl = boot(root.current);
    return () => ctl.destroy();
  }, []);

  return (
    <div className="seam" ref={root} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />

      <div className="seam-backdrop" aria-hidden="true">
        <div className="seam-poster seam-poster-l" />
        <div className="seam-poster seam-poster-r" />
        <div className="seam-poster seam-poster-m" />
      </div>
      <canvas className="seam-gl" aria-hidden="true" role="presentation" />
      <div className="seam-rule" aria-hidden="true" />
      <div className="seam-cover" aria-hidden="true">
        <i className="seam-cover-a" />
        <i className="seam-cover-b" />
      </div>
      <canvas className="seam-impact" aria-hidden="true" role="presentation" />
      <div className="seam-grain" aria-hidden="true" />

      <header className="seam-top">
        <a className="seam-mark" href="#top">
          <img src="/assets/517-wordmark.svg" width="780" height="82" alt="517 Industries" />
        </a>
        <span className="seam-coord mono" aria-hidden="true">33.0768 / -96.8247</span>
      </header>

      <div className="seam-controls">
        <button type="button" className="seam-btn mono" data-ctl="pause" aria-pressed="false">pause</button>
        <button type="button" className="seam-btn mono" data-ctl="reduce" aria-pressed="false">reduce motion</button>
      </div>
      <div
        className="seam-handle"
        role="slider"
        tabIndex={0}
        aria-label="Manufacturing / Artificial intelligence"
        aria-orientation="horizontal"
        aria-valuemin={20}
        aria-valuemax={80}
        aria-valuenow={50}
      />
      <div className="seam-scrollcue mono" aria-hidden="true"><i />scroll</div>
      <div className="seam-cursor" aria-hidden="true"><i className="seam-cursor-dot" /><i className="seam-cursor-cross" /></div>

      <main className="seam-main">
        <section className="ch ch-hero" id="top" aria-labelledby="hero-title" data-ch="0">
          <div className="pin">
            <Poster id="s9" className="flow-media flow-hero" />
            <h1 id="hero-title" className="split h1">
              <span className="l">Curiosity,</span> <span className="r">put to work.</span>
            </h1>
            <p className="hero-sub">Exploring manufacturing, artificial intelligence, and the possibilities between.</p>
            <p className="hero-label mono">
              <span className="hl-l">Manufacturing</span> <span className="hl-s">/</span> <span className="hl-r">Artificial intelligence</span>
            </p>
            <p className="hero-vert mono">An open field of possibility</p>
          </div>
        </section>

        <section className="ch ch-company" aria-labelledby="company-title" data-ch="1">
          <div className="pin">
            <p className="ch-label mono">01 The company</p>
            <h2 id="company-title" className="split mega">
              <span className="l">Room to think.</span> <span className="r">Reason to build.</span>
            </h2>
            <Poster id="s3" className="flow-media" />
            <div className="plate plate-r">
              <p className="wipe">517 Industries is an independent research and development company exploring how things are made, how systems think, and what happens when the two come together.</p>
            </div>
            <div className="plate plate-l">
              <p className="wipe">We start with questions worth asking. Then we explore, experiment, and follow the ideas that earn a next step. The work can take different forms. The curiosity stays constant.</p>
            </div>
            <p className="gap-line">A company built for discovery. Open by design.</p>
          </div>
        </section>

        <section className="ch ch-fields" aria-labelledby="fields-title" data-ch="2">
          <div className="pin">
            <div className="fields-intro">
              <h2 id="fields-title" className="split mega">
                <span className="l">Where ideas meet</span> <span className="r">the real world.</span>
              </h2>
              <p className="fields-lede">Our interests sit across the physical and the digital. These are the questions drawing us in.</p>
            </div>

            <article className="field field-1">
              <Poster id="s4" className="flow-media" />
              <div className="plate">
                <p className="micro mono">Manufacturing &amp; materials</p>
                <h3 className="h3 voice-l">New ways of making.</h3>
                <p>How can new tools, processes, and materials change what we make, and how we make it?</p>
              </div>
              <ul className="tags mono">
                <li>Fabrication</li>
                <li>Prototyping</li>
                <li>Process</li>
              </ul>
            </article>

            <article className="field field-2">
              <Poster id="s5" className="flow-media" />
              <div className="plate">
                <p className="micro mono"><span>Digital</span> <span>Artificial intelligence</span></p>
                <h3 className="h3 voice-r">New ways of thinking.</h3>
                <p>Where can intelligent software help people solve problems, make decisions, and build something useful?</p>
              </div>
              <ul className="tags mono">
                <li>Applied AI</li>
                <li>Automation</li>
                <li>Human + machine</li>
              </ul>
            </article>

            <div className="between">
              <Poster id="s6m" className="flow-media" />
              <p className="micro mono between-label">The space between</p>
              <h3 className="giga">Intelligence, applied to industry.</h3>
              <p className="between-copy">Some of the most interesting questions live where disciplines meet. We intend to spend time there.</p>
            </div>
          </div>
        </section>

        <section className="ch ch-process" aria-labelledby="process-title" data-ch="3">
          <div className="pin">
            <div className="track">
              <div className="track-intro">
                <h2 id="process-title" className="mega unified">An open mind. A practical instinct.</h2>
                <p>We give ideas room to develop, then put them in contact with reality.</p>
              </div>
              <article className="station">
                <span className="num" aria-hidden="true">01</span>
                <h3>Ask better questions.</h3>
                <p>Look closely. Challenge the assumption. Find the part of a problem that deserves another look.</p>
              </article>
              <article className="station">
                <span className="num" aria-hidden="true">02</span>
                <h3>Make it tangible.</h3>
                <p>Move from an idea to something we can test: a model, a prototype, a piece of software, or a different process.</p>
              </article>
              <article className="station">
                <span className="num" aria-hidden="true">03</span>
                <h3>Follow the evidence.</h3>
                <p>Learn what works, change what doesn&apos;t, and decide which ideas are worth taking further.</p>
              </article>
              <p className="track-end mono">The next chapter is open.</p>
            </div>
          </div>
        </section>

        <section className="ch ch-closer" aria-labelledby="closer-title" data-ch="4">
          <div className="pin">
            <div className="flow-media flow-closer" aria-hidden="true">
              <Poster id="s8" />
              <Poster id="s8end" />
            </div>
            <h2 id="closer-title" className="split giga converge">
              <span className="l">Built to see</span> <span className="r">what&apos;s possible.</span>
            </h2>
            <p className="closer-sub">New questions. Different disciplines. The same instinct to explore.</p>
          </div>
        </section>

        <footer className="ch ch-foot" aria-labelledby="foot-title" data-ch="5">
          <div className="foot-map" role="img" aria-labelledby="foot-title">
            <div className="foot-map-svg" />
            <span className="map-label map-tollway mono" aria-hidden="true">N Tollway</span>
            <span className="map-label map-legacy mono" aria-hidden="true">Legacy Dr</span>
            <span className="map-label map-dallas mono" aria-hidden="true">Dallas</span>
            <span className="map-pin" aria-hidden="true" />
            <span className="map-coord mono" aria-hidden="true">33.0768 / -96.8247</span>
            <span className="map-num map-num-a mono" aria-hidden="true">7250</span>
            <span className="map-num map-num-b mono" aria-hidden="true">400</span>
            <span className="map-num map-num-c mono" aria-hidden="true">75024</span>
          </div>
          <h2 id="foot-title" className="mega unified foot-title">Proudly built and based in Dallas, Texas, USA.</h2>
          <div className="foot-l">
            <p className="micro mono">Office <span>Plano, TX</span></p>
            <address>7250 Dallas Pkwy, Suite 400<br />Plano, TX 75024</address>
            <a className="foot-link" href={MAPS_URL} target="_blank" rel="noreferrer">Open in Google Maps</a>
          </div>
          <div className="foot-r">
            <a className="foot-link" href="mailto:hello@517industries.com">hello@517industries.com</a>
            <p>Texas, USA</p>
          </div>
          <a className="foot-osm mono" href={OSM_URL} target="_blank" rel="noreferrer">Map data © OpenStreetMap contributors</a>
          <img className="foot-logo" src="/assets/517_compact_White.svg" width="850" height="320" alt="517 Industries" loading="lazy" />
        </footer>
      </main>
    </div>
  );
}
