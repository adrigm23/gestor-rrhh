export * from "./types";
export { PrismaEmpresaService } from "./service";

import { PrismaEmpresaService } from "./service";
import type { EmpresaService } from "./types";

export const empresaService: EmpresaService = new PrismaEmpresaService();
