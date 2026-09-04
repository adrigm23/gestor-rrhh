export * from "./types";
export { PrismaFichajesEmpresaService } from "./service";

import { PrismaFichajesEmpresaService } from "./service";
import type { FichajesEmpresaService } from "./types";

export const fichajesEmpresaService: FichajesEmpresaService = new PrismaFichajesEmpresaService();
