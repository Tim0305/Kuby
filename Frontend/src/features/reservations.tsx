import { useState } from "react"
import { CalendarBlankIcon, ClockIcon } from "@phosphor-icons/react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui"
import {
  cancelReservation,
  createReservation,
  updateReservation
} from "@/lib/api"
import type { Espacio, Reservacion } from "@/lib/api"
import type { RemoteResult } from "@/hooks/use-remote"
import {
  bookingTimes,
  canCancel,
  canReschedule,
  toLocalInput
} from "@/lib/booking"
import {
  ActionForm,
  ConfirmAction,
  FormField,
  LocalTime,
  Modal,
  RefreshButton,
  RemoteState,
  Section,
  Status,
  text
} from "@/features/shared"

function TimeFields({ reservation }: { reservation?: Reservacion }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Fecha y hora de inicio">
        <Input
          aria-label="Fecha y hora de inicio"
          name="start"
          type="datetime-local"
          required
          defaultValue={
            reservation ? toLocalInput(reservation.hora_inicio) : undefined
          }
        />
      </FormField>
      <FormField label="Fecha y hora de fin">
        <Input
          aria-label="Fecha y hora de fin"
          name="end"
          type="datetime-local"
          required
          defaultValue={
            reservation ? toLocalInput(reservation.hora_fin) : undefined
          }
        />
      </FormField>
    </div>
  )
}

export function BookingDialog({
  space,
  onClose,
  onBooked
}: {
  space: Espacio
  onClose: () => void
  onBooked: () => void
}) {
  return (
    <Modal
      title={`Reservar ${space.nombre_espacio}`}
      description={`${space.ubicacion || "Sin ubicación registrada"} · Hasta ${space.capacidad} ${space.capacidad === 1 ? "persona" : "personas"}`}
      onClose={onClose}
    >
      <ActionForm
        submit="Confirmar reservación"
        action={async (values) => {
          await createReservation(
            space.id_espacio,
            bookingTimes(text(values, "start"), text(values, "end"))
          )
        }}
        onDone={() => {
          onBooked()
          onClose()
        }}
      >
        <TimeFields />
        <p className="text-sm text-muted-foreground">
          Hora local. La disponibilidad se verifica al confirmar.
        </p>
        <p className="border-l-2 border-primary pl-3 text-sm">
          Registra tu entrada en los primeros 10 minutos de tu horario para conservar tu reservación.
        </p>
      </ActionForm>
    </Modal>
  )
}

export function CurrentReservation({
  resource
}: {
  resource: RemoteResult<Reservacion | null>
}) {
  return (
    <Card className="gap-4 border-visit bg-visit py-6 text-visit-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-visit-foreground">
          <CalendarBlankIcon className="size-5 text-visit-accent" />
          Tu reservación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <RemoteState {...resource} />
        {resource.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xl font-semibold">
                {resource.data.nombre_espacio}
              </p>
              <Status value={resource.data.estado_reservacion} />
            </div>
            <div className="grid grid-cols-[18px_minmax(0,1fr)] items-baseline gap-2 text-sm">
              <ClockIcon aria-hidden="true" className="mt-0.75 size-4 self-start" />
              <p className="flex flex-col flex-wrap gap-x-2.5 gap-y-1 md:flex-row">
                <LocalTime value={resource.data.hora_inicio} />
                <span aria-hidden="true" className="hidden md:inline">—</span>
                <LocalTime value={resource.data.hora_fin} />
              </p>
            </div>
            <p className="max-w-[78ch] text-sm/[1.7] text-visit-muted">
              Registra tu entrada en los primeros 10 minutos de tu horario. Puedes volver a entrar hasta que termine.
            </p>
          </>
        )}
        {resource.data === null && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">No tienes reservaciones próximas.</p>
              <p className="mt-1 text-sm text-visit-muted">
                Elige un cubículo para reservar.
              </p>
            </div>
            <CalendarBlankIcon className="size-11 shrink-0 text-visit-empty-icon" aria-hidden="true" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Reservations({
  resource,
  admin,
  onChange
}: {
  resource: RemoteResult<Reservacion[]>
  admin: boolean
  onChange: () => void
}) {
  const [editing, setEditing] = useState<Reservacion>()
  return (
    <Section
      id="reservations"
      title={admin ? "Reservaciones" : "Mis reservaciones"}
      description={
        admin
          ? "Consulta, reprograma o cancela reservaciones."
          : "Consulta tus reservaciones y cambia las próximas."
      }
      action={<RefreshButton {...resource} />}
    >
      <RemoteState {...resource} />
      {resource.data && (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cubículo</TableHead>
                {admin && <TableHead>ID de usuario</TableHead>}
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!resource.data.length && (
                <TableRow>
                  <TableCell
                    colSpan={admin ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Aún no hay reservaciones.
                  </TableCell>
                </TableRow>
              )}
              {resource.data.map((reservation) => (
                <TableRow key={reservation.id_reservacion}>
                  <TableCell className="font-medium">
                    {reservation.nombre_espacio ||
                      `Cubículo #${reservation.id_espacio}`}
                  </TableCell>
                  {admin && <TableCell>#{reservation.id_usuario}</TableCell>}
                  <TableCell>
                    <LocalTime value={reservation.hora_inicio} />
                  </TableCell>
                  <TableCell>
                    <LocalTime value={reservation.hora_fin} />
                  </TableCell>
                  <TableCell>
                    <Status value={reservation.estado_reservacion} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {canReschedule(reservation.estado_reservacion) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(reservation)}
                        >
                          Reprogramar
                        </Button>
                      )}
                      {canCancel(reservation.estado_reservacion) && (
                        <ConfirmAction
                          size="sm"
                          label="Cancelar reservación"
                          description={`Se cancelará la reservación de ${reservation.nombre_espacio || "este cubículo"} y el horario quedará libre.`}
                          action={() =>
                            cancelReservation(reservation.id_reservacion)
                          }
                          onDone={onChange}
                        />
                      )}
                      {!canCancel(reservation.estado_reservacion) && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {editing && (
        <Modal
          title="Reprogramar reservación"
          description={`${editing.nombre_espacio} · La disponibilidad se verifica al guardar.`}
          onClose={() => setEditing(undefined)}
        >
          <ActionForm
            action={async (values) => {
              await updateReservation(
                editing.id_reservacion,
                bookingTimes(text(values, "start"), text(values, "end"))
              )
            }}
            onDone={() => {
              setEditing(undefined)
              onChange()
            }}
          >
            <TimeFields reservation={editing} />
          </ActionForm>
        </Modal>
      )}
    </Section>
  )
}
