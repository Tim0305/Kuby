import { BellIcon, CaretUpIcon, GearIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar"

type NavUserProps = {
  name?: string
  role?: string
  avatarUrl?: string
}

export function NavUser({ name = "Kuby user", role = "User account", avatarUrl }: NavUserProps) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip="Account menu" />} className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground" aria-label={`Open account menu for ${name}`}>
            <Avatar className="shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{role}</span>
            </span>
            <CaretUpIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block font-medium text-foreground">{name}</span>
                <span>{role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><UserIcon />My profile</DropdownMenuItem>
              <DropdownMenuItem><GearIcon />Account settings</DropdownMenuItem>
              <DropdownMenuItem><BellIcon />Notifications</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"><SignOutIcon />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
