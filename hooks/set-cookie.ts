"use server";
import { cookies } from "next/headers";
import { authorizeFinance } from '@/services/finance-auth';

export const setCookie = async (name: string, value: string, days: number) => {
  if (!["token", "roles"].includes(name)) throw new Error("Cookie não permitido");
  // Legacy callers can migrate a token only after trusted backend verification.
  if (name === "token") await authorizeFinance(value);
  (await cookies()).set(name, value, {
    maxAge: 23 * 60 * 60, httpOnly: name === "token", sameSite: "lax",
    secure: process.env.NODE_ENV === "production", path: "/",
  });
};
export const clearCookie = async () => {
  const store = await cookies();
  store.delete("token"); store.delete("roles"); store.delete("finance-session");
};
export const getCookie = async (name: string) => (await cookies()).get(name);
