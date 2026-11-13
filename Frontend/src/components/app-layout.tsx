import type { ReactNode } from "react"
import { NavUser } from "@/components/nav-user"
import { useState, useSyncExternalStore } from "react"
import { logout } from "@/lib/api"
import type { Usuario } from "@/lib/api"
import type { ComponentProps } from "react"
import {
  CalendarIcon,
  HouseIcon,
  SquaresFourIcon,
  PulseIcon,
  UsersIcon,
  ListChecksIcon,
  UserIcon
} from "@phosphor-icons/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  TooltipProvider,
  useSidebar
} from "@/components/ui"

type AccountProps = Pick<
  ComponentProps<typeof NavUser>,
  "name" | "role" | "avatarUrl" | "onLogout" | "loggingOut"
>

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

function Navigation({
  admin,
  account
}: {
  admin: boolean
  account?: AccountProps
}) {
  const { setOpenMobile } = useSidebar()
  const active = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash || "#overview",
    () => "#overview"
  )
  const items = admin
    ? [
        { title: "Resumen", href: "#overview", icon: HouseIcon },
        { title: "Cubículos", href: "#spaces", icon: SquaresFourIcon },
        { title: "Reservaciones", href: "#reservations", icon: CalendarIcon },
        { title: "Usuarios", href: "#users", icon: UsersIcon }
      ]
    : [
        { title: "Inicio", href: "#overview", icon: HouseIcon },
        { title: "Explorar cubículos", href: "#spaces", icon: SquaresFourIcon },
        { title: "Mis reservaciones", href: "#reservations", icon: CalendarIcon }
      ]
  items.push(
    { title: "Condiciones", href: "#sensors", icon: PulseIcon },
    { title: "Historial de accesos", href: "#access", icon: ListChecksIcon },
    { title: "Mi perfil", href: "#profile", icon: UserIcon }
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href={admin ? "/admin" : "/"} />}
              tooltip="Kuby"
              className="kuby-brand"
            >
              <SquaresFourIcon />
              <img
                src="/assets/LogoKuby.png"
                alt="Kuby"
                className="h-8 w-auto object-contain group-data-[collapsible=icon]:hidden"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {admin ? "Administración" : "Mi Kuby"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<a href={item.href} />}
                    tooltip={item.title}
                    isActive={active === item.href}
                    aria-current={active === item.href ? "location" : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon
                      weight={active === item.href ? "fill" : "regular"}
                    />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser role={admin ? "Administrador" : "Cuenta de usuario"} {...account} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function WorkspaceSidebarTrigger() {
  const { isMobile, openMobile, open } = useSidebar()
  return <SidebarTrigger aria-expanded={isMobile ? openMobile : open} />
}

export function AppLayout({
  admin = false,
  children,
  user,
  avatarVersion = 0
}: {
  admin?: boolean
  children: ReactNode
  user: Usuario
  avatarVersion?: number
}) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError(null)
    try {
      await logout()
      window.location.replace("/login")
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "No se pudo cerrar la sesión. Inténtalo de nuevo."
      )
      setLoggingOut(false)
    }
  }

  const account: AccountProps = {
    name: `${user.nombre} ${user.apellido}`,
    role: user.rol === "admin" ? "Administrador" : "Cuenta de usuario",
    avatarUrl: user.tiene_foto
      ? `/api/usuarios/${user.id_usuario}/foto?v=${avatarVersion}`
      : undefined,
    onLogout: handleLogout,
    loggingOut
  }

  return (
    <TooltipProvider>
      <a className="kuby-skip-link" href="#main-content">Ir al contenido</a>
      <SidebarProvider className="kuby-shell">
        <Navigation admin={admin} account={account} />
        <SidebarInset className="min-w-0" id="main-content" tabIndex={-1}>
          <header className="workspace-topbar">
            <WorkspaceSidebarTrigger />
            <span className="topbar-divider" aria-hidden="true" />
            <span className="topbar-title">
              {admin ? "Administración" : "Mi Kuby"}
            </span>
            <span className="topbar-context">Reservaciones y acceso al campus</span>
          </header>
          {logoutError && (
            <p
              role="alert"
              className="border-b px-4 py-3 text-left text-sm text-destructive"
            >
              {logoutError}
            </p>
          )}
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
