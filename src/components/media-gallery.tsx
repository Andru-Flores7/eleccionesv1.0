import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

export type MediaItem = { type: "photo" | "video"; url: string };

export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    // Google Drive
    if (u.hostname.includes("drive.google.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const driveIdIndex = parts.indexOf("d");
      if (driveIdIndex >= 0 && parts[driveIdIndex + 1]) {
        return `https://drive.google.com/file/d/${parts[driveIdIndex + 1]}/preview`;
      }
      const id = u.searchParams.get("id");
      if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }
    return url;
  } catch {
    return url;
  }
}

export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export function MediaGallery({
  media,
  fallbackPhoto,
  alt,
}: {
  media: MediaItem[];
  fallbackPhoto?: string | null;
  alt: string;
}) {
  const items: MediaItem[] =
    media && media.length > 0
      ? media
      : fallbackPhoto
        ? [{ type: "photo", url: fallbackPhoto }]
        : [];

  const [i, setI] = useState(0);
  if (items.length === 0) {
    return <div className="h-full w-full bg-gradient-gold" />;
  }
  const current = items[Math.min(i, items.length - 1)];
  const prev = () => setI((v) => (v - 1 + items.length) % items.length);
  const next = () => setI((v) => (v + 1) % items.length);

  return (
    <div className="relative h-full w-full bg-black">
      {current.type === "photo" ? (
        <img src={current.url} alt={alt} className="h-full w-full object-contain" />
      ) : isDirectVideo(current.url) ? (
        <video src={current.url} controls playsInline className="h-full w-full object-contain" />
      ) : (
        <iframe
          src={toEmbedUrl(current.url)}
          title={alt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      )}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-gold backdrop-blur hover:bg-black/80"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-gold backdrop-blur hover:bg-black/80"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {items.map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Ir a ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-gold" : "w-1.5 bg-white/50"
                }`}
              >
                {m.type === "video" && idx === i ? <Play className="hidden" /> : null}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
