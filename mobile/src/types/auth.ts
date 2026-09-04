import type { LoginResponse, RefreshResponse } from "@gestor-rrhh/shared";

export type AuthUser = Extract<LoginResponse, { outcome: "ok" }>["user"];

export type AuthTokens = Pick<RefreshResponse, "accessToken" | "refreshToken">;

export interface AuthStoreState {
  loading: boolean;
  authenticated: boolean;
  user: AuthUser | null;
}

export interface AuthStoreActions {
  login: (email: string, password: string) => Promise<LoginResponse["outcome"]>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export type AuthStore = AuthStoreState & AuthStoreActions;
