# Mona Mayhem — Copilot Instructions

This is a retro arcade-themed web app built with **Astro 5** that compares GitHub contribution graphs between two users. It's designed as a workshop project to teach GitHub Copilot workflows.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:4321)
npm run build        # Build for production
npm run preview      # Preview production build
```

No test suite or linter is configured in this project.

## Architecture

### Astro Configuration

- **Output mode**: `server` (SSR enabled)
- **Adapter**: `@astrojs/node` in standalone mode
- **TypeScript**: Strict mode enabled via `astro/tsconfigs/strict`

### Project Structure

```
src/pages/
  index.astro                           — Home page
  api/contributions/[username].ts       — GitHub contribution data API

docs/                                   — Static workshop documentation pages
  styles.css, light-theme.css           — Retro arcade themed styles
  theme-toggle.js                       — Light/dark theme switcher

workshop/                               — Workshop step-by-step guides (markdown)
  copilot.instructions.md               — Workshop-specific scoped instructions
```

### API Endpoint Pattern

The contributions API uses **Astro dynamic routes** with bracket notation:

- Route: `/api/contributions/[username].ts`
- Exports: `GET` and `OPTIONS` (CORS support)
- Set `export const prerender = false` to disable prerendering for API routes

**Data flow:**
1. Fetches GitHub user profile HTML (no API key required)
2. Parses contribution data from SVG calendar graph using regex
3. Returns structured JSON with contribution counts, levels, and metadata
4. Implements in-memory caching (2-hour TTL) to avoid rate limits

**Key implementation details:**
- Username validation: alphanumeric + hyphens, 1-39 chars
- Timeout: 10 seconds for external fetch
- Error handling: Returns structured JSON errors with appropriate HTTP status codes
- CORS: Enabled with `Access-Control-Allow-Origin: *`

### Type Definitions

API response types are defined inline in `[username].ts`:
- `ContributionData` — Full response structure
- `ContributionDay` — Individual day data (date, count, level)
- `CacheEntry` — In-memory cache structure

## Conventions

### Astro Component Structure

- Use `.astro` components for pages (frontmatter + HTML)
- API routes are TypeScript files (`.ts`) in `src/pages/api/`
- Export `GET`, `POST`, etc. as named exports of type `APIRoute`

### Styling Approach

- **Theme system**: CSS custom properties (see `docs/styles.css`)
- **Dark mode**: Default theme with cyan/magenta neon accents
- **Light mode**: Available via `docs/light-theme.css`
- **Aesthetic**: Retro arcade/gaming with grid backgrounds, neon gradients, pixelated fonts

CSS variables:
```css
--bg-dark, --bg-card          — Background colors
--neon-cyan, --neon-magenta   — Primary accent colors
--text-primary, --text-secondary — Text hierarchy
--border-color                — Card/panel borders
```

### API Response Format

Always return JSON with:
- Proper `Content-Type: application/json` header
- CORS headers for cross-origin access
- Cache-Control headers (differ for cached vs fresh data)
- Structured error responses with `error`, `status`, and `timestamp` fields

### Error Handling in APIs

Use helper function pattern:
```typescript
function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error, status, timestamp }), {
    status,
    headers: { /* ... */ }
  });
}
```

## Workshop Context

This codebase is a teaching tool for GitHub Copilot workflows. The `workshop/` directory contains step-by-step guides:

1. **Setup & Context** — Install dependencies, teach Copilot about the project
2. **Plan & Scaffold** — Design API and page architecture
3. **Agent Mode** — Build battle page and contribution graphs
4. **Design Vibes** — Apply retro theming and polish UI
5. **Polish & Parallel Work** — Multi-agent refinement
6. **Bonus** — Extensions and experiments

The `workshop/copilot.instructions.md` file contains **scoped instructions** that apply only to workshop-related tasks. These main instructions apply to the codebase itself.

## External Dependencies

- **GitHub Contribution Data**: Scraped from public profile HTML (no auth required)
- **Font**: Press Start 2P (retro gaming font) — loaded via Google Fonts CDN (if used)
- **No database**: Uses in-memory caching only

## Rate Limiting Considerations

GitHub may rate-limit profile scraping. Mitigations:
- 2-hour cache TTL per username
- User-Agent header identifying the app
- Graceful 503/504 error responses on fetch failures

When extending the API, consider:
- Adding GitHub token auth for higher limits
- Using GitHub's GraphQL API instead of scraping
- Implementing persistent cache (Redis, etc.)
