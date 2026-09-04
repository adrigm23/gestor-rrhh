import { useEffect, useState } from "react";

/**
 * Cuenta el tiempo transcurrido desde `startIso`, descontando la pausa
 * activa en curso (`pauseStartIso`) y las pausas ya cerradas anteriores en
 * la misma jornada (`pauseAccumulatedMs`, de GET /fichajes/status —
 * expuesto desde la Fase 2.17, antes era una aproximación conocida que no
 * las descontaba).
 */
export function useElapsedMs(
  startIso: string | null,
  pauseStartIso: string | null = null,
  pauseAccumulatedMs = 0,
): number {
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
      setElapsedMs(Math.max(0, now - start - livePause - pauseAccumulatedMs));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startIso, pauseStartIso, pauseAccumulatedMs]);

  return elapsedMs;
}

export function formatElapsed(ms: number, showSeconds = true): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return showSeconds
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}`;
}
