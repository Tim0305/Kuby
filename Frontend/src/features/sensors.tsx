import { useCallback, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "../components/ui/chart"
import { getReadings, getSensorState } from "../lib/api"
import type { Espacio, Sensor } from "../lib/api"
import { useRemote } from "../hooks/use-remote"
import { Choice, LocalTime, RemoteState, Section } from "./shared"

const sensorLabels: Record<Sensor, { label: string; unit: string }> = {
  temperatura: { label: "Temperature", unit: "°C" },
  humedad: { label: "Humidity", unit: "%" },
  proximidad: { label: "Proximity", unit: "" }
}
const sensors = Object.keys(sensorLabels) as Sensor[]

function readingValue(sensor: Sensor, value: number) {
  return sensor === "proximidad"
    ? Number(value) === 1
      ? "Detected"
      : "No detection"
    : `${Number(value).toLocaleString([], { maximumFractionDigits: 1 })} ${sensorLabels[sensor].unit}`
}

function SensorDetails({ spaceId }: { spaceId: number }) {
  const [sensor, setSensor] = useState<Sensor>("temperatura")
  const loadState = useCallback(
    (signal: AbortSignal) => getSensorState(spaceId, signal),
    [spaceId]
  )
  const loadReadings = useCallback(
    (signal: AbortSignal) => getReadings(sensor, spaceId, signal),
    [spaceId, sensor]
  )
  const state = useRemote(loadState, 60_000)
  const readings = useRemote(loadReadings, 60_000)
  const points = readings.data
    ? [...readings.data]
        .reverse()
        .map((row) => ({ ...row, valor: Number(row.valor) }))
    : []
  return (
    <div className="space-y-4">
      <RemoteState {...state} />
      <div className="grid gap-4 md:grid-cols-3">
        {sensors.map((sensor) => {
          const reading = state.data?.find((row) => row.tipo_sensor === sensor)
          return (
            <Card key={sensor}>
              <CardHeader>
                <CardTitle>{sensorLabels[sensor].label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold tabular-nums">
                  {reading ? readingValue(sensor, reading.valor) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reading ? (
                    <LocalTime value={reading.registrado_en} />
                  ) : (
                    "No readings yet"
                  )}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Recent readings</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest 50 readings · Refreshes every minute while this tab is
              visible.
            </p>
          </div>
          <div className="w-44">
            <Choice
              label="Sensor history"
              value={sensor}
              onChange={(value) => setSensor(value as Sensor)}
              options={sensors.map((value) => ({
                value,
                label: sensorLabels[value].label
              }))}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RemoteState {...readings} />
          {readings.data?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {sensorLabels[sensor].label.toLowerCase()} readings for this
              cubicle yet.
            </p>
          )}
          {points.length > 0 && (
            <>
              <ChartContainer
                config={{
                  valor: {
                    label: sensorLabels[sensor].label,
                    color: "var(--chart-1)"
                  }
                }}
                className="h-56 w-full"
                aria-label={`${sensorLabels[sensor].label} history`}
              >
                <LineChart
                  accessibilityLayer
                  data={points}
                  margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={42}
                    domain={sensor === "proximidad" ? [0, 1] : ["auto", "auto"]}
                    allowDecimals={sensor !== "proximidad"}
                    unit={sensorLabels[sensor].unit}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) =>
                          new Date(
                            String(payload[0]?.payload?.fecha)
                          ).toLocaleString()
                        }
                      />
                    }
                  />
                  <Line
                    dataKey="valor"
                    type={sensor === "proximidad" ? "stepAfter" : "linear"}
                    stroke="var(--color-valor)"
                    strokeWidth={2}
                    dot={points.length === 1}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Latest 10 readings</TableHead>
                    <TableHead className="text-right">
                      {sensorLabels[sensor].label}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.data?.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <LocalTime value={row.fecha} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {readingValue(sensor, row.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function Sensors({ spaces }: { spaces: Espacio[] }) {
  const [selected, setSelected] = useState("")
  const spaceId = spaces.some((space) => String(space.id_espacio) === selected)
    ? Number(selected)
    : spaces[0]?.id_espacio
  return (
    <Section
      id="sensors"
      title="Cubicle conditions"
      description="Sensor measurements show the last reported conditions, independent of booking availability."
      action={
        spaces.length > 0 && (
          <div className="w-56">
            <Choice
              label="Cubicle for sensor readings"
              value={String(spaceId)}
              onChange={setSelected}
              options={spaces.map((space) => ({
                value: String(space.id_espacio),
                label: space.nombre_espacio
              }))}
            />
          </div>
        )
      }
    >
      {spaceId ? (
        <SensorDetails key={spaceId} spaceId={spaceId} />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Add a cubicle to view its sensor readings.
          </CardContent>
        </Card>
      )}
    </Section>
  )
}
