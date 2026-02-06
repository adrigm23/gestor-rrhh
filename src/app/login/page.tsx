"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
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
      // Intentamos iniciar sesion con el proveedor "credentials"
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Acceso denegado. Revisa tus credenciales.");
      } else {
        // Si es correcto, mandamos al usuario al Dashboard
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1535]">
      {/* Fondo con degradado de marca */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-sky-700 to-slate-900 opacity-95" />
        {/* Formas organicas de fondo */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-teal-400/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 mx-4 w-full max-w-md rounded-[2.5rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        {/* Logo y Encabezado */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
              <Image
                src="/brand/suma3-logo.jpeg"
                alt="suma3 consultores"
                width={48}
                height={48}
                className="h-11 w-11 object-contain"
                priority
              />
            </div>
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">
                suma3 consultores
              </p>
              <p className="text-2xl font-semibold text-white">mdmm</p>
            </div>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-white">Bienvenido a mdmm</h1>
          <p className="mt-1 text-sm text-white/60">
            Control horario y gestion laboral en un solo lugar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="animate-bounce rounded-2xl border border-red-500/40 bg-red-500/20 p-4 text-center text-sm font-medium text-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="ml-1 text-sm font-medium text-white/80">
              Correo electronico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo o mail"
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-white placeholder-white/30 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-sm font-medium text-white/80">Contrasena</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-4 pr-12 text-white placeholder-white/30 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white/80 shadow-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-teal-400 py-4 font-extrabold text-slate-900 shadow-xl transition-all hover:bg-teal-300 active:scale-[0.98] disabled:bg-teal-700 disabled:opacity-50"
          >
            {isLoading ? "Validando..." : "Iniciar sesion"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4 text-xs text-white/40">
          <div className="h-px flex-1 bg-white/10" />
          <span>o</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Acceso con tarjeta NFC
            </h2>
            <p className="mt-1 text-xs text-white/60">
              Acerca tu tarjeta al lector para iniciar sesion.
            </p>
          </div>

          {nfcError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs text-red-100">
              {nfcError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
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
              inputMode="numeric"
              placeholder="Pasa la tarjeta por el lector"
              className="w-full flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:ring-2 focus:ring-teal-300"
            />
            <button
              type="button"
              onClick={() => nfcInputRef.current?.focus()}
              className="rounded-2xl border border-white/20 px-4 py-3 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10"
            >
              Activar lector
            </button>
          </div>

          <button
            type="button"
            onClick={handleNfcLogin}
            disabled={nfcLoading}
            className="flex w-full items-center justify-center rounded-2xl bg-white/15 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/25 disabled:opacity-60"
          >
            {nfcLoading ? "Leyendo tarjeta..." : "Entrar con tarjeta"}
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-white/70">
          <a href="/forgot-password" className="hover:text-white">
            Has olvidado la contrasena?
          </a>
        </div>

        {/* Footer del login */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex gap-4 text-xs font-medium text-white/50">
            <button className="transition-colors hover:text-white">
              Politica de Privacidad
            </button>
            <span>|</span>
            <button className="transition-colors hover:text-white">Aviso Legal</button>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/30">v1.7.7</p>
        </div>
      </div>
    </main>
  );
}
