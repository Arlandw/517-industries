import type { CSSProperties } from "react";
import { AltNav } from "@/components/alt/alt-nav";
import { AltMotion, AltMotionToggle } from "@/components/alt/alt-motion";
import { Icon } from "@/components/alt/icons";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=7250+Dallas+Pkwy+Suite+400+Plano+TX+75024";

const TAGLINE = [
  "Some of the most interesting questions",
  "live where disciplines meet.",
  "We intend to spend time there.",
].reduce<{ line: string; words: { word: string; index: number }[] }[]>((lines, line) => {
  const start = lines.reduce((count, entry) => count + entry.words.length, 0);
  return [...lines, { line, words: line.split(" ").map((word, offset) => ({ word, index: start + offset })) }];
}, []);

const FIELDS = [
  {
    slot: "field-physical",
    image: "physical",
    number: "Field 01",
    kind: "Physical",
    title: ["New ways", "of making."],
    category: "Manufacturing & materials",
    body: "How can new tools, processes, and materials change what we make, and how we make it?",
    topics: ["Fabrication", "Prototyping", "Process"],
  },
  {
    slot: "field-digital",
    image: "digital",
    number: "Field 02",
    kind: "Digital",
    title: ["New ways", "of thinking."],
    category: "Artificial intelligence",
    body: "Where can intelligent software help people solve problems, make decisions, and build something useful?",
    topics: ["Applied AI", "Automation", "Human + machine"],
  },
] as const;

const STEPS = [
  { title: "Ask better questions.", body: "Look closely. Challenge the assumption. Find the part of a problem that deserves another look." },
  { title: "Make it tangible.", body: "Move from an idea to something we can test: a model, a prototype, a piece of software, or a different process." },
  { title: "Follow the evidence.", body: "Learn what works, change what doesn’t, and decide which ideas are worth taking further." },
] as const;

const delay = (index: number) => ({ "--d": index } as CSSProperties);

function SectionLabel({ number, label, aside }: { number: string; label: string; aside?: string }) {
  return (
    <div className="alt-section-label" data-alt-reveal>
      <p><span className="alt-section-number">{number}</span>{label}</p>
      {aside ? <p className="alt-section-aside">{aside}</p> : null}
    </div>
  );
}

