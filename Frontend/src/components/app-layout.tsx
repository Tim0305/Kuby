import type { ReactNode } from "react"
import { NavUser } from "./nav-user"
import { CalendarIcon, HouseIcon, SquaresFourIcon, CpuIcon, PulseIcon } from "@phosphor-icons/react"
import { TooltipProvider } from "./ui/tooltip"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar } from "./ui/sidebar"

function Navigation({ admin }: { admin: boolean }) {
  const { setOpenMobile } = useSidebar()
  const items = admin
    ? [{ title: "Overview", href: "#overview", icon: HouseIcon }, { title: "System", href: "#system", icon: PulseIcon }, { title: "Devices", href: "#devices", icon: CpuIcon }]
    : [{ title: "Home", href: "#overview", icon: HouseIcon }, { title: "My reservations", href: "#reservations", icon: CalendarIcon }, { title: "Explore spaces", href: "#spaces", icon: SquaresFourIcon }]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu><SidebarMenuItem>
          <SidebarMenuButton render={<a href={admin ? "/admin" : "/"} />} tooltip="Kuby" className="h-12">
            <SquaresFourIcon />
            <img src="/assets/LogoKuby.png" alt="Kuby" className="h-8 w-auto object-contain invert group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{admin ? "Administration" : "My Kuby"}</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>
            {items.map((item) => <SidebarMenuItem key={item.href}>
              <SidebarMenuButton render={<a href={item.href} />} tooltip={item.title} onClick={() => setOpenMobile(false)}>
                <item.icon /><span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter><NavUser role={admin ? "Administrator" : "User account"} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export function AppLayout({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Navigation admin={admin} />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <span className="text-sm font-medium">{admin ? "Administration" : "My Kuby"}</span>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

