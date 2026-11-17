import type { Usuario } from "@/lib/api"

export function homeFor(user: Pick<Usuario, "rol">): "/" | "/admin" {
  return user.rol === "admin" || user.rol === "superadmin" ? "/admin" : "/"
}

// Only local check-in destinations are accepted; arbitrary return URLs are ignored.
export function checkInPath(pathname: string): string | null {
  return /^\/check-in\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname)
    ? pathname : null
}

export function checkInReturn(search: string): string | null {
  return checkInPath(new URLSearchParams(search).get("next") ?? "")
}

export function authRedirect(pathname: string, user: Pick<Usuario, "rol"> | null, search = ""): string | null {
  const path = pathname.replace(/\/+$/, "") || "/"
  const isAuthPage = path === "/login" || path === "/signup"
  const checkIn = checkInPath(path)
  if (!user) return isAuthPage ? null : checkIn ? `/login?next=${encodeURIComponent(checkIn)}` : "/login"
  if (checkIn || path.startsWith("/check-in/")) return null
  if (isAuthPage && checkInReturn(search)) return checkInReturn(search)
  const home = homeFor(user)
  return path === home ? null : home
}
