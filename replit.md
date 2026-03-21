# Downtime Tracker

## Overview

A manufacturing downtime tracking and analytics system built for precision monitoring of production lines and equipment. The application enables operators to log machine downtime events, categorize failure reasons, and provides real-time analytics on equipment utilization across multiple manufacturing processes.

The system follows a multi-tenant architecture where users can be granted access to specific processes with role-based permissions (admin or operator).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: 
  - TanStack Query for server state and caching
  - Zustand for client-side state (with persistence)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: Vite for client, esbuild for server bundling
- **API Design**: RESTful endpoints under `/api/*` prefix

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` for shared type safety between client and server
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Authentication
- **Strategy**: Dual authentication support
  - Custom email/password authentication with bcrypt hashing
  - Google OAuth via Passport.js
  - Replit Auth integration (optional, in `server/replit_integrations/`)
- **Session Management**: Express sessions with 1-week TTL
- **Email Verification**: Token-based verification (auto-verified in development)

### Data Model
The core entities are:
- **Processes**: Production lines or workflows
- **Nodes**: Individual equipment/machines within processes
- **Downtime Events**: Time-bounded records of equipment failures with optional downtime reason (why it stopped) and uptime reason (why it restarted)
- **Downtime Reasons**: Reasons selected when a machine is stopped (logged at downtime start)
- **Uptime Reasons**: Reasons selected when a machine is restarted (logged at downtime end) — stored in `uptime_reasons` table, `uptimeReasonId` on `downtime_events`
- **User Permissions**: Role-based access control per process (admin/operator)

### Access Control
- Users are granted permissions to specific processes
- Two roles: `admin` (full control) and `operator` (can log events)
- Process creators automatically receive admin access

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations`

### Authentication Services
- **Google OAuth**: Optional, requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Session Secret**: Requires `SESSION_SECRET` environment variable

### Third-Party Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Recharts**: Chart library for analytics dashboards
- **date-fns**: Date formatting and manipulation
- **Zod**: Runtime schema validation shared between client and server