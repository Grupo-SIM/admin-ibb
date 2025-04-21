import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("token");
  const response = NextResponse.next();

  // Verifica se a rota é publica
  if (request.nextUrl.pathname === "/") {
    // Se o usuario esta logado e tenta acessar a pagina de login, redireciona para o dashboard
    if (authCookie) {
      const queryParams = request.nextUrl.search;
      return NextResponse.redirect(
        request.nextUrl.origin + "/admin" + queryParams
      );
    }
    return response;
  }

  // Verifica se o usuario não esta logado e redireciona para o login
  if (!authCookie) {
    if (
      request.nextUrl.pathname !== "/" &&
      request.nextUrl.pathname !== "/test" /* &&
      request.nextUrl.pathname !== "/recover" */
    ) {
      const queryParams = request.nextUrl.search;
      return NextResponse.redirect(
        request.nextUrl.origin + "/" + queryParams
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|auto-login|_next/static|_next/image|favicon.ico|assets|icons|logo.png|images|videos|locales|manifest.json|sw.js|logo1024.png|scripts|styles).*)",
  ],
};
