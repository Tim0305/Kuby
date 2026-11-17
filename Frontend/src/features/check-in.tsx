import { useCallback, useState } from "react"
import { CheckCircleIcon, QrCodeIcon } from "@phosphor-icons/react"
import { AuthShell } from "@/components/auth-shell"
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { confirmCheckIn, getCheckInContext } from "@/lib/api"
import type { Reservacion, Usuario } from "@/lib/api"
import { checkInPath, homeFor } from "@/lib/auth-routing"
import { useRemote } from "@/hooks/use-remote"
import { ActionForm, LocalTime, RefreshButton, RemoteState, Status } from "@/features/shared"
import { CheckInWindow } from "@/features/check-in-tools"

export default function CheckInPage({ user }: { user: Usuario }) {
  const path = checkInPath(window.location.pathname.replace(/\/+$/, ""))
  const token = path?.split("/").pop() ?? ""
  const load = useCallback((signal: AbortSignal) => getCheckInContext(token, signal), [token])
  const resource = useRemote(load)
  const [confirmed, setConfirmed] = useState<Reservacion>()
  return <AuthShell>
    <Card className="min-w-0">
      <CardHeader>
        <QrCodeIcon aria-hidden="true" className="mb-2 size-7 text-primary" />
        <CardTitle role="heading" aria-level={1} className="text-2xl tracking-tight">Confirma tu llegada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm wrap-anywhere text-muted-foreground">Sesión de {user.nombre} {user.apellido}.</p>
        <RemoteState {...resource} />
        {confirmed ? <div role="status" className="space-y-3 border-l-2 border-primary pl-4">
          <CheckCircleIcon aria-hidden="true" className="size-8 text-primary" />
          <p className="font-medium">Tu llegada quedó registrada.</p>
          {confirmed.check_in_en && <p className="text-sm"><LocalTime value={confirmed.check_in_en} /></p>}
          <p className="text-sm text-muted-foreground">Puedes usar el cubículo durante el horario de tu reservación.</p>
        </div> : resource.data && <>
          <div>
            <h2 className="text-xl font-medium wrap-anywhere">{resource.data.espacio.nombre_espacio}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{resource.data.espacio.ubicacion}</p>
          </div>
          <CheckInWindow settings={resource.data.configuracion} />
          {resource.data.espacio.estado_espacio !== "activo"
            ? <p role="alert" className="text-sm text-destructive">El cubículo no está disponible para registrar entradas.</p>
            : <>
              {!resource.data.reservaciones.length && <p role="status" className="text-sm">No tienes reservaciones vigentes o próximas para este cubículo. Revisa que hayas escaneado el código correcto.</p>}
              {resource.data.reservaciones.map((reservation) => <div key={reservation.id_reservacion} className="space-y-3 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Reservación #{reservation.id_reservacion}</h3>
                  <Status value={reservation.estado_reservacion} />
                </div>
                <p className="flex flex-col gap-1 text-sm"><LocalTime value={reservation.hora_inicio} /><LocalTime value={reservation.hora_fin} /></p>
                {reservation.check_in_en || reservation.estado_reservacion === "activa"
                  ? <p className="text-sm text-primary">La entrada ya fue registrada.{reservation.check_in_en && <> <LocalTime value={reservation.check_in_en} /></>}</p>
                  : reservation.estado_reservacion === "creada" && <ActionForm
                    submit="Confirmar mi llegada"
                    action={async () => setConfirmed(await confirmCheckIn(token, reservation.id_reservacion))}
                  />}
              </div>)}
            </>}
          <RefreshButton {...resource} />
        </>}
        <Button nativeButton={false} variant="outline" render={<a href={`${homeFor(user)}#reservations`} />} className="min-h-11 w-full">Ver mis reservaciones</Button>
      </CardContent>
    </Card>
  </AuthShell>
}
