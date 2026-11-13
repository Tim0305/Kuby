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
import { formatNumber } from "@/lib/locale"
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
  credencial_invalida: "Credencial desconocida",
  credencial_inactiva: "Credencial inactiva",
  usuario_inactivo: "Usuario inactivo",
  espacio_no_disponible: "Cubículo no disponible",
  reservacion_liberada: "Reservación liberada por no registrar la entrada",
  sin_reservacion_vigente: "No hay una reservación vigente"
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
      title="Historial de accesos"
      description={
        admin
          ? "Intentos de acceso en todo el sistema, incluidas las credenciales desconocidas."
          : "Tus intentos de acceso a los cubículos y sus resultados."
      }
      action={<RefreshButton {...history} />}
    >
      <Card>
        <CardContent>
          <ActionForm
            submit="Aplicar filtros"
            action={async (values) => {
              const from = text(values, "from"),
                until = text(values, "until")
              if (from && until && new Date(until) < new Date(from))
                throw new Error(
                  "El fin del intervalo debe ser posterior al inicio."
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
              <FormField label="Cubículo">
                <Choice
                  label="Filtrar accesos por cubículo"
                  value={space}
                  onChange={setSpace}
                  options={[
                    { value: "", label: "Todos los cubículos" },
                    ...spaces.map((space) => ({
                      value: String(space.id_espacio),
                      label: space.nombre_espacio
                    }))
                  ]}
                />
              </FormField>
              <FormField label="Resultado">
                <Choice
                  label="Filtrar accesos por resultado"
                  value={result}
                  onChange={setResult}
                  options={[
                    { value: "", label: "Todos los resultados" },
                    { value: "permitido", label: "Permitido" },
                    { value: "denegado", label: "Denegado" }
                  ]}
                />
              </FormField>
              <FormField label="Desde (hora local)">
                <Input
                  aria-label="Accesos desde"
                  type="datetime-local"
                  name="from"
                />
              </FormField>
              <FormField label="Hasta (hora local)">
                <Input
                  aria-label="Accesos hasta"
                  type="datetime-local"
                  name="until"
                />
              </FormField>
              {admin && (
                <FormField label="ID de usuario">
                  <Input
                    aria-label="Filtrar accesos por ID de usuario"
                    name="user"
                    type="number"
                    step={1}
                    min={1}
                    placeholder="Todos los usuarios"
                  />
                </FormField>
              )}
            </div>
          </ActionForm>
        </CardContent>
      </Card>
      <RemoteState {...history} />
      {history.data && (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Cubículo</TableHead>
                {admin && <TableHead>Usuario</TableHead>}
                <TableHead>Método</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!history.data.datos.length && (
                <TableRow>
                  <TableCell
                    colSpan={admin ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No hay intentos de acceso que coincidan con estos filtros.
                  </TableCell>
                </TableRow>
              )}
              {history.data.datos.map((access) => (
                <TableRow key={access.id_acceso}>
                  <TableCell>
                    <LocalTime value={access.fecha} />
                  </TableCell>
                  <TableCell>
                    {access.nombre_espacio ?? "Cubículo desconocido"}
                  </TableCell>
                  {admin && (
                    <TableCell>
                      {access.usuario ?? "Credencial desconocida"}
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
              {formatNumber(history.data.total)} {history.data.total === 1 ? "intento" : "intentos"} · Página {formatNumber(filters.pagina)} de{" "}
              {formatNumber(Math.max(1, Math.ceil(history.data.total / filters.limite)))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={history.loading || filters.pagina <= 1}
                onClick={() =>
                  setFilters({ ...filters, pagina: filters.pagina - 1 })
                }
              >
                Anterior
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
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Section>
  )
}
