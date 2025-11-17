# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `pnpm dev` - Start Next.js development server on port 4004 (clears .next cache)
- `pnpm turbodev` - Start development server with Turbopack
- `pnpm ngrok` - Expose local dev server via ngrok tunnel

### Building & Deployment
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm preview` - Build and preview with Cloudflare
- `pnpm deploy` - Deploy to Cloudflare Pages

### Linting & Type Checking
- `pnpm lint` - Run ESLint
- Note: TypeScript errors are ignored during builds (ignoreBuildErrors: true)

### Database (Cloudflare D1)
- `pnpm drizzle:generate` - Generate database migrations
- `pnpm d1:apply` - Apply migrations locally
- `pnpm d1:apply:remote` - Apply migrations to production
- `pnpm cf-typegen` - Generate Cloudflare environment types

### Development Setup
- Node.js 20 required (use `nvm use 20`)
- Uses pnpm for package management
- Uses workspace configuration (root + worker)

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Deployment**: Cloudflare Pages (OpenNext)
- **Styling**: Tailwind CSS v4
- **Internationalization**: next-intl with `[locale]` dynamic routes
- **Authentication**: NextAuth v5 (Google OAuth)
- **Database**: Cloudflare D1 with Drizzle ORM
- **UI Components**: Shadcn UI + Magic UI v4
- **Theming**: CSS custom properties with dark/light mode

### Project Structure
- `src/app/[locale]/` - Internationalized pages (App Router)
- `src/components/` - Reusable React components
  - `blocks/` - Complex page-level components (header, footer)
  - `ui/` - Basic Shadcn UI components
  - `theme/` - Theme-related components
  - `locale/` - Language-specific components
- `src/i18n/` - Internationalization configuration and translations
- `src/types/` - TypeScript type definitions organized by domain
- `src/constants/` - Application constants and configuration
- `worker/` - Cloudflare Worker configuration (separate workspace)

### Key Files
- `src/middleware.ts` - Handles i18n routing and redirects
- `src/i18n/routing.ts` - Internationalization route configuration
- `src/app/theme.css` - CSS custom properties for theming
- `src/lib/utils.ts` - Common utility functions
- `wrangler.jsonc` - Cloudflare deployment configuration

### Component Development Guidelines
- Use **Magic UI v4** for complex/animated components
- Use **Shadcn UI** for basic components (install if missing)
- Support theme switching and internationalization
- Use TypeScript interfaces for all props
- Export components as default exports
- File naming: kebab-case, component naming: PascalCase

### Internationalization System
- Uses `[locale]` dynamic route segments
- Text in high-level components uses `@/i18n/utils` for translation
- Low-level components receive text via props
- Content stored in `src/i18n/pages/[locale]/` as TypeScript and Markdown
- Supports RTL language layout adaptation

### Theme System
- CSS custom properties in `src/app/theme.css`
- Theme state managed in `src/contexts/app.tsx`
- Toggle component: `src/components/theme/toggle.tsx`
- Supports light/dark/system modes with persistence
- Use Tailwind's `dark:` prefix for dark mode styles

### Type Safety
- Comprehensive TypeScript coverage
- Types organized by domain in `src/types/`
- Global types in `src/types/global.d.ts`
- Environment types generated with `pnpm cf-typegen`

### Authentication & User Management
- NextAuth v5 with Google OAuth
- User data stored in Cloudflare D1
- Credit system for user limitations
- Stripe integration for payments (configured but not actively used)

### Development Notes
- ESLint and TypeScript errors ignored during builds for faster iteration
- Uses OpenNext for Cloudflare Pages compatibility
- Webpack configured for Markdown file imports and icon auto-installation
- Debug mode enabled with DEBUG=gamesramp environment variable