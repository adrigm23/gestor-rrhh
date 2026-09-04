export * from "./types";
export { PrismaCalendarioService } from "./service";

import { PrismaCalendarioService } from "./service";
import type { CalendarioService } from "./types";

export const calendarioService: CalendarioService = new PrismaCalendarioService();
