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
} from "../components/ui"
import {
  cancelReservation,
  createReservation,
  updateReservation
} from "../lib/api"
import type { Espacio, Reservacion } from "../lib/api"
import type { RemoteResult } from "../hooks/use-remote"
import {
  bookingTimes,
  canCancel,
  canReschedule,
  toLocalInput
} from "../lib/booking"
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
} from "./shared"

function TimeFields({ reservation }: { reservation?: Reservacion }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Start time">
        <Input
          aria-label="Start time"
          name="start"
          type="datetime-local"
          required
          defaultValue={
            reservation ? toLocalInput(reservation.hora_inicio) : undefined
          }
        />
      </FormField>
      <FormField label="End time">
        <Input
          aria-label="End time"
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
      title={`Reserve ${space.nombre_espacio}`}
      description={`${space.ubicacion || "Location not specified"} · Up to ${space.capacidad} people`}
      onClose={onClose}
    >
      <ActionForm
        submit="Confirm reservation"
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
          Times are in your local time zone. Availability is checked when you
          confirm.
        </p>
        <p className="border-l-2 border-primary pl-3 text-sm">
          Check in during the first 10 minutes of your reservation to keep it.
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
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlankIcon />
          Your next visit
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
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <ClockIcon />
              <LocalTime value={resource.data.hora_inicio} /> —{" "}
              <LocalTime value={resource.data.hora_fin} />
            </p>
            <p className="text-sm text-muted-foreground">
              First entry must be within 10 minutes of the start time. Re-entry
              is allowed until the end.
            </p>
          </>
        )}
        {resource.data === null && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Make room for your next idea.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You have no upcoming reservations. Choose a cubicle below.
              </p>
            </div>
            <img
              src="/assets/LogoKuby.png"
              alt="Kuby"
              className="h-8 w-auto object-contain invert"
            />
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
      title={admin ? "Reservations" : "My reservations"}
      description={
        admin
          ? "Manage reservations across all cubicles."
          : "Your upcoming visits and reservation history."
      }
      action={<RefreshButton {...resource} />}
    >
      <RemoteState {...resource} />
      {resource.data && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cubicle</TableHead>
                {admin && <TableHead>User ID</TableHead>}
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!resource.data.length && (
                <TableRow>
                  <TableCell
                    colSpan={admin ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No reservations yet.
                  </TableCell>
                </TableRow>
              )}
              {resource.data.map((reservation) => (
                <TableRow key={reservation.id_reservacion}>
                  <TableCell className="font-medium">
                    {reservation.nombre_espacio ||
                      `Cubicle #${reservation.id_espacio}`}
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
                          Reschedule
                        </Button>
                      )}
                      {canCancel(reservation.estado_reservacion) && (
                        <ConfirmAction
                          label="Cancel reservation"
                          description={`Cancel the reservation for ${reservation.nombre_espacio || "this cubicle"}? This frees its time slot.`}
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
          title="Reschedule reservation"
          description={`Choose a new time for ${editing.nombre_espacio}. Availability is checked when you save.`}
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
