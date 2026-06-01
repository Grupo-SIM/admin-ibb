// Base URL da api-machine (simpay-back) — usado para endpoints públicos e /admin/*
export const MACHINE_API_URL = "https://simpay-back.simintermediacoes.com";

// userId do Bosque/IBB no banco da api-machine (fixo - não mudar)
export const BOSQUE_USER_ID = "c7f3a2b1-d4e5-4f6a-8b9c-0d1e2f3a4b5c";

// Proxy interno Next.js — substitui chamadas diretas a /internal/* para não expor o token no browser
export const INTERNAL_API_URL = "/api/internal";

// Token interno — mantido apenas para compatibilidade (não usado no browser)
export const MACHINE_INTERNAL_TOKEN = "";
