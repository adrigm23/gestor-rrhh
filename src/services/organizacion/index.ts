export * from "./types";
export { PrismaOrganizacionService } from "./service";

import { PrismaOrganizacionService } from "./service";
import type { OrganizacionService } from "./types";

export const organizacionService: OrganizacionService = new PrismaOrganizacionService();
