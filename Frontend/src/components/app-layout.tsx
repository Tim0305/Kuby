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
              className="h-12 px-2 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:p-0"
            >
              <SquaresFourIcon className="size-5 text-brand-icon" />
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
                      className="size-5"
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
      <a className="sr-only fixed top-3 left-3 z-100 rounded-(--control-radius) bg-primary px-5 py-3 text-sm text-primary-foreground focus:not-sr-only focus:fixed" href="#main-content">Ir al contenido</a>
      <SidebarProvider>
        <Navigation admin={admin} account={account} />
        <SidebarInset className="min-w-0" id="main-content" tabIndex={-1}>
          <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-5 md:h-16 md:px-[clamp(20px,3vw,48px)]">
            <WorkspaceSidebarTrigger />
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <span className="text-sm font-medium">
              {admin ? "Administración" : "Mi Kuby"}
            </span>
            <span className="ml-auto hidden text-[13px] text-muted-foreground md:block">Reservaciones y acceso al campus</span>
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
