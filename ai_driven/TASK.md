# Project Tasks

## 🚨 LOCAL DOCUMENT MANAGEMENT SYSTEM [TOP PRIORITY]
**Started**: 05-04-2025  
**Status**: In Progress  
**Owner**: Development Team

### Objective
Implement a local file system-based document management solution that allows users to associate documents with customers without storing files on the server.

### Tasks
1. [x] Database Updates
   - [x] Create new `system_settings` table
     - [x] Add schema with key-value pair structure
     - [x] Add initial record for document base path
   - [x] Create new `document_references` table
     - [x] Create schema with customer_id, file_path, file_name, file_type, description, created_at, created_by fields
     - [x] Add thumbnail storage field (base64 or thumbnail path)
     - [x] Implement proper indexing strategy
     - [x] Ensure soft delete compatibility (is_deleted, deleted_at columns)
   - [x] Create new `docu_characteristics` table
     - [x] Define schema for document type classifications
     - [x] Add support for ordering and descriptions
   - [x] Create new `docu_status` table
     - [x] Define schema for document status tracking
     - [x] Add color support for visual status representation
   - [x] Create new `offers_documents` table
     - [x] Define schema for linking documents to offers
     - [x] Add metadata fields for filesystem information
     - [x] Link to characteristics and status tables

2. [x] Backend Services
   - [x] Create documentService.ts in src/services/
     - [x] Implement file system operations (folder creation, listing)
     - [x] Add file metadata extraction functionality
     - [x] Implement thumbnail generation for common file types
     - [x] Add CRUD operations for document references
   - [x] Create documentSettingsService.ts in src/services/
     - [x] Implement CRUD operations for document characteristics
     - [x] Implement CRUD operations for document statuses
     - [x] Add path validation and management
   - [x] Create offerDocumentService.ts in src/services/
     - [x] Implement document upload and metadata extraction
     - [x] Add document classification functionality
     - [x] Implement document statistics and reporting

3. [x] UI Components
   - [x] Update General Settings UI
     - [x] Rename "Rithiseis Xriston" to "Genikes Rithiseis"
     - [x] Consolidated into Document Settings tab
     - [x] Add document base path configuration field with folder selection
   - [x] Create DocumentViewerComponent
     - [x] Implement grid/list view of documents with thumbnails
     - [x] Add file metadata display (name, type, size, date)
     - [x] Implement double-click to open with system default application
     - [x] Add right-click context menu for common operations
   - [x] Add "Documents" tab to customer details
     - [x] Implement file upload functionality that copies to local folder
     - [x] Show list of associated documents with previews
     - [x] Enable sorting and filtering of documents
   - [x] Create DocumentSettingsTab component
     - [x] Build interface for managing document types
     - [x] Build interface for managing document statuses
     - [x] Add path configuration options
     - [x] Integrate document base path settings (moved from General Settings)

4. [x] Integration
   - [x] Connect document viewer to customer details view
   - [x] Integrate base path setting with the general settings UI
   - [x] Implement error handling for file system operations
   - [x] Add validation for base path existence and permissions
   - [x] Integrate document types and statuses with document viewer

5. [ ] Testing
   - [ ] Test folder creation/management
   - [ ] Test file previews for various file types
   - [ ] Verify system program associations work correctly
   - [ ] Test performance with many files
   - [ ] Test document type and status management
   - [ ] Verify document statistics accuracy

### Implementation Details
- Local storage structure:
  - Base path from system settings (e.g., C:\Customers Data)
  - Subfolders by customer name (e.g., C:\Customers Data\Alpha Baby\)
  - Files stored in respective customer folders
- Preview system:
  - Generate thumbnails for common file types (PDF, DOCX, XLSX, images)
  - Store thumbnail data in the database (as small base64 images or paths)
  - Show grid/list of file previews with metadata
- Document classification:
  - User-defined document types stored in `docu_characteristics` table
  - Document status tracking via `docu_status` table
  - Visual indicators for document status (color coding)
- User experience:
  - Simple "upload" interface that copies files to the local structure
  - File preview grid with thumbnails and metadata
  - Double-click to open with system default application
  - Right-click context menu for common operations
  - Document management settings in the general settings area

### Technical Considerations
- No server-side storage requirements
- Leverages system's default applications for opening files
- Files remain accessible even when application is offline
- Thumbnail generation may require specific libraries for different file types
- Fixed issues with authentication and user ID in the document service
- Implemented soft delete throughout all document operations
- Used type-safe interfaces for all document operations
- Optimized database queries with proper indexing

## 🚨 URGENT Database Schema Updates
**Started**: 01-04-2025
**Status**: Pending
**Owner**: Database Team

1. [ ] Add `is_deleted` column to tables missing it:
   - [ ] offer_details (URGENT - blocking soft delete functionality)
   - [ ] Audit other tables for missing soft delete columns

## 🔍 Critical Audits

### Soft Delete Implementation Audit [HIGH PRIORITY]
**Started**: 01-04-2025
**Status**: In Progress
**Owner**: Team

#### Objective
Perform a comprehensive audit of all delete operations in the project to ensure we exclusively use soft delete.

