import type { SeamState } from "./state";
import { loadVideo, unloadVideo } from "./video";

// Flow layout: mobile, reduced motion and the no-WebGL fallback. Posters per chapter,
// CSS clip-path wipes in place of the molten dissolve, and one hero loop.
export function initFlow(root: HTMLElement, st: SeamState) {
  const media = Array.from(root.querySelectorAll<HTMLElement>(".flow-media:not(.flow-hero)"));
  media.forEach((m) => m.classList.add("is-wipe"));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
    { rootMargin: "0px 0px -12% 0px" },
  );
  media.forEach((m) => io.observe(m));

  const closer = root.querySelector<HTMLElement>(".flow-closer");
  const onScroll = () => {
    if (!closer) return;
    const r = closer.getBoundingClientRect();
    closer.classList.toggle("is-end", r.top + r.height / 2 < innerHeight * 0.45);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Only the hero loop ever plays in flow, and never under data saver.
  let video: HTMLVideoElement | null = null;
  let videoUrl = "";
  if (!st.saveData) {
    const host = st.narrow ? root.querySelector<HTMLElement>(".flow-hero") : root.querySelector<HTMLElement>(".seam-poster-l");
    if (host) {
      video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("aria-hidden", "true");
      videoUrl = st.narrow ? "/alt/seam/video/s9-loop.h264.mp4" : "/alt/seam/video/s1-loop.h264.mp4";
      host.appendChild(video);
    }
  }
  const sync = () => {
    if (!video) return;
    video.autoplay = !st.paused;
    if (st.paused) {
      video.pause();
      return;
    }
    if (videoUrl) {
      loadVideo(video, videoUrl);
      videoUrl = "";
    }
    video.play().catch(() => {});
  };
  sync();

  return {
    setPaused(p: boolean) {
      st.paused = p;
      sync();
    },
    destroy() {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      media.forEach((m) => m.classList.remove("is-wipe", "is-in"));
      closer?.classList.remove("is-end");
      if (video) unloadVideo(video);
      video?.remove();
    },
  };
}
