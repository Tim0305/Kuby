import type { Usuario } from "@/lib/api"

export function homeFor(user: Pick<Usuario, "rol">): "/" | "/admin" {
  return user.rol === "admin" ? "/admin" : "/"
}

export function authRedirect(pathname: string, user: Pick<Usuario, "rol"> | null): string | null {
  const path = pathname.replace(/\/+$/, "") || "/"
  const isAuthPage = path === "/login" || path === "/signup"
  if (!user) return isAuthPage ? null : "/login"
  const home = homeFor(user)
  return path === home ? null : home
}
