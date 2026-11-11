import { Card, CardContent, CardHeader, CardTitle } from "./components/ui"
import { AppLayout } from "./components/app-layout"

function App() {
  return (
    <AppLayout>
    <main id="overview" className="flex-1 bg-muted/40 p-4 text-left sm:p-6">
      <header className="mb-6">
        <img src="/assets/LogoKuby.png" alt="Kuby" className="h-10 w-auto object-contain invert" />
      </header>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome to Kuby</h1>
        </div>
        <section className="grid gap-4 md:grid-cols-2" aria-label="Your Kuby account">
          <Card id="reservations">
            <CardHeader>
              <CardTitle>My reservations</CardTitle>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Your reservations will appear here once your account is connected.</p></CardContent>
          </Card>
          <Card id="spaces">
            <CardHeader>
              <CardTitle>Explore spaces</CardTitle>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Available spaces will appear here once booking is connected.</p></CardContent>
          </Card>
        </section>
      </div>
    </main>
    </AppLayout>
  )
}

export default App
