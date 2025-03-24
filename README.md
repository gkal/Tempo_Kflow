# K-Flow Application

K-Flow is a comprehensive business management application for managing customers, contacts, offers, and tasks. Built with modern web technologies, it provides an intuitive interface for streamlining business workflows.

## Project Structure

```
src/
├── components/        # UI components
│   ├── customers/     # Customer management components
│   ├── contacts/      # Contact management components
│   ├── offers/        # Offer management components
│   └── ui/            # Reusable UI components
├── lib/               # Utility libraries
│   └── hooks/         # Custom React hooks
├── pages/             # Application pages
├── services/          # Service layer
│   └── api/           # API services for data access
├── utils/             # Utility functions
└── CLEANUP.md         # Documentation of codebase improvements
```

## Key Features

- **Customer Management**: Track and manage customer information
- **Contact Management**: Maintain contact details and positions
- **Offer Management**: Create and track business offers
- **Task Tracking**: Manage tasks associated with customers and offers
- **Responsive UI**: Modern interface that works on desktop and mobile devices
- **Accessibility**: ARIA-compliant components for inclusive user experience

## Documentation

Comprehensive documentation is available in the project:

- **[Services Documentation](src/services/README.md)**: Details on the API service layer
- **[UI Components](src/components/ui/README.md)**: Documentation for reusable UI components
- **[Utilities](src/utils/README.md)**: Global utility functions documentation
- **[Utilities Guide](src/utils/UTILS-GUIDE.md)**: Comprehensive guide to using utility functions with examples
- **[Form Components](src/components/ui/README-FORMS.md)**: Documentation for form components
- **[Tooltips](src/components/ui/README-TOOLTIP.md)**: Documentation for the consolidated tooltip system
- **[Tabs Components](src/components/ui/README-TABS.md)**: Documentation for the standardized tabs system
- **[Data Table](src/components/ui/data-table-base.md)**: Documentation for data table component
- **[Codebase Cleanup](CODEBASE-CLEANUP.md)**: Comprehensive documentation of cleanup efforts, improvements, and future recommendations

## Technical Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL database with RESTful API)
- **State Management**: React Context API
- **Forms**: React Hook Form
- **Data Fetching**: Custom hooks with SWR patterns

## Development

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Supabase account (for backend services)

### Setup

1. Clone the repository
   ```
   git clone https://github.com/your-org/k-flow.git
   cd k-flow
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env.local` file with the following variables:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server
   ```
   npm run dev
   ```

### Build for Production

```
npm run build
```

### Code Organization

- Use the appropriate directory for new components based on their function
- Follow the established patterns for API access using the service layer
- Utilize global utility functions instead of creating duplicates
- Leverage the UI component library for consistent user experience

## Contributing

1. Create feature branches from `main`
2. Follow the coding standards and patterns established in the codebase
3. Write descriptive commit messages
4. Submit pull requests with appropriate descriptions

## Best Practices

- Use the service layer for all database operations
- Follow component patterns established in the codebase
- Leverage global utility functions for common operations
- Ensure all UI components are accessible
- Use TypeScript interfaces for type safety
- Prefer importing utilities from the centralized `@/utils` module
- Follow the validation patterns in the `validationModule` for consistent form validation
- Use the style utilities from `styleUtils.ts` for consistent component styling

## Authentication System

The authentication system has been significantly improved with enhanced type safety, better error handling, and additional features to support role-based access control.

### Key Components

#### AuthContext

The `AuthContext` provides authentication state and functions throughout the application:

```typescript
interface AuthContextType {
  user: User | null;          // Current authenticated user or null
  loading: boolean;           // Whether auth check is in progress
  error: string | null;       // Any authentication errors
  isAdmin: boolean;           // Whether current user is an admin
  isSuperUser: boolean;       // Whether current user is a super user
  checkAuth: () => Promise<void>;  // Checks authentication status
  logout: () => Promise<void>;     // Logs out the current user
  refreshUser: () => Promise<void>; // Refreshes user data
}
```

Usage:

```tsx
import { useAuth } from "@/lib/AuthContext";

function MyComponent() {
  const { user, isAdmin, loading, logout } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) return <div>Not authenticated</div>;
  
  return (
    <div>
      <p>Welcome, {user.fullname}</p>
      {isAdmin && <button>Admin Action</button>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### Protected Routes

The `ProtectedRoute` component guards routes that require authentication:

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route 
    path="/dashboard" 
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    } 
  />
  <Route 
    path="/admin/settings" 
    element={
      <ProtectedRoute requireAdmin={true}>
        <AdminSettings />
      </ProtectedRoute>
    } 
  />
</Routes>
```

Options:
- `requireAdmin`: Restrict access to admin users only
- `requireSuperUser`: Restrict access to super users and admins

#### Authentication API

The authentication API in `auth.ts` provides functions for working with authentication:

- `loginUser(username, password, rememberMe)`: Authenticates a user
- `logoutUser()`: Signs out the current user
- `createFirstAdmin(userData)`: Creates the first admin user
- `checkIfFirstUser()`: Checks if any users exist in the system
- `getRememberedUser()`: Gets saved credentials if "remember me" was used
- `isLoggedIn()`: Checks if a user is currently authenticated
- `getCurrentUserToken()`: Gets a token for the current user

