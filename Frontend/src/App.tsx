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
        className="workspace min-w-0 flex-1"
      >
        <div className="workspace-content">
          <header className="workspace-heading">
            <div>
              <p className="workspace-eyebrow">
                {admin ? "Kuby / Administración" : "Tu espacio de trabajo en el campus"}
              </p>
              <h1>
                {admin
                  ? "Un espacio para cada idea."
                  : "Hola, " + user.nombre + "."}
              </h1>
              <p>
                {admin
                  ? "Administra los espacios, las personas y sus visitas."
                  : "Concéntrate en lo que importa. Reserva un cubículo para tu próxima sesión."}
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<a href={admin ? "#reservations" : "#spaces"} />}
              variant="outline"
            >
              {admin ? "Ver reservaciones" : "Explorar cubículos"}
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </header>
          {notice && (
            <p
              role="status"
              className="workspace-notice"
            >
              {notice}
            </p>
          )}
          {admin && (
            <div className="space-y-3">
              <RemoteState {...summary} />
              {summary.data && (
                <div
                  className="summary-grid"
                  aria-label="Totales de administración"
                >
                  {Object.entries(summary.data).map(([key, value]) => {
                    const Icon = summaryIcons[key as keyof typeof summaryIcons]
                    return (
                      <Card key={key}>
                        <CardHeader>
                          <CardTitle>
                            {summaryLabels[key]}
                            {Icon && <Icon aria-hidden="true" />}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="summary-value">
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
