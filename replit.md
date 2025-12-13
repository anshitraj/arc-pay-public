# ArcPayKit

## Overview

ArcPayKit is a production-grade stablecoin payment gateway platform, similar to Stripe or Circle Payments, built natively on Arc blockchain. The application provides enterprise-quality payment processing with features including payment creation, invoicing, webhook management, and treasury operations. It's designed to showcase Arc's strengths: stable USDC gas fees, instant finality, and deterministic settlement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: TailwindCSS with custom design tokens following a dark navy theme with icy blue accents
- **Animations**: Framer Motion for subtle transitions and interactions
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript throughout
- **API Design**: RESTful API endpoints following Stripe-like patterns
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Simple email/password with scrypt password hashing

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for database schema management (`drizzle-kit push`)
- **Key Tables**: users, merchants, payments, invoices, webhook_endpoints, webhook_events, treasury_balances

### Project Structure
```
client/           # React frontend application
  src/
    components/   # Reusable UI components
    pages/        # Route-level page components
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  storage.ts      # Database operations
  db.ts           # Database connection
shared/           # Shared code between frontend and backend
  schema.ts       # Drizzle database schema and types
```

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds static assets, esbuild bundles server code
- **Build Output**: `dist/` directory with `public/` for static files and `index.cjs` for server

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations
- connect-pg-simple for session storage

### UI/Component Libraries
- Radix UI primitives (dialog, dropdown, tabs, etc.)
- shadcn/ui component system
- Lucide React for icons
- react-icons for additional icon sets

### Development Tools
- Replit-specific Vite plugins for development experience
- TypeScript for type safety across the stack
- Zod for runtime validation and schema generation via drizzle-zod