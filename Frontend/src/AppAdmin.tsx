import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  CpuIcon,
  DotsThreeIcon,
  HardDriveIcon,
  MemoryIcon,
  PlusIcon,
  PulseIcon,
  ThermometerIcon,
  WifiHighIcon,
  XCircleIcon,
} from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { AppLayout } from "./components/app-layout"
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
  ProgressLabel,
  ProgressValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui"

type Resumen = {
  usuarios: number
  espacios: number
  reservaciones: number
  accesos: number
}

function AppAdmin() {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/resumen")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo consultar la API")
        return res.json()
      })
      .then(setResumen)
      .catch((err) => setError(err.message))
  }, [])

  const tarjetas = [
    { titulo: "Users", valor: resumen?.usuarios },
    { titulo: "Spaces", valor: resumen?.espacios },
    { titulo: "Reservations", valor: resumen?.reservaciones },
    { titulo: "Access logs", valor: resumen?.accesos },
  ]

  return (
    <AppLayout admin>
    <main id="overview" className="flex-1 bg-muted/40 p-4 text-left sm:p-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div>
            <img
              src="/assets/LogoKuby.png"
              alt="Kuby"
              className="h-10 w-auto object-contain invert"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button>
            <PlusIcon data-icon="inline-start" />
            Add device
          </Button>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((tarjeta) => (
          <Card key={tarjeta.titulo}>
            <CardHeader>
              <CardDescription>{tarjeta.titulo}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="text-3xl font-bold text-foreground">
                {tarjeta.valor ?? "â€”"}
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="system" className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>System overview</CardTitle>
            <CardAction>
              <Button variant="ghost" size="icon-sm" aria-label="View system overview">
                <ArrowUpRightIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-5 pt-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center bg-secondary text-secondary-foreground">
                <WifiHighIcon size={18} />
              </div>
              <div>
                <p className="font-medium text-foreground">Connectivity</p>
                <p className="text-xs text-muted-foreground">18 of 24 online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center bg-secondary text-secondary-foreground">
                <PulseIcon size={18} />
              </div>
              <div>
                <p className="font-medium text-foreground">Data flow</p>
                <p className="text-xs text-muted-foreground">2.4 GB processed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center bg-secondary text-secondary-foreground">
                <ThermometerIcon size={18} />
              </div>
              <div>
                <p className="font-medium text-foreground">Avg. temperature</p>
                <p className="text-xs text-muted-foreground">24.8Â°C</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="grid gap-4 sm:grid-cols-3">
            <Progress value={75}>
              <div className="flex w-full items-center justify-between gap-3">
                <ProgressLabel>Availability</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
            <Progress value={62} indicatorClassName="bg-emerald-500">
              <div className="flex w-full items-center justify-between gap-3">
                <ProgressLabel>Battery health</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
            <Progress value={84} indicatorClassName="bg-sky-500">
              <div className="flex w-full items-center justify-between gap-3">
                <ProgressLabel>Signal quality</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Alerts</CardTitle>
            <CardAction>
              <Button variant="ghost" size="icon-sm" aria-label="View system overview">
                <CheckCircleIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y p-0">
            <div className="flex items-start gap-3 px-4 py-3">
              <XCircleIcon className="mt-0.5 text-destructive" size={18} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">Kuby Offline</p>
                <p className="text-xs text-muted-foreground">Kuby 04 Â· 12 min ago</p>
              </div>
              <Badge variant="ghost" className="ml-auto text-red-600">High</Badge>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <ThermometerIcon className="mt-0.5 text-amber-600" size={18} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">Temperature</p>
                <p className="text-xs text-muted-foreground">Kuby 02 Â· 34 min ago</p>
              </div>
              <Badge variant="ghost" className="ml-auto text-blue-500">Medium</Badge>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <CheckCircleIcon className="mt-0.5 text-emerald-600" size={18} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">Firmware update</p>
                <p className="text-xs text-muted-foreground">6 devices Â· 1 hr ago</p>
              </div>
              <Badge variant="ghost" className="ml-auto text-emerald-500">Resolved</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardAction><HardDriveIcon size={18} className="text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <Progress value={68}>
              <div className="flex w-full items-center justify-between gap-3">
                <ProgressLabel>17 GB of 25 GB</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CPU</CardTitle>
            <CardAction><CpuIcon size={18} className="text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <Progress value={42} indicatorClassName="bg-emerald-500">
              <div className="flex w-full items-center justify-between gap-3">
                <ProgressLabel>42% of capacity</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Memory</CardTitle>
            <CardAction><MemoryIcon size={18} className="text-muted-foreground" /></CardAction>
          </CardHeader>
          <CardContent>
            <Progress value={79} indicatorClassName="bg-amber-500">
              <div className="flex w-full items-center justify-between gap-3">
                <ProgressLabel>6.3 GB of 8 GB</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
          </CardContent>
        </Card>
      </section>

      <Card id="devices">
        <CardHeader className="border-b">
          <CardTitle>Devices</CardTitle>
          <CardAction>
            <Button variant="ghost" size="icon-sm" aria-label="More device options">
              <DotsThreeIcon />
            </Button>
          </CardAction>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Signal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Kuby 01", "Online", "Just now", "Office 1", "Excellent"],
              ["Kuby 02", "Online", "2 min ago", "Office 2", "Good"],
              ["Kuby 04", "Offline", "12 min ago", "Office 3", "Lost"],
              ["Kuby 05", "Online", "4 min ago", "Office 4", "Good"],
            ].map(([name, status, lastSeen, location, signal]) => (
              <TableRow key={name}>
                <TableCell className="font-medium text-foreground">{name}</TableCell>
                <TableCell>
                  <Badge variant={status === "Online" ? "secondary" : "destructive"}>
                    {status}
                  </Badge>
                </TableCell>
                <TableCell>{lastSeen}</TableCell>
                <TableCell>{location}</TableCell>
                <TableCell className="text-right">
                  <span className={signal === "Lost" ? "text-destructive" : "text-emerald-600"}>{signal}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </main>
    </AppLayout>
  )
}

export default AppAdmin
