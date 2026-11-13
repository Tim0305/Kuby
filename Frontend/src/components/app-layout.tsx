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
        { title: "Overview", href: "#overview", icon: HouseIcon },
        { title: "Cubicles", href: "#spaces", icon: SquaresFourIcon },
        { title: "Reservations", href: "#reservations", icon: CalendarIcon },
        { title: "Users", href: "#users", icon: UsersIcon }
      ]
    : [
        { title: "Home", href: "#overview", icon: HouseIcon },
        { title: "Explore cubicles", href: "#spaces", icon: SquaresFourIcon },
        { title: "My reservations", href: "#reservations", icon: CalendarIcon }
      ]
  items.push(
    { title: "Conditions", href: "#sensors", icon: PulseIcon },
    { title: "Access history", href: "#access", icon: ListChecksIcon },
    { title: "My profile", href: "#profile", icon: UserIcon }
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href={admin ? "/admin" : "/"} />}
              tooltip="Kuby"
              className="h-12"
            >
              <SquaresFourIcon />
              <img
                src="/assets/LogoKuby.png"
                alt="Kuby"
                className="h-8 w-auto object-contain invert group-data-[collapsible=icon]:hidden"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {admin ? "Administration" : "My Kuby"}
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
        <NavUser role={admin ? "Administrator" : "User account"} {...account} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
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
          : "Could not sign out. Please try again."
      )
      setLoggingOut(false)
    }
  }

  const account: AccountProps = {
    name: `${user.nombre} ${user.apellido}`,
    role: user.rol === "admin" ? "Administrator" : "User account",
    avatarUrl: user.tiene_foto
      ? `/api/usuarios/${user.id_usuario}/foto?v=${avatarVersion}`
      : undefined,
    onLogout: handleLogout,
    loggingOut
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Navigation admin={admin} account={account} />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <span className="text-sm font-medium">
              {admin ? "Administration" : "My Kuby"}
            </span>
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
