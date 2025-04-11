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

### 🔄 Error Handling & Notifications
- **DO NOT USE TOAST MESSAGES**
  - Avoid floating/transient notifications for errors
  - Display errors inline near the action buttons where possible
  - If space is limited, temporarily increase form height to display errors above buttons
  - Error messages should be clear and actionable
  - Keep error messages visible until explicitly dismissed or issue is resolved
  - Reason: Provides better visibility, clear association with the error source, and prevents missed notifications

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

- **Global Utility Components**
  - Use these standardized components for consistent UI/UX:
  
  1. **GlobalTooltip**
     - Purpose: Display tooltips on hover with configurable options
     - Features:
       - Customizable width, position, and delay
       - Text truncation with automatic tooltips
       - Overflow protection for long content
       - Consistent styling across application
     - Components:
       - `<GlobalTooltip />`: Core tooltip component
       - `<TruncateWithTooltip />`: Auto-truncates text and shows tooltip
     - Usage: Ideal for displaying additional info or full text of truncated elements
  
  2. **GlobalDropdown**
     - Purpose: Standardized dropdown for selectable options
     - Features:
       - Consistent styling and behavior
       - Custom rendering of options and values
       - Support for objects or string options
       - Optional edit button
     - Usage: For all dropdowns/select inputs throughout the application
  
  3. **DialogUtilities**
     - Purpose: Standardized dialogs for consistent user interaction
     - Components:
       - `<ModernDeleteConfirmation />`: For delete confirmations
       - `<DialogWrapper />`: Basic dialog wrapper
       - `<AccessibleDialog />`: Accessibility-focused dialog
     - Usage: Maintain consistent dialog behavior across the application

### 🔄 Project Structure
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

## 🔄 Recent Refactoring Work

### 🚨 Phone-Only Match Detection and Warning System
- **Date:** 2025-04-04
- **Components:**
  - duplicateDetectionService.ts in src/services/
  - CustomerForm.tsx in src/components/customers/

#### Changes Implemented:
1. **Dedicated Phone-Only Search Function:**
   - Created new `findDuplicatesByPhoneOnly` function to identify cases where different companies share the same phone number
   - Implemented distinct scoring system that flags matches as phone-only matches
   - Added a threshold filter (90% by default) to ensure only high-quality phone matches are shown

2. **Enhanced UI Warning System:**
   - Added a dedicated red-bordered warning section for phone-only matches
   - Implemented clear visual differentiation between regular matches and phone-only matches
   - Added warning icon and explanatory text to alert users to potential issues
   - Special styling indicates the high importance of reviewing these matches

3. **Use Cases Addressed:**
   - Multiple business entities sharing same phone number
   - Data entry errors with incorrect company names
   - Phone numbers that have been reassigned to new companies
   - Potential duplicate customer records

4. **Technical Implementation:**
   - Separate database query focused exclusively on phone matching
   - Independent threshold and scoring system from the main duplicate detection
   - Custom typing to ensure type safety and correct property access
   - Efficient filtering and sorting to prioritize strongest matches

#### Benefits:
- Provides dedicated visibility for an important edge case (same phone, different name)
- Creates clear separation between general similarity matches and phone-only matches
- Reduces potential for missed duplicates due to combined scoring algorithms
- Improves data quality by highlighting potential data entry errors
- Enhances user experience by separately flagging different types of potential issues

### 📱 Phone Number Normalization and Search Enhancement
- **Date:** 2025-04-03
- **Components:**
  - duplicateDetectionService.ts in src/services/
  - Database query functions in src/lib/supabaseClient.ts

#### Changes Implemented:
1. **Improved Phone Number Normalization:**
   - Implemented SQL function to extract and normalize the first 10 digits of phone numbers
   - Created consistent normalization approach to handle various phone formats (with dashes, dots, spaces, and special characters)
   - Added support for phone numbers with extensions and annotations
   - SQL implementation handles the normalization at the database level for faster searches

