import { useState } from "react"
import { MapPinIcon, PlusIcon, UsersIcon } from "@phosphor-icons/react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input
} from "@/components/ui"
import { createSpace, deactivateSpace, updateSpace } from "@/lib/api"
import type { Espacio, EstadoEspacio } from "@/lib/api"
import type { RemoteResult } from "@/hooks/use-remote"
import { BookingDialog } from "@/features/reservations"
import {
  ActionForm,
  Choice,
  ConfirmAction,
  FormField,
  Modal,
  RemoteState,
  Section,
  Status,
  text
} from "@/features/shared"

function SpaceEditor({
  space,
  onClose,
  onChange
}: {
  space?: Espacio
  onClose: () => void
  onChange: () => void
}) {
  const [status, setStatus] = useState<EstadoEspacio>(
    space?.estado_espacio ?? "activo"
  )
  return (
    <Modal
      title={space ? "Edit cubicle" : "New cubicle"}
      description="Set the location, capacity, and operational status."
      onClose={onClose}
    >
      <ActionForm
        submit={space ? "Save changes" : "Create cubicle"}
        action={async (values) => {
          const data = {
            nombre_espacio: text(values, "name"),
            ubicacion: text(values, "location"),
            capacidad: Number(values.get("capacity")),
            ip_nodo_esp32: text(values, "ip"),
            estado_espacio: status
          }
          if (space) await updateSpace(space.id_espacio, data)
          else await createSpace(data)
        }}
        onDone={() => {
          onChange()
          onClose()
        }}
      >
        <FormField label="Name">
          <Input
            aria-label="Name"
            name="name"
            required
            maxLength={100}
            defaultValue={space?.nombre_espacio}
          />
        </FormField>
        <FormField label="Location">
          <Input
            aria-label="Location"
            name="location"
            maxLength={100}
            defaultValue={space?.ubicacion ?? ""}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Capacity">
            <Input
              aria-label="Capacity"
              name="capacity"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={space?.capacidad ?? 1}
            />
          </FormField>
          <FormField label="Status">
            <Choice
              label="Cubicle status"
              value={status}
              onChange={(value) => setStatus(value as EstadoEspacio)}
              options={[
                { value: "activo", label: "Active" },
                { value: "inactivo", label: "Inactive" },
                { value: "mantenimiento", label: "Maintenance" }
              ]}
            />
          </FormField>
        </div>
        <FormField label="ESP32 address (optional)">
          <Input
            aria-label="ESP32 address"
            name="ip"
            maxLength={45}
            defaultValue={space?.ip_nodo_esp32 ?? ""}
          />
        </FormField>
      </ActionForm>
    </Modal>
  )
}

export function Spaces({
  resource,
  admin,
  onChange,
  onBooked
}: {
  resource: RemoteResult<Espacio[]>
  admin: boolean
  onChange: () => void
  onBooked: () => void
}) {
  const [booking, setBooking] = useState<Espacio>()
  const [editor, setEditor] = useState<Espacio | "new">()
  return (
    <Section
      id="spaces"
      title={admin ? "Cubicles" : "Explore cubicles"}
      description="Find a space for focused work or your next team session."
      action={
        admin && (
          <Button onClick={() => setEditor("new")}>
            <PlusIcon data-icon="inline-start" />
            New cubicle
          </Button>
        )
      }
    >
      <RemoteState {...resource} />
      {resource.data?.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No cubicles have been added yet.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resource.data?.map((space) => (
          <Card key={space.id_espacio}>
            <CardHeader>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  CUBICLE {String(space.id_espacio).padStart(2, "0")}
                </span>
                <Status value={space.estado_espacio} />
              </div>
              <CardTitle className="text-lg">{space.nombre_espacio}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPinIcon />
                  {space.ubicacion || "Location not specified"}
                </p>
                <p className="flex items-center gap-2">
                  <UsersIcon />
                  Up to {space.capacidad} people
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={space.estado_espacio !== "activo"}
                  onClick={() => setBooking(space)}
                >
                  {space.estado_espacio === "activo"
                    ? "Reserve cubicle"
                    : "Unavailable"}
                </Button>
                {admin && (
                  <>
                    <Button variant="outline" onClick={() => setEditor(space)}>
                      Edit
                    </Button>
                    {space.estado_espacio !== "inactivo" && (
                      <ConfirmAction
                        label="Deactivate"
                        description={`Deactivate ${space.nombre_espacio}? New reservations will be blocked. Existing reservations remain in history.`}
                        action={() => deactivateSpace(space.id_espacio)}
                        onDone={onChange}
                      />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {booking && (
        <BookingDialog
          space={booking}
          onClose={() => setBooking(undefined)}
          onBooked={onBooked}
        />
      )}
      {editor && (
        <SpaceEditor
          space={editor === "new" ? undefined : editor}
          onClose={() => setEditor(undefined)}
          onChange={onChange}
        />
      )}
    </Section>
  )
}
