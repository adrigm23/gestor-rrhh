import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleFichaje, togglePausa } from "../api/fichajes";
import { NetworkError } from "../api/errors";

// Único uso legítimo de AsyncStorage en el proyecto (ver diseño de Fase 2):
// nunca tokens ni nada sensible, solo esta cola de acciones pendientes.
const STORAGE_KEY = "mobile_offline_fichaje_queue";

export type QueuedActionType = "toggleFichaje" | "togglePausa";

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
}

async function readQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Encola una acción de fichaje/pausa que falló por falta de conexión. Sin
 * coordenadas por ahora (geolocalización sigue fuera de alcance, ver diseño
 * acordado) — si se añade en el futuro, esta cola necesitará ampliarse.
 */
export async function enqueue(type: QueuedActionType): Promise<void> {
  const queue = await readQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type });
  await writeQueue(queue);
}

export async function getQueueLength(): Promise<number> {
  return (await readQueue()).length;
}

function runAction(action: QueuedAction): Promise<unknown> {
  switch (action.type) {
    case "toggleFichaje":
      return toggleFichaje();
    case "togglePausa":
      return togglePausa();
  }
}

let draining = false;

/**
 * Reproduce la cola en orden estricto (FIFO), en serie — nunca en paralelo
 * ni reordenada, porque toggle/pausa son una máquina de estados y el orden
 * importa. Si una acción falla de nuevo por NetworkError, se detiene ahí
 * mismo y deja el resto encolado intacto para el próximo intento. Si falla
 * por cualquier otro motivo (un rechazo real del servidor para esa acción
 * concreta), se descarta esa acción — no tiene sentido reintentarla
 * indefinidamente — y se continúa con las siguientes.
 */
export async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    let queue = await readQueue();
    while (queue.length > 0) {
      const [next, ...rest] = queue;
      try {
        await runAction(next);
      } catch (error) {
        if (error instanceof NetworkError) {
          return;
        }
      }
      queue = rest;
      await writeQueue(queue);
    }
  } finally {
    draining = false;
  }
}
