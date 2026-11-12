import { ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { AppLayout } from "./components/app-layout"
import {
  Badge, Button, Card, CardAction, CardContent, CardDescription,
  CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "./components/ui"
import { ApiError, getUsers } from "./lib/api"
import type { Usuario } from "./lib/api"

type AdminState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; users: Usuario[] }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again."
}

function AppAdmin({ user }: { user: Usuario }) {
  const [state, setState] = useState<AdminState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const users = await getUsers(controller.signal)
        if (!controller.signal.aborted) setState({ status: "ready", users })
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          window.location.replace("/login")
          return
        }
        setState({ status: "error", message: errorMessage(error) })
      }
    }

    void load()
    return () => controller.abort()
  }, [attempt])

  function refresh() {
    setState({ status: "loading" })
    setAttempt((value) => value + 1)
  }

  const summary = [
    { title: "Users", value: state.status === "ready" ? state.users.length : null },
    { title: "Spaces", value: null },
    { title: "Reservations", value: null },
    { title: "Access logs", value: null },
  ]

  return (
    <AppLayout admin user={user}>
      <main id="overview" className="flex-1 bg-muted/40 p-4 text-left sm:p-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <img src="/assets/LogoKuby.png" alt="Kuby" className="h-10 w-fit object-contain invert" />
          {state.status === "ready" && (
            <Button variant="outline" onClick={refresh}>
              <ArrowClockwiseIcon data-icon="inline-start" />Refresh
            </Button>
          )}
        </header>

        {state.status === "loading" && (
          <section role="status" aria-label="Loading administrator data" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <span className="sr-only">Loading administrator data...</span>
            {summary.map(({ title }) => <Skeleton key={title} className="h-28" />)}
          </section>
        )}

        {state.status === "error" && (
          <Card>
            <CardHeader><CardTitle>Could not load administrator data</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p role="alert" className="text-destructive">{state.message}</p>
              <Button onClick={refresh}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {state.status === "ready" && <>
          <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Administration summary">
            {summary.map(({ title, value }) => (
              <Card key={title}>
                <CardHeader><CardDescription>{title}</CardDescription></CardHeader>
                <CardContent>
                  <span className={value === null ? "text-sm text-muted-foreground" : "text-3xl font-bold text-foreground"}>
                    {value === null ? "Unavailable" : value.toLocaleString()}
                  </span>
                  {value === null && <p className="mt-2 text-xs text-muted-foreground">Not provided by the current API.</p>}
                </CardContent>
              </Card>
            ))}
          </section>

          <Card id="users" className="mb-6">
            <CardHeader className="border-b">
              <CardTitle>Users</CardTitle>
              <CardDescription>Registered accounts from the API.</CardDescription>
              <CardAction><Badge variant="secondary">{state.users.length} total</Badge></CardAction>
            </CardHeader>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Student ID</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {state.users.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No users found.</TableCell></TableRow>}
                {state.users.map((account) => <TableRow key={account.id_usuario}>
                  <TableCell className="font-medium">{account.nombre} {account.apellido}</TableCell>
                  <TableCell>{account.matricula}</TableCell>
                  <TableCell>{account.rol ?? "Unassigned"}</TableCell>
                  <TableCell><Badge variant={account.estatus === "activo" ? "secondary" : "outline"}>{account.estatus === "activo" ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </Card>

          <section id="system" className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader><CardTitle>System overview</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">User accounts connected</Badge>
                <p className="text-muted-foreground">Device connectivity, temperature, storage, CPU and memory data are not provided by the current API.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
              <CardContent className="text-muted-foreground">Alerts are not available from the current API.</CardContent>
            </Card>
          </section>

          <Card id="devices">
            <CardHeader className="border-b">
              <CardTitle>Devices</CardTitle>
              <CardAction><Button disabled><PlusIcon data-icon="inline-start" />Add device</Button></CardAction>
            </CardHeader>
            <CardContent className="text-muted-foreground">Device listing and registration are not available from the current API.</CardContent>
          </Card>
        </>}
      </main>
    </AppLayout>
  )
}

export default AppAdmin
