# Contact Positions Dropdown Fix
Start Time: 20:07:52
End Time: 20:12:05

## User Request
Fix the GlobalDropdown in the ContactDialog to correctly display the full list of available contact positions from the database.

## Changes Made

### 1. Fixed Position Data Structure
- Updated `fetchPositions` in `ContactDialog.tsx` to map positions correctly with both id and name
- Changed positions state type to `Array<{ id: string; name: string }>`

### 2. Updated GlobalDropdown Component
- Modified `GlobalDropdownProps` interface to handle both string and object options
- Updated option rendering functions to handle object options correctly
- Added `findSelectedOption` function to improve value matching

### 3. Improved Position Handling in ContactDialog
- Updated `getPositionOptions` to return position objects with id and name
- Modified `handlePositionChange` to store position name in formData
- Fixed position selection and editing functionality

### Files Modified
1. `src/components/contacts/ContactDialog.tsx`
   - Updated position state and handling
   - Fixed position mapping and selection
   - Improved position dialog integration

2. `src/components/ui/GlobalDropdown.tsx`
   - Enhanced component to handle object options
   - Improved value matching and rendering
   - Added better type support

## Testing Notes
The changes should now allow the dropdown to:
- Display all available positions from the database
- Handle position selection correctly
- Support position editing
- Maintain proper state management

## Next Steps
1. Verify that all positions are now visible in the dropdown
2. Test position selection and editing functionality
3. Ensure proper integration with the position dialog
4. Monitor for any edge cases or unexpected behavior
