// Static hosts that ignore Range requests break Safari playback and make seeking coarse,
// so clips are fetched whole and played from a blob URL.
export function loadVideo(el: HTMLVideoElement, url: string) {
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    })
    .then((b) => {
      if (el.dataset.detached) return;
      el.src = URL.createObjectURL(b);
      el.load();
    })
    .catch(() => {
      el.src = url;
      el.load();
    });
}

export function unloadVideo(el: HTMLVideoElement) {
  el.dataset.detached = "1";
  el.pause();
  if (el.src.startsWith("blob:")) URL.revokeObjectURL(el.src);
  el.removeAttribute("src");
  el.load();
}
