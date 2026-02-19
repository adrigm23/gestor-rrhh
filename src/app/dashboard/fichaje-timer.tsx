"use client";

import { useEffect, useState } from "react";

type FichajeTimerProps = {
  startIso?: string | null;
  pauseAccumulatedMs?: number;
  pauseStartIso?: string | null;
  className?: string;
  showSeconds?: boolean;
  showSuffix?: boolean;
  highlightSeconds?: boolean;
  secondsClassName?: string;
};

const formatParts = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
};

const formatDuration = (
  ms: number,
  options: { showSeconds: boolean; showSuffix: boolean },
) => {
  const parts = formatParts(ms);
  const base = options.showSeconds
    ? `${parts.hours}:${parts.minutes}:${parts.seconds}`
    : `${parts.hours}:${parts.minutes}`;
  return options.showSuffix ? `${base} Hrs` : base;
};

export default function FichajeTimer({
  startIso,
  pauseAccumulatedMs = 0,
  pauseStartIso,
  className,
  showSeconds = false,
  showSuffix = true,
  highlightSeconds = false,
  secondsClassName,
}: FichajeTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startIso) {
      setElapsedMs(0);
      return;
    }

    const start = new Date(startIso).getTime();
    const pauseStart = pauseStartIso ? new Date(pauseStartIso).getTime() : null;
    const update = () => {
      const now = Date.now();
      const livePause = pauseStart ? Math.max(0, now - pauseStart) : 0;
      setElapsedMs(Math.max(0, now - start - pauseAccumulatedMs - livePause));
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [pauseAccumulatedMs, pauseStartIso, startIso]);

  const displayMs = startIso ? elapsedMs : 0;
  const parts = formatParts(displayMs);
  const fallbackLabel = formatDuration(displayMs, { showSeconds, showSuffix });
  const suffix = showSuffix ? " Hrs" : "";

  return (
    <span className={className} suppressHydrationWarning>
      {showSeconds && highlightSeconds ? (
        <>
          {parts.hours}:{parts.minutes}:
          <span className={secondsClassName ?? "text-sky-500"}>
            {parts.seconds}
          </span>
          {suffix}
        </>
      ) : (
        fallbackLabel
      )}
    </span>
  );
}

