"use client";

import { useEffect, useState } from "react";

type FichajeTimerProps = {
  startIso?: string | null;
  className?: string;
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} Hrs`;
};

export default function FichajeTimer({ startIso, className }: FichajeTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startIso) {
      setElapsedMs(0);
      return;
    }

    const start = new Date(startIso).getTime();
    const update = () => setElapsedMs(Date.now() - start);

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [startIso]);

  return (
    <span className={className} suppressHydrationWarning>
      {startIso ? formatDuration(elapsedMs) : "00:00 Hrs"}
    </span>
  );
}