### Security Improvements

1. **Role-based access control**: Role checks (`isAdmin`, `isSuperUser`) for components and actions
2. **Error handling**: Improved error handling with specific error types and messages
3. **Storage security**: Enhanced session storage access with fallbacks for failures
4. **Type safety**: Comprehensive TypeScript types for authentication data

### User Experience Improvements

1. **Loading states**: Better loading indicators during authentication checks
2. **Error messages**: Descriptive error messages for authentication issues
3. **Redirects**: Preserving intended destinations with location state during redirects
4. **Accessibility**: Added proper ARIA attributes to authentication components

## Usage Examples

### Login Form

```tsx
const { checkAuth } = useAuth();

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await loginUser(username, password, rememberMe);
    await checkAuth();
    navigate("/dashboard");
  } catch (error) {
    // Handle error
  }
};
```

### Checking Permissions

```tsx
const { isAdmin, isSuperUser } = useAuth();

return (
  <div>
    {(isAdmin || isSuperUser) && (
      <button>Create User</button>
    )}
    
    {isAdmin && (
      <button>System Settings</button>
    )}
  </div>
);
```

### Refreshing User Data

```tsx
const { refreshUser } = useAuth();

const handleUpdateProfile = async () => {
  await updateUserInDatabase(userData);
  // Refresh the user data in context
  await refreshUser();
};
```

## Database Schema

The authentication system is designed to work with the following database schema:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  fullname TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id UUID REFERENCES departments(id),
  role user_role NOT NULL DEFAULT 'User',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
);

CREATE TYPE user_role AS ENUM ('Admin', 'Super User', 'User', 'Μόνο ανάγνωση');
```

## Future Improvements

- Implement password hashing 
- Add multi-factor authentication
- Create more granular permissions system
- Implement password reset functionality
- Add session timeout handling

## Recent Improvements

The codebase has undergone significant improvements to enhance maintainability, reduce technical debt, and improve developer experience:

### 1. Cleanup and Optimization

- **Removed Unused Files**: Eliminated unused Storybook files, reducing codebase size by ~65KB
- **Component Consolidation**: Merged duplicate components and removed deprecated implementations
- **File Organization**: Improved directory structure and naming conventions

### 2. Global Utility Functions

A comprehensive set of global utility functions has been implemented for consistent patterns across the application:

- **Logging Utilities**: Type-safe, environment-aware logging with support for log levels
- **API Utilities**: Standardized API request/response handling with error formatting
- **Event Utilities**: Type-safe custom event system for cross-component communication
- **Format Utilities**: Consistent date, currency, and text formatting
- **String Utilities**: Common string manipulation functions
- **Form Validation**: Comprehensive validation with internationalization support

### 3. Service Layer

The API service layer provides a consistent interface for all database operations:

- **Type-safe Database Access**: Strongly typed operations for all database tables
- **Error Handling**: Consistent error handling and reporting
- **Reusable Patterns**: Common CRUD operations for all entity types

### 4. Documentation

- **Component Documentation**: Detailed documentation for UI components and usage patterns
- **Service Documentation**: API service layer documentation with examples
- **Utility Documentation**: Documentation for all global utility functions

## Using Global Utilities

The utilities can be imported from a single entry point:

```typescript
// Import specific utilities
import { formatDate, truncateText, logError, cn, validateEmail } from '@/utils';

// Import using namespaces
import utils from '@/utils';

// Examples
const formattedDate = utils.format.formatDate(new Date());
const trimmedText = utils.string.truncateText(longText, 100);
utils.log.error('Something went wrong', error);

// Track events
utils.event.dispatchEvent(utils.event.AppEventType.CUSTOMER_UPDATED, {
  entityId: customerId,
  data: updatedCustomer,
  timestamp: Date.now()
});

// Combine Tailwind classes with intelligent conflict resolution
const className = utils.style.cn('text-red-500', isActive && 'text-blue-600');

// Format and style statuses consistently
const statusText = utils.style.formatStatus('wait_for_our_answer');
const statusClass = utils.style.getStatusClass('wait_for_our_answer');
```

## Utilities and Components

### Global Utilities

The application provides a set of utility functions to help with common tasks:

```typescript
// Import specific utilities
import { formatDate, truncateText, logError, cn, validateEmail } from '@/utils';

// Or import the namespace for grouped utilities
import { utils } from '@/utils';

// Format dates consistently
const formattedDate = formatDate('2023-01-15', 'dd/MM/yyyy');

// Truncate long text
const shortText = truncateText('This is a very long text that needs truncation', 20);

// Log errors properly
logError('Failed to load data', error);

// Combine Tailwind classes with conflict resolution
const className = cn('text-red-500', isActive && 'text-blue-600');

// Validate user input
const isValid = validateEmail('user@example.com').isValid;
```

### Style Utilities

The application provides comprehensive style utilities to ensure consistent styling across components:

```typescript
import { cn, styles } from '@/utils';

// Combining Tailwind classes with conflict resolution
<div className={cn('p-4', isActive && 'bg-blue-500')}>

// Format status values consistently
<span className={cn('px-2 py-1 rounded', styles.getStatusClass(status))}>
  {styles.formatStatus(status)}
</span>
```

For more details, see the [Style Utilities Guide](src/utils/STYLE-GUIDE.md).
