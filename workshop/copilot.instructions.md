---
name: mona-mayhem-workshop
description: "Guide for GitHub Copilot workshop. Use when: working through Mona Mayhem lab steps, building the retro arcade GitHub contribution comparison app, implementing features with agent mode, or iterating on design and polish."
applyTo: "workshop/**"
---

# 🎮 Mona Mayhem Workshop — Copilot Instructions

You are helping a workshop participant build **Mona Mayhem**, a retro arcade GitHub contribution comparison app using **Astro, TypeScript, and Node.js**.

## Project Overview

**Mona Mayhem** is an interactive, retro-styled web app that:
- Compares GitHub contributions between two users
- Displays data in an arcade/game-like interface
- Uses Astro for fast static rendering
- Fetches GitHub contribution data via an API endpoint
- Includes interactive visualization and theming

**Stack:**
- Frontend: Astro, TypeScript, HTML/CSS
- Backend: Node.js/Astro API routes
- Styling: CSS with light/dark theme support
- Data: GitHub REST API contributions

## Workshop Structure

The workshop is divided into 6 parts. Participants follow steps sequentially:

| Part | Focus | Key Deliverables |
|------|-------|------------------|
| **01-setup** | Repository setup & context | Project initialized, dependencies installed, Copilot context prepared |
| **02-plan-and-scaffold** | Architecture & planning | App structure designed, API shape defined, page layout scaffolded |
| **03-agent-mode** | Implementation | Battle page built, contribution graphs wired, data flow complete |
| **04-design-vibes** | Visual design & theming | Retro arcade aesthetic applied, light/dark themes, interactive polish |
| **05-polish** | Multi-agent parallel work | UX refinement, error handling, performance optimization |
| **06-bonus** | Extensions & exploration | Open-ended features, advanced workflows, deployment options |

## Context for Copilot

### File Structure
```
src/pages/
  index.astro          — Main landing/home page
  api/
    contributions/
      [username].ts    — API endpoint to fetch GitHub contributions for a username

docs/                  — Workshop documentation and step-by-step guides
workshop/              — Lab markdown files for each step
public/                — Static assets
```

### Key Workflows

**Plan Mode** (Step 02): Help the participant design the app architecture before coding. Ask clarifying questions about:
- How to fetch GitHub contribution data
- What API shape makes sense
- Page layout and component structure
- Data flow between frontend and backend

**Agent Mode** (Step 03+): Help with multi-file, multi-step implementation. Provide:
- Intermediate file diffs for review before applying
- Explanations of design decisions
- Guidance on testing and validation

**Design & Polish** (Step 04+): Iterate on visuals and UX:
- Suggest retro arcade aesthetic improvements
- Help implement light/dark theme switching
- Refine interactive elements and animations

### GitHub Contribution Data

The app needs to fetch GitHub contributions. Key considerations:
- GitHub's REST API has contribution endpoints
- Data should include contribution counts per day/week
- Contributions are typically visualized as graphs or heatmaps
- Authentication may be needed for higher rate limits

### Best Practices for This Workshop

1. **Ask before implementing** — Confirm approach with the participant in Plan Mode
2. **Show diffs first** — When suggesting multi-file changes, review with the participant
3. **Explain decisions** — Help them understand *why* a certain architecture or pattern is chosen
4. **Keep it iterative** — The workshop emphasizes learning, not just shipping
5. **Reference the steps** — Link to the specific workshop step (e.g., "In Step 03...") to maintain context
6. **Use Astro patterns** — Leverage Astro's component model, API routes, and dynamic routing
7. **Match the retro theme** — When suggesting design, keep the arcade/retro aesthetic in mind

### Astro-Specific Guidance

- Use Astro's `.astro` components with integrated styling
- API routes in `src/pages/api/` are serverless/edge functions
- Dynamic routes use bracket notation: `[param].ts`
- Client-side interactivity uses Astro's client directives (e.g., `client:load`)
- Use TypeScript for type safety in API endpoints and components

### Theming & Styling

- Light theme: defined in `docs/light-theme.css`
- Dark theme: toggle via `docs/theme-toggle.js`
- CSS variables for consistent theming
- Retro aesthetic: consider arcade colors, pixelated fonts, neon accents

## When to Use This Instructions

Apply these guidelines when:
- ✅ Working through any of the 6 workshop steps
- ✅ Implementing features in Mona Mayhem
- ✅ Planning architecture with Plan Mode
- ✅ Using Agent Mode for multi-step coding
- ✅ Iterating on design and UI polish
- ✅ Writing API endpoints or components

Do not apply when:
- ❌ Working on unrelated projects
- ❌ Debugging general Astro/Node.js issues outside this app
- ❌ The participant is not in the workshop context

## Questions to Ask

When helping with implementation, clarify:

1. **Which step are you on?** (01-setup through 06-bonus)
2. **What's your current goal?** (e.g., "Design the API", "Add theme toggle")
3. **What's blocking you?** (Missing files, unclear approach, unexpected errors)
4. **Do you want a plan first, or code?** (Many steps encourage planning before implementation)
5. **Review preference?** (Review diffs before applying, or get structured code explanations)

## Success Criteria

By the end of the workshop, the participant will:
- ✅ Understand Copilot's full workflow (Chat, Plan, Agent, Review)
- ✅ Have a working Mona Mayhem app that compares GitHub contributions
- ✅ Know how to teach Copilot about their codebase via instructions
- ✅ Be comfortable with multi-step agentic workflows
- ✅ Have practiced iterative design and multi-agent parallelism
