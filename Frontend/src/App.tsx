import { lazy, Suspense, useCallback, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import {
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
        className="workspace min-w-0 flex-1 bg-muted/30 p-4 text-left sm:p-6 lg:p-8"
      >
        <div className="mx-auto max-w-7xl space-y-10">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {admin ? "Kuby / Administración" : "Tu espacio de trabajo en el campus"}
              </p>
              <h1 className="!m-0 !text-3xl !font-semibold !tracking-tight sm:!text-4xl">
                {admin
                  ? "Un espacio para cada idea."
                  : "Hola, " + user.nombre + "."}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {admin
                  ? "Administra los espacios, las personas y sus visitas."
                  : "Concéntrate en lo que importa. Reserva un cubículo para tu próxima sesión."}
              </p>
            </div>
            <img
              src="/assets/LogoKuby.png"
              alt="Kuby"
              className="h-9 w-auto object-contain invert"
            />
          </header>
          {notice && (
            <p
              role="status"
              className="border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm text-foreground"
            >
              {notice}
            </p>
          )}
          {admin && (
            <div className="space-y-3">
              <RemoteState {...summary} />
              {summary.data && (
                <div
                  className="grid grid-cols-2 gap-4 xl:grid-cols-4"
                  aria-label="Totales de administración"
                >
                  {Object.entries(summary.data).map(([key, value]) => (
                    <Card key={key}>
                      <CardHeader>
                        <CardTitle className="text-muted-foreground">
                          {summaryLabels[key]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold tabular-nums">
                          {formatNumber(value)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
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
                "Reservación confirmada. Registra tu entrada durante los primeros 10 minutos después de la hora de inicio."
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
                setNotice("Cuenta de usuario actualizada.")
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
