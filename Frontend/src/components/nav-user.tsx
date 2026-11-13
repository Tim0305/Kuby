import { CaretUpIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui"

type NavUserProps = {
  name?: string
  role?: string
  avatarUrl?: string
  onLogout?: () => void
  loggingOut?: boolean
}

export function NavUser({
  name = "Usuario de Kuby",
  role = "Cuenta de usuario",
  avatarUrl,
  onLogout,
  loggingOut = false
}: NavUserProps) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" tooltip="Menú de cuenta" />}
            className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            aria-label={`Abrir menú de cuenta de ${name}`}
          >
            <Avatar className="shrink-0">
              {avatarUrl && (
                <AvatarImage
                  src={avatarUrl}
                  alt={name}
                  className="outline -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {role}
              </span>
            </span>
            <CaretUpIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block font-medium text-foreground">
                  {name}
                </span>
                <span>{role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<a href="#profile" />}>
                <UserIcon />
                Mi perfil
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={onLogout}
              disabled={!onLogout || loggingOut}
            >
              <SignOutIcon />
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
