"use server";
import { cookies } from "next/headers";
import { signSession } from '@/services/finance-auth';
export const setCookie = async (name: string, value: string, days: number) => {
  if (!["token", "roles"].includes(name)) throw new Error("Cookie não permitido");
  const { set } = await cookies();
  if (name === 'token') {
    try { set('finance-session', signSession(value), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 }); }
    catch { (await cookies()).delete('finance-session'); }
  }
  set(name, value, {
    expires: new Date(new Date().getTime() + 60 * 60 * 23 * 1000),
  });
};


export const clearCookie = async () => {
  (await cookies()).delete('finance-session');
  const { set } = await cookies();
  set("token", "token", {
    expires: new Date(new Date().getTime() - 60 * 60 * 23 * 1000),
  });
  set("roles", "none", {
    expires: new Date(new Date().getTime() - 60 * 60 * 23 * 1000),
  });
};

export const getCookie = async (name: string) => {
  const { get } = await cookies();
  return get(name);
};  