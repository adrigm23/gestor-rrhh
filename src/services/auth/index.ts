export * from "./types";
export { JwtAuthService } from "./service";

import { JwtAuthService } from "./service";
import type { AuthService } from "./types";

export const authService: AuthService = new JwtAuthService();
