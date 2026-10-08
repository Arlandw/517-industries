import { SiteMotion } from "@/components/site-motion";
import { ScrollRidges } from "@/components/scroll-ridges";

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="arrow"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.4" /></svg>
);

const FLAG_STARS = [1.7, 3.5, 5.3, 7.1, 8.9].flatMap((cy, row) =>
  (row % 2 ? [3.65, 6.55, 9.45, 12.35] : [2.2, 5.1, 8, 10.9, 13.8]).map((cx) => ({ cx, cy })),
);

const Flag = () => (
  <svg className="footer-flag" viewBox="0 0 38 20" width="28" height="15" aria-hidden="true" focusable="false">
    <path className="footer-flag-stripes" d="M0 0h38v1.54H0zM0 3.08h38v1.54H0zM0 6.16h38v1.54H0zM0 9.24h38v1.54H0zM0 12.32h38v1.54H0zM0 15.4h38v1.54H0zM0 18.48h38V20H0z" />
    <rect className="footer-flag-canton" width="15.2" height="10.77" />
    <g className="footer-flag-stars">
      {FLAG_STARS.map(({ cx, cy }) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.42" />)}
    </g>
  </svg>
);

export default function Home() {
  return (
    <>
      <SiteMotion />
      <ScrollRidges />
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a href="#top" className="brand-link" aria-label="517 Industries home"><img src="/assets/517-wordmark.svg" alt="517 Industries" width="780" height="82" /></a>
        <span className="header-descriptor mono">Independent R&amp;D</span>
        <nav aria-label="Main navigation"><a href="#company">Company</a><a href="#exploration">Exploration</a><a href="#approach">Approach</a></nav>
      </header>
      <main id="main" className="terrain-page">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy hero-enter">
            <p className="eyebrow mono">Independent research <span>/</span> Open possibility</p>
            <h1 id="hero-title">Curiosity,<br />put to work.</h1>
            <p className="hero-intro">Exploring manufacturing, artificial intelligence,<br className="desktop-break" /> and the possibilities between.</p>
            <a className="text-link" href="#exploration">Explore our direction <Arrow /></a>
          </div>
          <div className="hero-foot mono"><span>Manufacturing <span aria-hidden="true">/</span> Artificial intelligence</span><span className="study-label">An open field of possibility</span></div>
        </section>
        <section className="company section-pad" id="company" aria-labelledby="company-title">
          <div className="section-heading reveal" data-reveal><p className="eyebrow mono"><span className="section-number">01</span> The company</p><span className="mono aside-label">An independent point of view</span></div>
          <div className="company-grid reveal" data-reveal>
            <h2 id="company-title">Room to think.<br /><span>Reason to build.</span></h2>
            <div className="company-copy"><p>517 Industries is an independent research and development company exploring how things are made, how systems think, and what happens when the two come together.</p><p>We start with questions worth asking. Then we explore, experiment, and follow the ideas that earn a next step. The work can take different forms. The curiosity stays constant.</p></div>
          </div>
          <div className="company-baseline mono reveal" data-reveal><span>A company built for discovery.</span><span>Open by design.</span></div>
        </section>
        <section className="exploration section-pad" id="exploration" aria-labelledby="exploration-title">
          <div className="section-heading reveal" data-reveal><p className="eyebrow mono"><span className="section-number">02</span> Areas of exploration</p><span className="mono aside-label">A starting point. An open horizon.</span></div>
          <div className="section-intro reveal" data-reveal><h2 id="exploration-title">Where ideas<br />meet the real world.</h2><p>Our interests sit across the physical and the digital. These are the questions drawing us in.</p></div>
          <div className="focus-grid">
            <article className="focus-panel reveal" data-reveal>
              <div className="focus-meta mono"><span>Field 01</span><span>Physical</span></div>
              <h3>New ways<br />of making.</h3>
              <p className="focus-category">Manufacturing &amp; materials</p>
              <p>How can new tools, processes, and materials change what we make, and how we make it?</p>
              <div className="focus-topics mono"><span>Fabrication</span><span>Prototyping</span><span>Process</span></div>
            </article>
            <article className="focus-panel reveal reveal-delay" data-reveal>
              <div className="focus-meta mono"><span>Field 02</span><span>Digital</span></div>
              <h3>New ways<br />of thinking.</h3>
              <p className="focus-category">Artificial intelligence</p>
              <p>Where can intelligent software help people solve problems, make decisions, and build something useful?</p>
              <div className="focus-topics mono"><span>Applied AI</span><span>Automation</span><span>Human + machine</span></div>
            </article>
          </div>
          <div className="intersection reveal" data-reveal><span className="mono">The space between</span><h3>Intelligence, applied to industry.</h3><p>Some of the most interesting questions live where disciplines meet. We intend to spend time there.</p></div>
        </section>
        <section className="approach section-pad" id="approach" aria-labelledby="approach-title">
          <div className="section-heading reveal" data-reveal><p className="eyebrow mono"><span className="section-number">03</span> The approach</p><span className="mono aside-label">Let the work lead.</span></div>
          <div className="approach-grid">
            <div className="approach-intro reveal" data-reveal><h2 id="approach-title">An open mind.<br />A practical instinct.</h2><p>We give ideas room to develop, then put them in contact with reality.</p></div>
            <ol className="method-list">
              <li className="reveal" data-reveal><span className="mono">01 /</span><div><h3>Ask better questions.</h3><p>Look closely. Challenge the assumption. Find the part of a problem that deserves another look.</p></div></li>
              <li className="reveal" data-reveal><span className="mono">02 /</span><div><h3>Make it tangible.</h3><p>Move from an idea to something we can test: a model, a prototype, a piece of software, or a different process.</p></div></li>
              <li className="reveal" data-reveal><span className="mono">03 /</span><div><h3>Follow the evidence.</h3><p>Learn what works, change what doesn’t, and decide which ideas are worth taking further.</p></div></li>
            </ol>
          </div>
        </section>
        <section className="closing section-pad" id="closing" aria-labelledby="closing-title"><div className="reveal" data-reveal><p className="eyebrow mono">The next chapter is open.</p><h2 id="closing-title">Built to see<br />what’s possible.</h2><p>New questions. Different disciplines.<br />The same instinct to explore.</p></div><a className="text-link" href="#top">Back to the beginning <Arrow diagonal /></a></section>
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <a className="footer-brand" href="#top" aria-label="517 Industries — back to top">
            <img src="/assets/517-wordmark.svg" alt="517 Industries" width="780" height="82" loading="lazy" />
          </a>
          <p>Independent research.<br />Open-ended possibility.</p>
        </div>
        <div className="footer-bottom mono">
          <div className="footer-contact">
            <a href="mailto:hello@517industries.com">hello@517industries.com</a>
            <span className="footer-place">Texas, USA</span>
          </div>
          <div className="footer-made"><Flag /><span>Built in America</span></div>
          <span>© {new Date().getFullYear()} 517 Industries</span>
          <span>Research &amp; development</span>
          <span>Manufacturing / Artificial intelligence</span>
        </div>
      </footer>
    </>
  );
}
