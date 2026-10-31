"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/global";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

import { toast } from "react-toastify";

const LoginPage = () => {
  const [password, setPassword] = useState("");
  const [mail, setMail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, email: mail.trim() }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const res = await response.json();



      setSuccess(true);
      toast.success("Login realizado com sucesso!");

      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch {
      setError("Senha incorreta. Tente novamente.");
      toast.error("Senha incorreta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-400">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/01.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />

      <div className="w-full max-w-[1200px] min-h-[700px] bg-white rounded-3xl overflow-hidden relative z-10 flex shadow-2xl mx-4" style={{minHeight: 700}}>

        {/* Formulário */}
        <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-24 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-black mb-2">Login</h1>
            <p className="text-gray-500 text-sm">Entre com seu email e senha para acessar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="mail" className="text-black font-medium">Email</Label>
              <Input
                id="mail"
                type="email"
                placeholder="seu@email.com"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black shadow-sm"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-black font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black shadow-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Login realizado com sucesso! Redirecionando...</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-900 dark:bg-black dark:text-white dark:hover:bg-gray-900 rounded-xl h-11 cursor-pointer font-medium"
              disabled={isLoading || success}
            >
              {success ? (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Logado!</span>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Entrando...</span>
                </div>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        {/* Lado Direito: Imagem */}
        <div className="hidden md:flex md:w-1/2 p-4 bg-white">
          <div className="w-full rounded-2xl relative overflow-hidden flex items-end p-10" style={{minHeight: 668}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/login.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="relative z-10">
              <p className="text-white/90 text-2xl font-light leading-tight">Bem-vindo ao</p>
              <p className="text-white text-3xl font-bold leading-tight">Painel IBB</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
