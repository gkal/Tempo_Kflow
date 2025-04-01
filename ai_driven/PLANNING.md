# Project Planning Document

## 🏗️ Architecture & Design Principles

### 🔒 Data Management
- **CRITICAL: ALWAYS USE SOFT DELETE**
  - Never use hard delete operations in the database
  - All tables must support soft delete with `is_deleted` and `deleted_at` columns
  - Use `softDeleteRecord` function from supabaseService for all deletions
  - Filter out soft-deleted records in queries unless explicitly needed
  - Reason: Preserves data history, allows recovery, maintains referential integrity, and enables audit trails

### 🌐 Central Database Operations
- **All database operations MUST use these central functions from supabaseService:**
  1. `createRecord<T>`: Create new records
  2. `updateRecord<T>`: Update existing records
  3. `softDeleteRecord<T>`: Soft delete records (NEVER use hard delete)
  4. `fetchRecords<T>`: Get records with filtering and pagination
  5. `fetchRecordById<T>`: Get single record by ID
  - These functions handle:
    - Type safety
    - Error handling
    - Audit trails
    - Consistent behavior
    - Proper database interactions
  - Direct Supabase client usage is prohibited

### 🎯 Project Goals
- Build a modern, efficient, and user-friendly offer management system
- Ensure data integrity and traceability
- Maintain clean, maintainable, and well-documented code
- Focus on performance and scalability

### 🎨 Style Guidelines
- Use Tailwind CSS for styling
- Follow modern React patterns and best practices
- Implement responsive design principles
- Ensure accessibility compliance

### 🔄 UI Components & Standards
- **Delete Confirmations**
  - Always use `ModernDeleteConfirmation` component
  - Never create custom delete dialogs
  - Component handles:
    - UUID formatting (shows "την επιλεγμένη εγγραφή" instead)
    - Consistent styling
    - Loading states
    - Success/Error feedback
    - Proper Greek translations
  - Access via:
    1. Direct component: `<ModernDeleteConfirmation />`
    2. Hook: `useDeleteConfirmation()`
    3. Wrapper: `<DeleteConfirmationDialog />`

### 📦 Project Structure
```
src/
├── components/        # React components
├── services/         # Business logic and API services
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
├── utils/           # Helper functions and utilities
└── lib/             # Third-party library configurations
```

### 🔧 Technical Stack
- Frontend: React + TypeScript
- Styling: Tailwind CSS + Radix UI + Shadcn
- State Management: React Context + Local State
- Database: Supabase
- Form Handling: react-hook-form
- Data Tables: @tanstack/react-table

### 🚫 Constraints
1. **Data Deletion**
   - NEVER use hard deletes
   - Always implement and use soft delete functionality
   - All delete operations must go through softDeleteRecord

2. **Code Organization**
   - Maximum file size: 500 lines
   - Modular component structure
   - Clear separation of concerns

3. **Dependencies**
   - Keep dependencies up to date
   - Minimize external dependencies
   - Document all third-party integrations

### 🔄 Development Workflow
1. Check TASK.md for current tasks
2. Follow code style guidelines
3. Write comprehensive tests
4. Document changes
5. Update README.md when needed

### 📝 Documentation Requirements
- Clear code comments
- Updated README.md
- Maintained TASK.md
- Inline documentation for complex logic
