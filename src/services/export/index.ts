export * from "./types";
export { PrismaExportService } from "./service";

import { PrismaExportService } from "./service";
import type { ExportService } from "./types";

export const exportService: ExportService = new PrismaExportService();
