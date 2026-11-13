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
      <FormField label="Hora de inicio">
        <Input
          aria-label="Hora de inicio"
          name="start"
          type="datetime-local"
          required
          defaultValue={
            reservation ? toLocalInput(reservation.hora_inicio) : undefined
          }
        />
      </FormField>
      <FormField label="Hora de fin">
        <Input
          aria-label="Hora de fin"
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
      description={`${space.ubicacion || "Ubicación no especificada"} · Hasta ${space.capacidad} ${space.capacidad === 1 ? "persona" : "personas"}`}
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
          Los horarios corresponden a tu zona horaria local. La disponibilidad se verifica al confirmar.
        </p>
        <p className="border-l-2 border-primary pl-3 text-sm">
          Registra tu entrada durante los primeros 10 minutos de tu reservación para conservarla.
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
    <Card className="current-visit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlankIcon />
          Tu próxima visita
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
            <div className="visit-schedule">
              <ClockIcon aria-hidden="true" />
              <p className="visit-times">
                <LocalTime value={resource.data.hora_inicio} />
                <span aria-hidden="true">—</span>
                <LocalTime value={resource.data.hora_fin} />
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Debes registrar tu primera entrada durante los primeros 10 minutos después de la hora de inicio. Puedes volver a entrar hasta la hora de fin.
            </p>
          </>
        )}
        {resource.data === null && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Dale espacio a tu próxima idea.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No tienes reservaciones próximas. Elige un cubículo a continuación.
              </p>
            </div>
            <CalendarBlankIcon className="visit-empty-icon" aria-hidden="true" />
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
          ? "Administra las reservaciones de todos los cubículos."
          : "Tus próximas visitas y tu historial de reservaciones."
      }
      action={<RefreshButton {...resource} />}
    >
      <RemoteState {...resource} />
      {resource.data && (
        <Card>
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
                          variant="outline"
                          onClick={() => setEditing(reservation)}
                        >
                          Reprogramar
                        </Button>
                      )}
                      {canCancel(reservation.estado_reservacion) && (
                        <ConfirmAction
                          label="Cancelar reservación"
                          description={`¿Quieres cancelar la reservación de ${reservation.nombre_espacio || "este cubículo"}? Se liberará ese horario.`}
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
          description={`Elige un nuevo horario para ${editing.nombre_espacio}. La disponibilidad se verifica al guardar.`}
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
