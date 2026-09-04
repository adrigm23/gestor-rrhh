export * from "./types";
export { PrismaFichajeService } from "./service";

import { PrismaFichajeService } from "./service";
import type { FichajeService } from "./types";

export const fichajeService: FichajeService = new PrismaFichajeService();