#### Tasks
1. [ ] Audit all service files for delete operations
   - [ ] Review supabaseService.ts delete functions
   - [ ] Check all service files that import deleteRecord
   - [ ] Verify soft delete implementation in each service
   - [ ] Document any instances of hard delete usage

2. [ ] Review component delete operations
   - [ ] Search for direct deleteRecord calls
   - [ ] Check for any direct Supabase delete operations
   - [ ] Verify all components use service layer for deletions

3. [ ] Database schema verification
   - [ ] Confirm all tables have is_deleted and deleted_at columns
   - [ ] Verify indexes on these columns
   - [ ] Check existing triggers/policies related to deletion

4. [ ] Query analysis
   - [ ] Review all SELECT queries to ensure they filter out soft-deleted records
   - [ ] Check JOIN operations for proper handling of soft-deleted records
   - [ ] Verify any reporting queries handle soft deletes correctly

5. [ ] Documentation
   - [ ] Document any cases requiring hard delete with justification
   - [ ] Get team review and approval for any hard delete cases
   - [ ] Update technical documentation with soft delete requirements

#### Hard Delete Exceptions
If any hard delete operations are required, they must be:
1. Documented here with full justification
2. Reviewed by the team
3. Approved by both AI assistant and USER
4. Implemented with proper safeguards

Format for exception documentation:
```
### [Component/Service Name]
- **Location**: [File path]
- **Justification**: [Detailed explanation]
- **Risk Assessment**: [Potential impacts]
- **Mitigation**: [Safety measures]
- **Reviewed By**: [Team members]
- **Approved By**: [Approvers]
- **Date**: [Approval date]
```

#### Current Exceptions
*No approved exceptions yet*

### Follow-up Tasks
- [ ] Implement automated tests to verify soft delete usage
- [ ] Create database migration for any missing soft delete columns
- [ ] Update deployment scripts to handle soft delete changes
- [ ] Schedule team review of findings
- [ ] Create documentation for soft delete best practices
- [ ] Improve ModernDeleteConfirmation component UI:
  - Make it more visually appealing and professional
  - Add proper spacing and padding
  - Consider adding icons for better visual feedback
  - Ensure consistent styling with the app's theme
  - Make buttons more prominent and properly styled
  - Add smooth transitions and animations
  - Ensure proper mobile responsiveness
  - Reference: Use Shadcn/Radix UI best practices

## 🔍 Customer Data Quality

### Customer Duplicate Detection [MEDIUM PRIORITY]
**Started**: 14-06-2024
**Last Updated**: 02-04-2025
**Status**: Completed
**Owner**: Front-End Team

#### Objective
Implement a real-time duplicate detection system for customers to prevent creating multiple entries for the same entity with slightly different names or information.

#### Tasks
1. [x] Research approaches for duplicate detection (completed 14-06-2024)
2. [x] Select fuzzy matching algorithm (fuzzball.js with token_sort_ratio)
3. [x] Create duplicate detection component (DuplicateDetection.tsx)
4. [x] Create duplicate detection service (duplicateDetectionService.ts)
5. [x] Install fuzzball dependency (completed 02-04-2025)
6. [x] Replace mock implementation with actual fuzzy matching using fuzzball
7. [x] Integrate with CustomerForm for real-time feedback
8. [x] Optimize database queries for performance with large datasets
9. [x] Fine-tune matching thresholds based on testing:
   - [x] Test with known duplicate scenarios
   - [x] Adjust weights for name (30%), phone (20%), AFM (50%)
   - [x] Set appropriate similarity threshold (75%)
10. [x] Enhance early detection (completed 02-04-2025)
   - [x] Start searching after 3 characters in company name
   - [x] Implement color-coded matches (yellow for 75-80%, red for >80%)
   - [x] Auto-expand matches with high confidence
   - [x] Display detailed customer information in matches
11. [x] Enhanced duplicate detection (completed 02-04-2025)
   - [x] Include deleted/archived customers in search
   - [x] Add visual indicator for deleted customers
   - [x] Handle database schema differences for soft delete columns

#### Implementation Details
- Multi-field weighted scoring implemented:
  - Company name: 30% (using token_sort_ratio for word order invariance)
  - Phone number: 20% (standardized comparison)
  - AFM (tax ID): 50% (exact matching)
- Early detection features:
  - Starts searching after user types 3+ characters in company name
  - Color-coding for match confidence (yellow: 75-80%, red: >80%)
  - Expanded customer details including address, email, and tax info
  - Auto-expands for high-confidence matches
- User experience enhancements:
  - Progressive matching as user completes form fields
  - Non-intrusive UI showing potential matches
  - Debounced queries to prevent excessive API calls
  - One-click navigation to existing records
  - Match details show which fields contributed to the match
  - Visual indicator for deleted/archived customers
- Comprehensive search:
  - Searches both active and deleted customers
  - Handles different database schemas (deleted/is_deleted column variations)
  - Falls back to basic search if schema doesn't match expected structure

#### Known Issues
- TypeScript linter warning in duplicateDetectionService.ts (not affecting functionality)
- Database schema uses 'deleted' column instead of 'is_deleted' in the customers table (fixed in implementation)

