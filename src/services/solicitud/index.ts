export * from "./types";
export { PrismaSolicitudService } from "./service";

import { PrismaSolicitudService } from "./service";
import type { SolicitudService } from "./types";

export const solicitudService: SolicitudService = new PrismaSolicitudService();
