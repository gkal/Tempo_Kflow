# Project Tasks

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
