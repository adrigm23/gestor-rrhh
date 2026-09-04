export * from "./types";
export { PrismaUsuarioService } from "./service";

import { PrismaUsuarioService } from "./service";
import type { UsuarioService } from "./types";

export const usuarioService: UsuarioService = new PrismaUsuarioService();
