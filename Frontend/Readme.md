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

- `npm test` runs authentication API and redirect regression tests.
- `npm run build` checks TypeScript and creates the production build.
- `npm run lint` checks the project with ESLint.
