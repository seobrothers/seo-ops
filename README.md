# SEO Brothers Workbench

Internal tool for SEO specialists to do their work. Pairs with our external-facing client portal.

## Tech Stack
- **Frontend**: SvelteKit + TypeScript + TailwindCSS
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle (schema-first)
- **Auth**: Kinde
- **Deployment**: Cloudflare Workers + Hyperdrive

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env` credentials from the team
   - Add `DATABASE_URL` for Supabase connection

3. Link to Supabase dev database:
   ```bash
   supabase link --project-ref uvwnfwhzdjlrdbhtkanr
   ```

Once that is done, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

The app should be accessible at http://localhost:5173.

## Database Workflow (Drizzle-First)

We use a **schema-first approach** where Drizzle is the source of truth.

### Making Schema Changes

1. **Edit the schema**: Modify `src/lib/server/db/schema.ts`
   ```typescript
   // Example: Adding a new table
   export const posts = pgTable('posts', {
     id: serial('id').primaryKey(),
     title: text('title').notNull(),
     createdAt: timestamp('created_at').defaultNow()
   });
   ```

2. **Generate migration**: Create SQL migration files
   ```bash
   npm run db:generate
   ```
   This creates migration files in `drizzle/migrations/`

3. **Push to database**: Apply changes to Supabase
   ```bash
   npm run db:push
   ```
   Or manually copy SQL to `supabase/migrations/` and use `supabase db push`

4. **Use in repositories**: Query with type-safe Drizzle query builder
   ```typescript
   import { posts } from '../db/schema.js';
   await this.db.select().from(posts).where(eq(posts.id, 1));
   ```

### Available Commands

- `npm run db:generate` - Generate migration from schema changes
- `npm run db:push` - Push schema directly to database
- `npm run db:studio` - Open Drizzle Studio (visual database browser)

### If You Tinker in Supabase Studio

If you make changes directly in Supabase Studio:
1. Update `src/lib/server/db/schema.ts` to match
2. Generate a new migration: `npm run db:generate`
3. This keeps your schema file and migrations aligned

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Deploying

Done via Cloudflare Workers. Ensure environment variables are set in Cloudflare dashboard.
