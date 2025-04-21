"use server";
import { cookies } from "next/headers";
export const setCookie = async (name: string, value: string, days: number) => {
  const { set } = await cookies();
  set(name, value, {
    expires: new Date(new Date().getTime() + 60 * 60 * 23 * 1000),
  });
};


export const clearCookie = async () => {
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