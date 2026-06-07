"use client";

import { useState } from "react";

interface PosterImageProps {
  src: string;
  alt: string;
}

export function PosterImage({ src, alt }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-surface-muted px-4 text-center">
        <span className="text-3xl text-disabled" aria-hidden="true">
          🎬
        </span>
        <p className="text-sm text-muted">Poster unavailable</p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- posters come from many external hosts
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}
