"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import ThemeToggle from "../components/theme-toggle";

type LoginTab = "credenciales" | "nfc";

export default function LoginPage() {
  const [tab, setTab] = useState<LoginTab>("credenciales");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nfcUid, setNfcUid] = useState("");
  const [nfcError, setNfcError] = useState("");
  const [nfcLoading, setNfcLoading] = useState(false);
  const nfcInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (nfcInputRef.current) {
      nfcInputRef.current.setAttribute("autocomplete", "off");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Acceso denegado. Revisa tus credenciales.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Ocurrio un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNfcLogin = async () => {
    const uid = nfcUid.trim();
    setNfcError("");

    if (!uid) {
      setNfcError("Acerca tu tarjeta al lector.");
      return;
    }

    setNfcLoading(true);
    try {
      const result = await signIn("nfc", {
        uid,
        redirect: false,
      });

      if (result?.error) {
        setNfcError("Tarjeta no reconocida.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setNfcError("No se pudo iniciar sesion con tarjeta.");
    } finally {
      setNfcLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[color:var(--app-bg)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_55%)]" />
      <div className="absolute inset-x-0 top-6 flex justify-end px-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[2.5rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg">
              <Image
                src="/brand/suma3-logo.jpeg"
                alt="suma3 consultores"
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                suma3 consultores
              </p>
              <p className="text-lg font-semibold text-[color:var(--text-primary)]">
                mdmm
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">
              Iniciar sesion
            </h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Accede con tu correo corporativo o tarjeta NFC.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-[color:var(--surface-muted)] p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("credenciales")}
              className={`rounded-2xl px-4 py-2 font-semibold transition ${
                tab === "credenciales"
                  ? "bg-white text-[color:var(--text-primary)] shadow"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              Credenciales
            </button>
            <button
              type="button"
              onClick={() => setTab("nfc")}
              className={`rounded-2xl px-4 py-2 font-semibold transition ${
                tab === "nfc"
                  ? "bg-white text-[color:var(--text-primary)] shadow"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              Acceso NFC
            </button>
          </div>

          {tab === "credenciales" ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                  Correo electronico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                  Contrasena
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 pr-12 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[color:var(--card-border)] bg-[color:var(--surface)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200/60 transition hover:bg-teal-600 disabled:opacity-60"
              >
                {isLoading ? "Validando..." : "Iniciar sesion"}
              </button>

              <div className="text-center text-xs text-[color:var(--text-muted)]">
                <a href="/forgot-password" className="hover:text-sky-600">
                  Has olvidado la contrasena?
                </a>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              {nfcError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {nfcError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[color:var(--text-secondary)]">
                  UID tarjeta
                </label>
                <input
                  ref={nfcInputRef}
                  type="text"
                  value={nfcUid}
                  onChange={(e) => setNfcUid(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleNfcLogin();
                    }
                  }}
                  placeholder="Pasa la tarjeta por el lector"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-transparent px-4 py-3 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <button
                type="button"
                onClick={() => nfcInputRef.current?.focus()}
                className="w-full rounded-2xl border border-[color:var(--card-border)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
              >
                Activar lector
              </button>
              <button
                type="button"
                onClick={handleNfcLogin}
                disabled={nfcLoading}
                className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {nfcLoading ? "Leyendo tarjeta..." : "Entrar con tarjeta"}
              </button>
            </div>
          )}

          <div className="mt-8 text-center text-[11px] text-[color:var(--text-muted)]">
            Sistema de administracion multi-empresa
          </div>
        </div>
      </div>
    </main>
  );
}
