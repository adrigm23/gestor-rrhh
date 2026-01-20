"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Intentamos iniciar sesión con el proveedor 'credentials'
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
      setError("Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#8e2de2]">
      {/* Fondo con degradado inspirado en tu imagen */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-700 to-cyan-500 opacity-95" />
        {/* Formas orgánicas de fondo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-2xl mx-4">
        {/* Logo y Encabezado */}
        <div className="flex flex-col items-center mb-10">
          <div className="text-white text-4xl font-black flex items-center gap-3 mb-3 tracking-tighter">
            <span className="bg-white text-indigo-700 px-3 py-1 rounded-2xl shadow-lg">SD</span>
            OnTime
          </div>
          <h1 className="text-white text-xl font-semibold">Bienvenido a tu APP Laboral</h1>
          <p className="text-white/60 text-sm mt-1">Gestiona tu tiempo con eficacia</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-100 p-4 rounded-2xl text-sm text-center font-medium animate-bounce">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium ml-1">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com"
              className="w-full px-5 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium ml-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-800 disabled:opacity-50 text-indigo-950 font-extrabold rounded-2xl shadow-xl transition-all active:scale-[0.98] mt-4 flex justify-center items-center"
          >
            {isLoading ? "Validando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-white/70">
          <a href="/forgot-password" className="hover:text-white">
            Has olvidado la contrasena?
          </a>
        </div>

        {/* Footer del login */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex gap-4 text-xs text-white/50 font-medium">
            <button className="hover:text-white transition-colors">Política de Privacidad</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">Aviso Legal</button>
          </div>
          <p className="text-[10px] text-white/30 tracking-widest uppercase">v1.1.0</p>
        </div>
      </div>
    </main>
  );
}