2. **SQL Function for Phone Normalization:**
   ```sql
   CREATE OR REPLACE FUNCTION normalize_phone(phone_text TEXT) 
   RETURNS TEXT AS $$
   BEGIN
     RETURN SUBSTRING(REGEXP_REPLACE(phone_text, '[^0-9]', '', 'g'), 1, 10);
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Enhanced Search Implementation:**
   - Modified queries to use the normalize_phone function:
   ```sql
   SELECT * FROM customers 
   WHERE normalize_phone(telephone) = normalize_phone(:search_telephone);
   ```
   - Integrated with existing fuzzy matching for better accuracy
   - Maintained backward compatibility with current search patterns

4. **Benefits:**
   - Handles unpredictable user input patterns (special characters, annotations, etc.)
   - Focuses on the core phone number (first 10 digits) while ignoring extensions and notes
   - Provides consistent matching regardless of phone number formatting
   - Accommodates real-world use cases where users add symbols for their own reference

#### Implementation Rationale:
- Phone numbers are stored in varying formats (dashes, dots, spaces, symbols)
- Users often add special characters or notes (e.g., * for "good customer")
- Normalizing to the first 10 digits provides the best balance between:
  - Capturing the essential identifying information 
  - Ignoring irrelevant formatting and annotations
  - Consistent matching across different input patterns

#### Next Steps:
- Monitor performance and accuracy of the phone number matching
- Consider adding a dedicated normalized_telephone column for further optimization
- Extend the approach to other numeric identifiers if needed

### 🔍 Customer Duplicate Detection Enhancement v1.5.4
- **Date:** 2025-04-02
- **Components:**
  - duplicateDetectionService.ts in src/services/
  - CustomerForm.tsx in src/components/customers/
  - CustomerDetailDialog.tsx in src/components/customers/

#### Changes Implemented:
1. **Improved Duplicate Detection Algorithm:**
   - Implemented fuzzball.js for fuzzy string matching with token_sort_ratio
   - Enhanced phone matching with prefix detection and normalized comparison
   - Added weighted scoring system with configurable weights (40% company name, 40% phone, 20% AFM)
   - Created special handling for exact AFM and phone matches
   - Added Greek character normalization to handle accented characters (τόνους)

2. **UI Enhancements:**
   - Integrated duplicate detection into the "Surprise" section of the customer form
   - Redesigned duplicate match display with color-coding based on match confidence
   - Added detailed customer information dialog when clicking on matches
   - Enhanced duplicate table to show email and address information
   - Fixed capitalization for Greek headers (removed τόνους in all-caps text)

3. **Data Presentation:**
   - Added counts for offers and contacts in customer detail view
   - Implemented status indicators with appropriate icons
   - Enhanced audit information display (created/modified/deleted by whom and when)
   - Added proper user-friendly display of dates and times

4. **Technical Improvements:**
   - Fixed database query issues to avoid foreign key errors
   - Implemented proper text normalization for Greek characters
   - Enhanced telephone number standardization to handle various formats
   - Created robust similarity calculation logic that properly combines scores

#### Benefits:
- Significantly improved duplicate detection accuracy
- More intuitive user experience when dealing with potential duplicates
- Better data visualization with detailed customer information
- Enhanced reliability by fixing database query and foreign key issues
- Improved text processing for Greek language support

### 🔒 Customer & Contact Management Components Finalization
- **Date:** 2024-03-29
- **Components:** 
  - CustomerForm.tsx in src/components/customers/
  - ContactDialog.tsx in src/components/contacts/

#### Components Marked as Complete:
1. **CustomerForm Component:**
   - Handles customer creation and updates
   - Implements proper user tracking (created_by/modified_by)
   - Form validation and error handling
   - Contact management integration
   - Real-time updates
   - Status: 🔒 FINALIZED & VERIFIED

2. **ContactDialog Component:**
   - Handles contact creation and updates
   - Position management
   - Phone number formatting
   - Form validation
   - Real-time updates
   - Status: 🔒 FINALIZED & VERIFIED

3. **Key Features Implemented:**
   - Soft delete functionality
   - User action tracking
   - Real-time data synchronization
   - Proper error handling
   - Accessibility compliance
   - Mobile responsiveness

4. **Architecture Principles Applied:**
   - Components follow single responsibility principle
   - Proper separation of concerns
   - Type safety throughout
   - Consistent error handling
   - Reusable utility functions

#### Guidelines for Future Development:
1. **DO NOT MODIFY** these components without explicit approval
2. Any new features should be implemented as separate components
3. Use these components as reference for implementing similar functionality
4. Follow the established patterns for:
   - Form validation
   - Error handling
   - User tracking
   - Real-time updates

### 🏗️ OffersDialog Component Refactoring
- **Date:** 2023-09-29
- **Component:** OffersDialog.tsx in src/components/offers/main_offers_form/
- **Issue:** The component was excessively large (1621 lines) making it difficult to maintain and extend.

#### Changes Implemented:
1. **Breaking Into Smaller Components:**
   - Created `OfferDialogContext.tsx` for context and type definitions
   - Created `FormUtils.tsx` for utility functions like date formatting and form validation
   - Created `OffersService.tsx` for database operations (CRUD functions)
   - Created `HeaderSection.tsx` for the customer info section
   - Created `FormFooter.tsx` for the footer with save/cancel buttons
   - Leveraged existing `BasicTab.tsx` and `DetailsTab.tsx`

2. **Benefits:**
   - Reduced main component size from 1621 lines to approximately 500 lines
   - Improved modularity and separation of concerns
   - Enhanced readability and maintainability 
   - Easier to extend with new features
   - Components are more testable in isolation

3. **Architecture Principles Applied:**
   - Each component has a single responsibility
   - Services are separated from UI components
   - Type definitions are centralized
   - Utility functions are reusable across components

#### Next Steps:
- Apply similar refactoring to other large components
- Consider further extracting database operations into the central supabaseService
- Add unit tests for the new smaller components
- Document component API for future reference
