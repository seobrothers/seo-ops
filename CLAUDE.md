# SEO Brothers Workbench - Claude Configuration and Context

## Project Overview

This is an internal tool that pairs with our external-facing client portal (built, maintained, and deployed in a separate github repo.). This is where our team of SEO specialists "do" their work.

If the user references the portal and asks you to review anything from that project it can be found in ../partner-portal/* outside of the main /workbench/ root directory.

## Tech Stack
- **Frontend**: SvelteKit + TypeScript + TailwindCSS + Shadcn-Svelte
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle
- **Auth**: Kinde
- **Deployment**: Cloudflare Workers + Hyperdrive

## Database Setup
- **Production**: Hyperdrive connection to production Supabase
- **Development**: Use the same Hyperdrive connection to the production Supabase

## Multi-Device Setup
- Clone repo + copy `.env.local` credentials
- Link to dev Supabase: `supabase link --project-ref {project}`
- No Docker or local database used

## Key Commands
- **Dev server**: `npm run dev`
- **Deploy**: `npm run preview` (Cloudflare preview)
- **Lint/Type check**: `npm run lint`, `npm run check`
- **Migrations**: `supabase db push` (apply to remote)

## Team
- Two developers

## File Structure Organization

### Client-Side Code (`/src/lib/`)
Files that run in the browser and can be imported into Svelte components:

- **/src/lib/components/** - Reusable Svelte components. The `components/ui/` subdirectory stores shared UI components largely based on Shadcn-Svelte's component library.
- **/src/lib/*.ts** - Client-side utilities and shared code:
  - `dates.ts` - Date formatting utilities (used in components for client-side timezone handling)
  - `icons.ts` - Centralized Lucide icon exports
  - `utils.ts` - Tailwind utility functions (e.g., `cn()` for class merging)
  - `types.ts` - Shared TypeScript types used across client components

**When to use `/src/lib/`:**
- ✅ Code that runs in the browser
- ✅ Utilities used in Svelte components
- ✅ Does NOT import server-only packages (postgres, drizzle, etc.)
- ✅ Does NOT access environment variables
- ✅ Can safely run in both SSR and client contexts

### Server-Only Code (`/src/lib/server/`)
Files that ONLY run on the server (never sent to the browser):

- **/src/lib/server/db/** - Database layer:
  - `schema.ts` - Drizzle table definitions (source of truth for database structure)
  - `index.ts` - Database connection setup and initialization
  - If schema grows too large, consider splitting into logical files (e.g., `schema/users.ts`, `schema/campaigns.ts`) but discuss with team first

- **/src/lib/server/repositories/** - Database repositories using Drizzle ORM:
  - **ALWAYS use repositories** for database operations in page server files
  - **NEVER write raw SQL or direct Drizzle queries** in `+page.server.ts` or `+server.ts` files
  - Each repository encapsulates CRUD operations for a specific table/domain
  - Pattern: `XRepository` class with methods like `getAll()`, `getById()`, `create()`, `update()`, `delete()`
  - If adding functionality for a new table without a repository, discuss structure with team first

- **/src/lib/server/services/** - Business logic and orchestration layer:
  - Coordinate multiple repositories
  - Handle complex transactions
  - Implement business rules that span multiple tables
  - Examples: `paymentService.ts`, `onboardingService.ts`

- **/src/lib/server/helpers/** - Server-side utility functions:
  - Pure functions that assist with data transformation or validation
  - Examples: domain normalization, slug generation, validation helpers
  - Can be imported into repositories, services, or page server files
  - Different from client-side helpers in `/src/lib/` (those run in browser)

- **/src/lib/server/config/** - Server-side configuration and constants:
  - Data structure definitions
  - Mapping documents
  - Configuration objects
  - Enums and constants used server-side

**When to use `/src/lib/server/`:**
- ✅ Imports server-only packages (postgres, drizzle, node libraries)
- ✅ Accesses environment variables
- ✅ Cannot or should not run in the browser
- ✅ Database operations, API integrations, sensitive logic

### Other Directories

- **/src/routes/** - SvelteKit file-based routing:
  - `+page.svelte` - Page components (client + SSR)
  - `+page.server.ts` - Server-only page logic (import from `/src/lib/server/`)
  - `+layout.svelte` / `+layout.server.ts` - Layout components and logic
  - `+server.ts` - API endpoints

- **/workers/worker-name/** - Standalone Cloudflare Workers:
  - Each worker has its own directory with `wrangler.toml`
  - Deployed independently via wrangler (not linked to GitHub deployments)
  - Used for background jobs, webhooks, scheduled tasks, etc.

### Important Notes

- **Helpers vs Services:** The user may use these terms interchangeably. As a junior developer, they may not always distinguish between utility functions (helpers) and business logic (services). When they mention one but describe the other, gently clarify and suggest the appropriate location.

- **Data Flow Pattern:**
  ```
  Component/Page
    ↓ (uses)
  +page.server.ts
    ↓ (imports)
  Service (optional, for complex logic)
    ↓ (imports)
  Repository
    ↓ (imports)
  Database (via Drizzle schema)
  ```

- **Never bypass repositories:** Even for simple queries, use repositories to maintain consistency and testability. If a query seems too simple for a repository method, it probably still belongs there for consistency. 