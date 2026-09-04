import { APP_NAME } from "@gestor-rrhh/shared";

if (APP_NAME !== "Gestor RRHH") {
  throw new Error(`Unexpected APP_NAME resolved from @gestor-rrhh/shared: ${APP_NAME}`);
}

console.log(`OK: @gestor-rrhh/shared resolved via npm workspaces. APP_NAME="${APP_NAME}"`);
