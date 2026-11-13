# Kuby frontend

Run `npm install` and `npm run dev` from this directory. The Vite proxy forwards `/api` requests to the existing backend at `http://127.0.0.1:3001`.

## Authentication

- `/login` is the shared login page for all accounts.
- `/signup` creates a normal user account and then signs it in automatically.
- `/` is the normal app; `/admin` is the administrator dashboard.

Sessions are restored through `/api/auth/me` using the backend's HTTP-only cookie. The server profile determines the destination: `admin` accounts go to `/admin`, and other accounts go to `/`. Signed-out visitors are redirected to `/login`; signed-in visitors cannot remain on the login or signup pages. Admin roles are assigned by the backend, never by the signup form.

Both dashboards display the signed-in user's profile and use `/api/auth/logout` to sign out. If signup succeeds but automatic sign-in fails, the form offers a sign-in retry without creating another account.

The authentication pages adapt the shadcn `login-03` and `signup-03` blocks to Kuby's existing Base UI components and student ID API. Unsupported social login, email, and password-reset controls are omitted.

## Verification

- `npm test` runs API and booking regression tests plus Chromium browser flows against an isolated in-memory API. It never connects to the real database. On a fresh machine, install the browser with `npx playwright install chromium --only-shell` first.
- `npm run build` checks TypeScript and creates the production build.
- `npm run lint` checks the project with ESLint.

## Application styling

`src/index.css` is the single application stylesheet, imported once by `src/main.tsx`. It contains the local fonts, light/dark theme tokens, Tailwind v4 bindings, shared component surfaces, dashboard and authentication layouts, responsive rules, and accessibility states.

Add shared colours, status palettes, and radii to the theme tokens first. Keep feature rules in their labelled sections and breakpoint overrides in the responsive section. Style existing Base UI components through their data slots; keep layout utilities in React and component behavior in the existing primitives. Login, signup, session feedback, and both dashboards share this style system. No external theme-preview script is loaded.

## Workspace features

- Users can browse cubicles, book, reschedule upcoming reservations, cancel eligible reservations, and see their current/next visit. Availability is checked by the backend when saving; there is no public calendar API.
- Admins also manage cubicles, all reservations, and user names, roles, and active/inactive status. Dashboard totals come from `/api/resumen` and include historical/inactive records.
- Both roles can inspect sensor conditions and recent charts, filter and page through their permitted access history, and edit their own names, password, and photo.
- Reservation status and sensor readings refresh every minute while the browser tab is visible. Dates are sent as ISO UTC and displayed in the browser's local time zone. Proximity detection is displayed separately from booking availability.

Feature screens live directly in `src/features`, with shared forms and feedback in `shared.tsx`. The API client stays in `src/lib/api.ts`; `use-remote.ts` handles cancellation, retries, and polling. Both roles share one dashboard, while permissions remain enforced by the backend.

The role picker defaults to the checked-in database seed (`admin = 1`, `usuario = 2`) and uses role IDs observed in loaded users when available. If a deployment uses different IDs without any users assigned to those roles, update these defaults; the backend currently has no role-list endpoint.

Credential enrollment, device registration, alerts, facial recognition, lighting/curtain controls, and preferences remain excluded because the backend does not expose the required APIs. Reservation purpose is omitted because the backend does not persist it.
