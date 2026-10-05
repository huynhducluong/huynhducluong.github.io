const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const videoIdFromUrl = (url: URL): string | null => {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (!youtubeHosts.has(host)) return null;

  if (url.pathname === "/watch") return url.searchParams.get("v");
  const [route, videoId] = url.pathname.split("/").filter(Boolean);
  return route === "shorts" || route === "embed" || route === "live" ? videoId ?? null : null;
};

export const normalizeYouTubeUrl = (value: string): string | null => {
  const candidate = value.trim();
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid YouTube video URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Enter a valid YouTube video URL.");
  }

  const videoId = videoIdFromUrl(url);
  if (!videoId || !youtubeVideoIdPattern.test(videoId)) {
    throw new Error("Enter a valid YouTube video URL.");
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
};
