export * from "./types";
export { PrismaModificacionFichajeService } from "./service";

import { PrismaModificacionFichajeService } from "./service";
import type { ModificacionFichajeService } from "./types";

export const modificacionFichajeService: ModificacionFichajeService = new PrismaModificacionFichajeService();
