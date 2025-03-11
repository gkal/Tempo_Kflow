# Development Workflow

This document explains how to work on this application without affecting the production environment.

## Environment Setup

We use different environment configurations for different stages of development:

- **Development**: Used for local development
- **Staging**: Used for testing changes before deploying to production
- **Production**: Used for the live application

Each environment has its own configuration file:

- `.env.development`: Development environment variables
- `.env.staging`: Staging environment variables
- `.env.production`: Production environment variables

## Feature Flags

We use feature flags to control when new features are enabled. This allows us to deploy code with new features disabled until they're ready.

Feature flags are defined in `src/lib/featureFlags.ts` and can be enabled/disabled in the environment configuration files.

Current feature flags:

- `VITE_ENABLE_NEW_TASK_CREATION`: Controls the new task creation logic
- `VITE_ENABLE_UPDATED_COLUMN_NAMES`: Controls the use of updated column names in the database
- `VITE_ENABLE_DEBUG_LOGGING`: Controls debug logging

## Development Scripts

### Running the Application

- `npm run dev`: Run the application in development mode
- `npm run dev:flags`: Run the application in development mode with all feature flags enabled

### Building the Application

- `npm run build`: Build the application for production (with type checking)
- `npm run build:safe`: Build the application for production (without type checking)
- `npm run build:dev`: Build the application in development mode (without type checking)
- `npm run build:stage`: Build the application in staging mode (without type checking)
- `npm run build-no-errors`: Build the application without type checking

### Other Scripts

- `npm run lint`: Run ESLint to check for code quality issues
- `npm run preview`: Preview the built application
- `npm run update-schema`: Update the database schema safely

## Working with TypeScript Errors

If you encounter TypeScript errors that prevent building the application, you can use one of the following approaches:

1. **Fix the errors**: This is the best approach if possible
2. **Use `build:safe`**: Build without type checking
3. **Use `build:dev`**: Build in development mode without type checking

## Database Schema Updates

To update the database schema safely, use the `update-schema.js` script:

```bash
npm run update-schema
```

This script will:

1. Check if the tasks table exists and create it if needed
2. Check if the due_date and due_date_time columns exist and add them if needed
3. Copy data between columns if needed

## Deployment Workflow

1. Develop and test locally using `npm run dev` or `npm run dev:flags`
2. Build and test in staging using `npm run build:stage`
3. Deploy to production using `npm run build`

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors, you can:

1. Fix the errors in the code
2. Use `build:safe` to build without type checking
3. Update the TypeScript configuration in `tsconfig.json`

### Database Errors

If you encounter database errors, you can:

1. Check the database schema using the Supabase dashboard
2. Run the `update-schema.js` script to update the schema
3. Use feature flags to control which column names are used 