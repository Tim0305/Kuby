import { lazy, Suspense, useCallback, useState } from "react"
import {
  ArrowUpRightIcon,
  CalendarIcon,
  ListChecksIcon,
  SquaresFourIcon,
  UsersIcon
} from "@phosphor-icons/react"
import { AppLayout } from "@/components/app-layout"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton
} from "@/components/ui"
import { AccessHistory } from "@/features/access-history"
import { Profile } from "@/features/profile"
import { CurrentReservation, Reservations } from "@/features/reservations"
import { Spaces } from "@/features/spaces"
import { Users } from "@/features/users"
import { RemoteState } from "@/features/shared"
import { useRemote } from "@/hooks/use-remote"
import {
  getCurrentReservation,
  getReservations,
  getSpaces,
  getSummary
} from "@/lib/api"
import type { Usuario } from "@/lib/api"

const Sensors = lazy(() =>
  import("@/features/sensors").then((module) => ({ default: module.Sensors }))
)

import { formatNumber } from "@/lib/locale"

const summaryIcons = {
  usuarios: UsersIcon,
  espacios: SquaresFourIcon,
  reservaciones: CalendarIcon,
  accesos: ListChecksIcon
}

const summaryLabels: Record<string, string> = {
  usuarios: "Usuarios",
  espacios: "Cubículos",
  reservaciones: "Reservaciones",
  accesos: "Intentos de acceso"
}

export default function App({ user: initialUser }: { user: Usuario }) {
  const [user, setUser] = useState(initialUser)
  const [profileVersion, setProfileVersion] = useState(0)
  const [notice, setNotice] = useState("")
  const admin = user.rol === "admin"
  const spaces = useRemote(getSpaces)
  const reservations = useRemote(getReservations, 60_000)
  const current = useRemote(getCurrentReservation, 60_000)
  const loadSummary = useCallback(
    (signal: AbortSignal) =>
      admin ? getSummary(signal) : Promise.resolve(null),
    [admin]
  )
  const summary = useRemote(loadSummary)

  function reservationsChanged() {
    reservations.reload()
    current.reload()
    summary.reload()
    setNotice("Reservaciones actualizadas.")
  }

  return (
    <AppLayout admin={admin} user={user} avatarVersion={profileVersion}>
      <div
        id="overview"
        className="px-5 pt-7 pb-12 text-left md:px-[clamp(20px,3vw,48px)] md:pt-9 md:pb-16 max-[359px]:px-4 min-w-0 flex-1"
      >
        <div className="mx-auto flex max-w-360 flex-col gap-8 md:gap-9">
          <header className="flex flex-wrap items-center justify-between gap-5 md:gap-6">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted-foreground before:size-1.5 before:rounded-full before:bg-primary before:content-['']">
                {admin ? "Kuby / Administración" : "Kuby / Cubículos del campus"}
              </p>
              <h1 className="max-w-[18ch] text-[32px]/[1.15] font-medium tracking-[-0.045em] text-balance md:max-w-none md:text-[clamp(30px,2.75vw,42px)] max-[359px]:text-[29px]">
                {admin
                  ? "Resumen del campus"
                  : "Hola, " + user.nombre + "."}
              </h1>
              <p className="mt-2.5 max-w-[62ch] text-sm/[1.6] text-muted-foreground md:mt-3 md:text-[15px]">
                {admin
                  ? "Gestiona cubículos, reservaciones y usuarios."
                  : "Elige un cubículo y reserva tu horario."}
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<a href={admin ? "#reservations" : "#spaces"} />}
              variant="outline"
              className="w-full md:w-auto"
            >
              {admin ? "Ver reservaciones" : "Ver cubículos"}
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </header>
          {notice && (
            <p
              role="status"
              className="rounded-md border border-border border-l-[3px] border-l-primary bg-card px-5 py-3.5 text-sm"
            >
              {notice}
            </p>
          )}
          {admin && (
            <div className="space-y-3">
              <RemoteState {...summary} />
              {summary.data && (
                <div
                  className="grid grid-cols-2 overflow-hidden rounded-(--surface-radius) border border-border bg-card lg:grid-cols-4"
                  aria-label="Totales de administración"
                >
                  {Object.entries(summary.data).map(([key, value], index) => {
                    const Icon = summaryIcons[key as keyof typeof summaryIcons]
                    return (
                      <Card key={key} className={`gap-2.5 rounded-none border-0 bg-transparent py-4.5 [--card-spacing:16px] md:py-5 md:[--card-spacing:24px] ${index > 1 ? "border-t lg:border-t-0" : ""} ${index % 2 === 1 ? "border-l" : ""} ${index === 2 ? "lg:border-l" : ""}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                            {summaryLabels[key]}
                            {Icon && <Icon aria-hidden="true" className="hidden size-4.5 text-muted-foreground md:block" />}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl/[1.15] font-medium tracking-[-0.055em] tabular-nums md:text-[32px]">
                            {formatNumber(value)}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <CurrentReservation resource={current} />
          <Spaces
            resource={spaces}
            admin={admin}
            onBooked={() => {
              reservationsChanged()
              setNotice(
                "Reservación confirmada. Registra tu entrada en los primeros 10 minutos de tu horario."
              )
            }}
            onChange={() => {
              spaces.reload()
              summary.reload()
              setNotice("Cubículos actualizados.")
            }}
          />
          <Reservations
            resource={reservations}
            admin={admin}
            onChange={reservationsChanged}
          />
          {admin && (
            <Users
              currentUserId={user.id_usuario}
              onChange={() => {
                summary.reload()
                setNotice("Usuario actualizado.")
              }}
            />
          )}
          {spaces.data && (
            <Suspense fallback={<Skeleton className="h-56" />}>
              <Sensors spaces={spaces.data} />
            </Suspense>
          )}
          <AccessHistory spaces={spaces.data ?? []} admin={admin} />
          <Profile
            user={user}
            onUserChange={(updated) => {
              setUser(updated)
              setProfileVersion((version) => version + 1)
            }}
          />
        </div>
      </div>
    </AppLayout>
  )
}
