import { useCallback, useState } from "react"
import {
  Button,
  Card,
  CardContent,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui"
import { getAccessHistory } from "@/lib/api"
import type { Espacio, FiltrosAccesos } from "@/lib/api"
import { useRemote } from "@/hooks/use-remote"
import {
  ActionForm,
  Choice,
  FormField,
  LocalTime,
  RefreshButton,
  RemoteState,
  Section,
  Status,
  text
} from "@/features/shared"

const denialReasons: Record<string, string> = {
  credencial_invalida: "Unknown credential",
  credencial_inactiva: "Inactive credential",
  usuario_inactivo: "Inactive user",
  espacio_no_disponible: "Cubicle unavailable",
  reservacion_liberada: "Reservation released after missed check-in",
  sin_reservacion_vigente: "No reservation at this time"
}

export function AccessHistory({
  spaces,
  admin
}: {
  spaces: Espacio[]
  admin: boolean
}) {
  const [space, setSpace] = useState("")
  const [result, setResult] = useState("")
  const [filters, setFilters] = useState<FiltrosAccesos>({
    pagina: 1,
    limite: 20
  })
  const load = useCallback(
    (signal: AbortSignal) => getAccessHistory(filters, signal),
    [filters]
  )
  const history = useRemote(load)
  return (
    <Section
      id="access"
      title="Access history"
      description={
        admin
          ? "Entry attempts across the system, including unknown credentials."
          : "Your cubicle entry attempts and their results."
      }
      action={<RefreshButton {...history} />}
    >
      <Card>
        <CardContent>
          <ActionForm
            submit="Apply filters"
            action={async (values) => {
              const from = text(values, "from"),
                until = text(values, "until")
              if (from && until && new Date(until) < new Date(from))
                throw new Error(
                  "The end of the date range must follow the start."
                )
              setFilters({
                pagina: 1,
                limite: 20,
                id_espacio: space ? Number(space) : undefined,
                resultado: result
                  ? (result as "permitido" | "denegado")
                  : undefined,
                id_usuario:
                  admin && text(values, "user")
                    ? Number(values.get("user"))
                    : undefined,
                desde: from ? new Date(from).toISOString() : undefined,
                hasta: until ? new Date(until).toISOString() : undefined
              })
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <FormField label="Cubicle">
                <Choice
                  label="Filter access by cubicle"
                  value={space}
                  onChange={setSpace}
                  options={[
                    { value: "", label: "All cubicles" },
                    ...spaces.map((space) => ({
                      value: String(space.id_espacio),
                      label: space.nombre_espacio
                    }))
                  ]}
                />
              </FormField>
              <FormField label="Result">
                <Choice
                  label="Filter access by result"
                  value={result}
                  onChange={setResult}
                  options={[
                    { value: "", label: "All results" },
                    { value: "permitido", label: "Allowed" },
                    { value: "denegado", label: "Denied" }
                  ]}
                />
              </FormField>
              <FormField label="From (local time)">
                <Input
                  aria-label="Access from"
                  type="datetime-local"
                  name="from"
                />
              </FormField>
              <FormField label="Until (local time)">
                <Input
                  aria-label="Access until"
                  type="datetime-local"
                  name="until"
                />
              </FormField>
              {admin && (
                <FormField label="User ID">
                  <Input
                    aria-label="Filter access by user ID"
                    name="user"
                    type="number"
                    step={1}
                    min={1}
                    placeholder="All users"
                  />
                </FormField>
              )}
            </div>
          </ActionForm>
        </CardContent>
      </Card>
      <RemoteState {...history} />
      {history.data && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Cubicle</TableHead>
                {admin && <TableHead>User</TableHead>}
                <TableHead>Method</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!history.data.datos.length && (
                <TableRow>
                  <TableCell
                    colSpan={admin ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No access attempts match these filters.
                  </TableCell>
                </TableRow>
              )}
              {history.data.datos.map((access) => (
                <TableRow key={access.id_acceso}>
                  <TableCell>
                    <LocalTime value={access.fecha} />
                  </TableCell>
                  <TableCell>
                    {access.nombre_espacio ?? "Unknown cubicle"}
                  </TableCell>
                  {admin && (
                    <TableCell>
                      {access.usuario ?? "Unknown credential"}
                    </TableCell>
                  )}
                  <TableCell className="uppercase">
                    {access.metodo_utilizado}
                  </TableCell>
                  <TableCell>
                    <Status value={access.resultado} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {access.motivo_denegacion
                      ? (denialReasons[access.motivo_denegacion] ??
                        access.motivo_denegacion)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {history.data.total} attempts · Page {filters.pagina} of{" "}
              {Math.max(1, Math.ceil(history.data.total / filters.limite))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={history.loading || filters.pagina <= 1}
                onClick={() =>
                  setFilters({ ...filters, pagina: filters.pagina - 1 })
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={
                  history.loading ||
                  filters.pagina * filters.limite >= history.data.total
                }
                onClick={() =>
                  setFilters({ ...filters, pagina: filters.pagina + 1 })
                }
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Section>
  )
}
