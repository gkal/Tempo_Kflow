# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload
- `npm run dev:flags` - Start dev server with feature flags
- `npm run preview` - Preview production build locally
- `npm run serve` - Run production server (Express)

### Building
- `npm run build` - Production build with TypeScript checks
- `npm run build:staging` - Staging build with relaxed TypeScript
- `npm run build:safe` - Production build without TypeScript errors
- `npm run build:dev` - Development build script
- `npm run build:stage` - Staging build script

### Code Quality
- `npm run lint` - Run ESLint with TypeScript support
- `npm run find-unused` - Find all unused code
- `npm run find-unused:utils` - Find unused utilities
- `npm run find-unused:services` - Find unused services
- `npm run find-unused:business` - Find unused business components

### Database
- `npm run types:supabase` - Generate TypeScript types from Supabase schema
- `npm run update-schema` - Update database schema

### Version Management
- `npm run version:major` - Bump major version
- `npm run version:minor` - Bump minor version
- `npm run version:patch` - Bump patch version

## Architecture

K-Flow is a React-based CRM system using Supabase as the backend. The architecture follows these patterns:

### Service Layer Pattern
All data operations go through the service layer (`src/services/`). Services handle:
- Supabase queries with proper error handling
- Real-time subscriptions
- Business logic and data transformation
- Caching and optimization

Key services:
- `customerService.ts` - Customer CRUD operations and duplicate detection
- `offerService.ts` - Offer management with line items
- `taskService.ts` - Task/activity tracking
- `formService.ts` - Dynamic form generation and submission

### Component Structure
- `src/components/ui/` - Reusable UI components (Radix UI + Tailwind)
- `src/components/[feature]/` - Feature-specific components
- Components use composition pattern with smaller, focused components

### State Management
- AuthContext for authentication state
- LoadingContext for global loading states
- FormContext for form state management
- Local component state for UI-specific data

### Data Flow
1. Components call service methods
2. Services interact with Supabase
3. Real-time updates trigger re-renders
4. Error boundaries catch and display errors

### Form Handling
- React Hook Form for form state
- Zod schemas for validation
- Dynamic form generation from JSON schemas
- Mobile-responsive form rendering

### Key Patterns
- Custom hooks for business logic (`src/hooks/`)
- Centralized error handling with toast notifications
- Soft deletion for data recovery
- Comprehensive audit trails on critical tables
- Row-level security (RLS) policies in Supabase

### Environment Configuration
The app uses Vite's environment modes:
- `development` - Local development
- `staging` - Staging environment
- `production` - Production environment

Environment variables are prefixed with `VITE_` to be accessible in the client.

### UI/UX Guidelines
- Follow existing Tailwind patterns
- Use Radix UI components from `src/components/ui/`
- Maintain accessibility with proper ARIA labels
- Show loading states during async operations
- Display errors with toast notifications
- Follow the component migration guide when updating deprecated components

### Database Considerations
- All tables use UUID primary keys
- Soft deletion with `deleted_at` timestamps
- Audit trails with `_history` tables
- Real-time subscriptions for live updates
- RLS policies enforce data access control

### Testing Approach
Currently no comprehensive test suite. When adding tests:
- Use the existing find-unused scripts to verify code usage
- TypeScript compilation serves as basic type checking
- Manual testing in development environment

### Development Workflow
1. Check TypeScript errors with build commands
2. Use `find-unused` scripts to identify dead code
3. Follow existing patterns in services and components
4. Update type definitions when schema changes
5. Test real-time features with multiple browser tabs