// Image slots: every generated visual sits in an element with data-image-slot so it can be swapped
// without touching layout. Files live in public/alt/img as <slot>-<width>.webp.
export function AltView() {
  return (
    <div className="alt" id="alt-root">
      <AltMotion />
      <a className="alt-skip" href="#alt-main">Skip to content</a>
      <AltNav />

      <main id="alt-main">
        <section className="alt-hero" id="top" aria-labelledby="alt-hero-title">
          <div className="alt-hero-shell">
            <div className="alt-hero-media" data-image-slot="hero">
              <img
                src="/alt/img/hero-1600.webp"
                srcSet="/alt/img/hero-960.webp 960w, /alt/img/hero-1600.webp 1600w, /alt/img/hero-2400.webp 2400w"
                sizes="100vw"
                width="2688"
                height="1520"
                alt=""
                fetchPriority="high"
                decoding="async"
              />
            </div>
            <div className="alt-hero-copy">
              <p className="alt-eyebrow alt-appear" style={delay(1)}>Independent research <span className="alt-nowrap"><span className="alt-sep" aria-hidden="true">/</span> Open possibility</span></p>
              <h1 id="alt-hero-title" className="alt-hero-title">
                <span className="alt-appear" style={delay(2)}>Curiosity,</span>
                <span className="alt-appear" style={delay(3)}>put to work.</span>
              </h1>
              <p className="alt-hero-sub alt-appear" style={delay(4)}>Exploring manufacturing, artificial intelligence,<br className="alt-br-wide" /> and the possibilities between.</p>
              <div className="alt-hero-actions alt-appear" style={delay(5)}>
                <a className="alt-button alt-button-primary" href="#exploration">Explore our direction <Icon name="arrowRight" /></a>
              </div>
            </div>
            <div className="alt-hero-proof alt-appear" style={delay(6)}>
              <span>Manufacturing <span className="alt-nowrap"><span className="alt-sep" aria-hidden="true">/</span> Artificial intelligence</span></span>
              <span className="alt-hero-proof-aside">An open field of possibility</span>
            </div>
          </div>
        </section>

        <section className="alt-section alt-company" id="company" aria-labelledby="alt-company-title">
          <SectionLabel number="01" label="The company" aside="An independent point of view" />
          <div className="alt-split">
            <h2 id="alt-company-title" data-alt-reveal>Room to think.<br /><span className="alt-muted">Reason to build.</span></h2>
            <div className="alt-company-copy" data-alt-reveal>
              <p className="alt-lead">517 Industries is an independent research and development company exploring how things are made, how systems think, and what happens when the two come together.</p>
              <p>We start with questions worth asking. Then we explore, experiment, and follow the ideas that earn a next step. The work can take different forms. The curiosity stays constant.</p>
            </div>
          </div>
          <div className="alt-baseline" data-alt-reveal>
            <span>A company built for discovery.</span>
            <span>Open by design.</span>
          </div>
        </section>

        <section className="alt-section alt-exploration" id="exploration" aria-labelledby="alt-exploration-title">
          <SectionLabel number="02" label="Areas of exploration" aside="A starting point. An open horizon." />
          <div className="alt-split alt-split-end" data-alt-reveal>
            <h2 id="alt-exploration-title">Where ideas<br />meet the real world.</h2>
            <p className="alt-body-lg">Our interests sit across the physical and the digital. These are the questions drawing us in.</p>
          </div>
          <div className="alt-fields">
            {FIELDS.map((field, index) => (
              <article key={field.slot} className="alt-card alt-field" data-alt-reveal="card" style={delay(index)}>
                <div className="alt-card-media" data-image-slot={field.slot}>
                  <img
                    src={`/alt/img/${field.image}-800.webp`}
                    srcSet={`/alt/img/${field.image}-800.webp 800w, /alt/img/${field.image}-1400.webp 1400w`}
                    sizes="(min-width: 1100px) 640px, (min-width: 768px) 50vw, 100vw"
                    width="2336"
                    height="1744"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="alt-field-body">
                  <div className="alt-meta"><span>{field.number}</span><span>{field.kind}</span></div>
                  <h3>{field.title[0]}<br />{field.title[1]}</h3>
                  <p className="alt-field-category">{field.category}</p>
                  <p>{field.body}</p>
                  <ul className="alt-topics" aria-label={`${field.category} topics`}>
                    {field.topics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="alt-section alt-tagline" aria-labelledby="alt-tagline-title">
          <div className="alt-tagline-head" data-alt-reveal>
            <p className="alt-eyebrow">The space between</p>
            <h2 id="alt-tagline-title" className="alt-tagline-kicker">Intelligence, applied to industry.</h2>
          </div>
          <p className="alt-tagline-text">
            {TAGLINE.map(({ line, words }) => (
              <span key={line} className="alt-tagline-line">
                {words.map(({ word, index }) => <span key={index} className="alt-tagline-word" style={delay(index)}>{word} </span>)}
              </span>
            ))}
          </p>
        </section>

        <section className="alt-section alt-approach" id="approach" aria-labelledby="alt-approach-title">
          <SectionLabel number="03" label="The approach" aside="Let the work lead." />
          <div className="alt-split alt-split-end" data-alt-reveal>
            <h2 id="alt-approach-title">An open mind.<br />A practical instinct.</h2>
            <p className="alt-body-lg">We give ideas room to develop, then put them in contact with reality.</p>
          </div>
          <ol className="alt-steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="alt-card alt-step" data-alt-reveal="card" style={delay(index)}>
                <span className="alt-step-number" aria-hidden="true">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="alt-section alt-base" id="dallas" aria-labelledby="alt-base-title">
          <SectionLabel number="04" label="Where we are" />
          <h2 id="alt-base-title" className="alt-base-title" data-alt-reveal>Proudly built and based in<br className="alt-br-wide" /> Dallas, Texas, USA.</h2>
          <div className="alt-office">
            <div className="alt-card alt-office-details" data-alt-reveal="card">
              <div className="alt-meta"><span>Office</span><span>Plano, TX</span></div>
              <address>
                <span>7250 Dallas Pkwy, Suite 400</span>
                <span className="alt-muted">Plano, TX 75024</span>
              </address>
              <a className="alt-button alt-button-secondary" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Open in Google Maps <Icon name="arrowUpRight" /></a>
            </div>
            <figure className="alt-card alt-office-map" data-alt-reveal="card" style={delay(1)}>
              <div className="alt-map-frame">
                <img src="/assets/office-map.svg" width="800" height="560" loading="lazy" decoding="async" alt="Street map of the Legacy area of Plano, Texas, with a pin at 7250 Dallas Parkway, beside the Dallas North Tollway and Legacy Drive." />
                <span className="alt-map-label alt-map-label-tollway" aria-hidden="true">Dallas N Tollway</span>
                <span className="alt-map-label alt-map-label-legacy" aria-hidden="true">Legacy Dr</span>
                <span className="alt-map-pin" aria-hidden="true"><Icon name="mapPin" /></span>
              </div>
              <figcaption>Map data <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></figcaption>
            </figure>
          </div>
        </section>

        <section className="alt-section alt-closing" id="closing" aria-labelledby="alt-closing-title">
          <div className="alt-closing-card" data-alt-reveal="card">
            <div className="alt-closing-media" data-image-slot="closing-horizon">
              <img
                src="/alt/img/horizon-1200.webp"
                srcSet="/alt/img/horizon-1200.webp 1200w, /alt/img/horizon-2400.webp 2400w"
                sizes="100vw"
                width="2688"
                height="1152"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="alt-closing-copy">
              <p className="alt-eyebrow">The next chapter is open.</p>
              <h2 id="alt-closing-title">Built to see<br />what’s possible.</h2>
              <p className="alt-closing-sub">New questions. Different disciplines.<br />The same instinct to explore.</p>
              <div className="alt-closing-actions">
                <a className="alt-button alt-button-dark" href="mailto:hello@517industries.com"><Icon name="envelope" /> hello@517industries.com</a>
                <a className="alt-button alt-button-ghost" href="#top">Back to the beginning <Icon name="arrowUp" /></a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="alt-footer">
        <div className="alt-footer-top">
          <a className="alt-footer-brand" href="#top" aria-label="517 Industries, back to top">
            <img src="/assets/517-wordmark.svg" alt="" width="780" height="82" loading="lazy" />
          </a>
          <p>Independent research.<br />Open possibility.</p>
        </div>
        <div className="alt-footer-bottom">
          <a href="mailto:hello@517industries.com">hello@517industries.com</a>
          <span>Texas, USA</span>
          <span>Research &amp; development</span>
          <span>Manufacturing / Artificial intelligence</span>
          <span>© {new Date().getFullYear()} 517 Industries</span>
          <a href="https://517industries.com/">Current site</a>
        </div>
      </footer>

      <AltMotionToggle />
    </div>
  );
}
