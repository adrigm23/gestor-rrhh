export * from "./types";
export { PrismaResumenHorasService } from "./service";

import { PrismaResumenHorasService } from "./service";
import type { ResumenHorasService } from "./types";

export const resumenHorasService: ResumenHorasService = new PrismaResumenHorasService();
