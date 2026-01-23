"use client";

import { useEffect, useState } from "react";

type PausaTimerProps = {
  pauseAccumulatedMs?: number;
  pauseStartIso?: string | null;
  className?: string;
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} Hrs`;
};

export default function PausaTimer({
  pauseAccumulatedMs = 0,
  pauseStartIso,
  className,
}: PausaTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(pauseAccumulatedMs);

  useEffect(() => {
    const pauseStart = pauseStartIso ? new Date(pauseStartIso).getTime() : null;
    const update = () => {
      const now = Date.now();
      const livePause = pauseStart ? Math.max(0, now - pauseStart) : 0;
      setElapsedMs(pauseAccumulatedMs + livePause);
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [pauseAccumulatedMs, pauseStartIso]);

  return (
    <span className={className} suppressHydrationWarning>
      {formatDuration(elapsedMs)}
    </span>
  );
}