#### Future Enhancements
- [ ] Add contact information to the matching algorithm
- [ ] Consider address fuzzy matching
- [ ] Generate monthly duplicate detection reports
- [ ] Create merge functionality for true duplicates

## LOCAL DOCUMENT MANAGEMENT SYSTEM

- [x] **Create SQL tables for document management**
  - [x] system_settings table for document_path
  - [x] docu_characteristics for document types with emoji
  - [x] docu_status for document statuses with emoji
  - [x] offer_documents for linking documents to offers with metadata

- [x] **Update Supabase type definitions**
  - [x] Add new table types to src/types/supabase.ts

- [x] **Update document settings service**
  - [x] Update interface definitions (DocuCharacteristic, DocuStatus)
  - [x] Update CRUD functions
  - [x] Rename getCustomerOffersPath to getDocumentPath

- [x] **Update DocumentSettingsTab component**
  - [x] Simplify UI to remove color and sort order
  - [x] Add emoji support for document types and statuses
  - [x] Update translations and error messages

- [x] **Create document upload service**
  - [x] Create offerDocumentService.ts
  - [x] Implement file upload, download, and management functions

- [x] **Integrate document management with offer details**
  - [x] Create DocumentsTab component for OffersDialog
  - [x] Add upload, view, edit, and delete functionality
  - [x] Add document type and status selection

## USER REQUESTS

- [x] **Remove toast notifications from settings** - Replaced with inline status messages.
- [x] **Fix settings dialog close behavior** - Now properly refreshes data on close.
- [x] **Add emoji support to document types and statuses** - Now uses emoji instead of colors and descriptions.
- [x] **Simplify document path handling** - No longer needs separate offer ID subdirectories.

## COMPLETED

- [x] Create SQL tables for document management
- [x] Update Supabase type definitions 
- [x] Update document settings service
- [x] Update DocumentSettingsTab component
- [x] Create document upload service
- [x] Integrate document management with offer details

## TODO

- [ ] Add file browser integration for selecting document paths
- [ ] Implement document search and filtering
- [ ] Add document preview functionality
- [ ] Create document report generation
- [ ] Add batch document operations (download multiple, etc.)

## Task 7: Analytics and Monitoring - Added on [Current Date]
- [ ] Task 7.1: Implement Form Analytics
  - [ ] Task 7.1.1: Create analytics dashboard
  - [ ] Task 7.1.2: Set up conversion tracking
  - [ ] Task 7.1.3: Implement form error tracking
  - [ ] Task 7.1.4: Create customer segment analytics
- [ ] Task 7.2: Implement Performance Monitoring
  - [x] 7.2.1. Implement frontend performance tracking service for page load times, component rendering, network requests, and user interactions
  - [x] 7.2.2. Create frontend performance dashboard for visualization
  - [x] 7.2.3. Integrate form submission timing with performance monitoring
  - [x] 7.2.4. Implement performance alerting system for frontend issues
- [ ] Task 7.3: Create Business Intelligence Reports
  - [ ] Task 7.3.1: Implement customer segmentation reports
  - [ ] Task 7.3.2: Set up offer effectiveness tracking
  - [ ] Task 7.3.3: Create ROI and business impact reports
  - [ ] Task 7.3.4: Set up automated reporting

## 📊 Performance Monitoring System
**Started**: 15-09-2024  
**Status**: In Progress  
**Owner**: Development Team

### Objective
Implement a comprehensive monitoring system for both backend API performance and frontend client-side performance to ensure optimal user experience and system reliability.

### 7.1. Backend API Performance Monitoring
- [x] 7.1.1. Create database tables for storing API performance metrics
- [x] 7.1.2. Implement API middleware for request/response timing collection
- [x] 7.1.3. Build performance tracking service for data aggregation and analysis
- [x] 7.1.4. Create dashboard for visualizing API performance statistics
- [x] 7.1.5. Implement alerting system for slow or failed API calls

### 7.2. Frontend Performance Monitoring
- [x] 7.2.1. Implement frontend performance tracking service for page load times, component rendering, network requests, and user interactions
- [x] 7.2.2. Create frontend performance dashboard for visualization
- [x] 7.2.3. Integrate form submission timing with performance monitoring
- [x] 7.2.4. Implement performance alerting system for frontend issues

### 7.3. Integration and Improvements
- [ ] 7.3.1. Combine API and frontend performance views in unified dashboard
- [ ] 7.3.2. Implement trend analysis for performance metrics
- [ ] 7.3.3. Add user segment analysis for performance by device/browser
- [ ] 7.3.4. Create automated performance optimization recommendations

### Implementation Details
- The API performance tracking system provides insights into API latency, throughput, and error rates to help identify bottlenecks.
- Frontend performance monitoring tracks critical rendering paths, component performance, API request times, and user interaction metrics.
- Form submission performance is specifically tracked to optimize the core functionality of the application.
- All performance data is stored in the Supabase database for analysis and visualization.
- Performance dashboards provide real-time and historical performance data to guide optimization efforts.
