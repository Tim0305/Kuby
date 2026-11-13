import { lazy, Suspense, useEffect, useState } from "react"
import { AuthPage } from "@/components/auth-page"
import { AuthShell } from "@/components/auth-shell"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui"
import { ApiError, getCurrentUser } from "@/lib/api"
import type { Usuario } from "@/lib/api"
import { authRedirect } from "@/lib/auth-routing"

const App = lazy(() => import("@/App"))

type Session =
  | { status: "loading" }
  | { status: "ready"; user: Usuario | null }
  | { status: "error"; message: string }

export default function AppRoot() {
  const [session, setSession] = useState<Session>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    function finish(user: Usuario | null) {
      if (controller.signal.aborted) return
      const redirect = authRedirect(window.location.pathname, user)
      if (redirect) {
        window.location.replace(redirect)
      } else {
        setSession({ status: "ready", user })
      }
    }

    async function restoreSession() {
      try {
        finish(await getCurrentUser(controller.signal))
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          finish(null)
        } else {
          setSession({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not check your session. Please try again."
          })
        }
      }
    }

    void restoreSession()
    return () => controller.abort()
  }, [attempt])

  if (session.status === "loading") {
    return (
      <AuthShell>
        <p
          role="status"
          className="py-8 text-center text-sm text-muted-foreground"
        >
          Checking your session...
        </p>
      </AuthShell>
    )
  }

  if (session.status === "error") {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Unable to connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p role="alert" className="text-sm">
              {session.message}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setSession({ status: "loading" })
                setAttempt((value) => value + 1)
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  if (!session.user) {
    return (
      <AuthPage
        signup={window.location.pathname.replace(/\/+$/, "") === "/signup"}
      />
    )
  }

  return (
    <Suspense
      fallback={
        <AuthShell>
          <p
            role="status"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            Loading your workspace…
          </p>
        </AuthShell>
      }
    >
      <App user={session.user} />
    </Suspense>
  )
}
