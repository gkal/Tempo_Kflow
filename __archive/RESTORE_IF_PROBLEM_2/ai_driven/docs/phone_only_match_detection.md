# Phone-Only Match Detection System

## Overview
The Phone-Only Match Detection System is a specialized feature designed to identify and flag cases where different companies share the same phone number. This functionality supplements the main duplicate detection algorithm by providing a dedicated focus on phone number matches, regardless of other fields like company name or AFM.

## Problem Statement
In customer management systems, phone numbers often serve as unique identifiers. However, several scenarios can lead to multiple company names sharing the same phone number:

1. **Multiple Business Entities**: A single person or organization might operate multiple businesses with different names but use the same contact number.
2. **Data Entry Errors**: Customer information might be recorded with an incorrect company name while the phone number is correct.
3. **Phone Number Reassignment**: A phone number previously associated with one company might be reassigned to another.
4. **Potential Duplicates**: The same customer might be entered twice with slight variations in the company name.

These scenarios can be missed by traditional duplicate detection algorithms that use weighted scoring across multiple fields, as strong phone matches might be diluted by mismatched company names.

## Solution Architecture

### 1. Dedicated Phone-Only Search Function
The system implements a separate search function `findDuplicatesByPhoneOnly` in the duplicate detection service that:

```typescript
// Function signature
export const findDuplicatesByPhoneOnly = async (
  phoneNumber: string,
  threshold: number = 90
): Promise<Customer[]>
```

- Focuses exclusively on phone number matches
- Operates independently from the main duplicate detection algorithm
- Uses a higher default threshold (90%) to ensure high-quality matches
- Flags results with a special `isPhoneOnlyMatch` property

### 2. Phone Normalization
The function uses the same phone normalization approach as the main algorithm:

```typescript
// Normalization extracts the first 10 digits
const normalizedPhone = normalizePhone(phoneNumber);
```

- Extracts the first 10 digits from phone numbers
- Removes non-numeric characters
- Ensures consistent comparison regardless of formatting

### 3. Database Query
The function constructs a query that specifically targets phone number matches:

```typescript
// Multiple search patterns for comprehensive matching
const { data, error } = await supabase
  .from('customers')
  .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
  .is('deleted_at', null)
  .filter('telephone', 'not.is', null)
  .or(
    `telephone.ilike.%${normalizedPhone}%,` +
    `telephone.ilike.%${normalizedPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}%,` +
    `telephone.ilike.%${normalizedPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1.$2.$3')}%`
  );
```

- Uses ILIKE for case-insensitive matching
- Includes multiple format patterns (with dashes, dots, etc.)
- Filters out deleted records
- Excludes records with null phone numbers

### 4. Scoring System
Unlike the main duplicate detection algorithm that uses weighted scoring across multiple fields, the phone-only system uses a dedicated scoring approach:

```typescript
// Compare phones to get actual similarity
const phoneSimilarity = getPhoneSimilarity(
  phoneNumber, 
  customerRecord.telephone || ''
);
```

- Uses `getPhoneSimilarity` function for precise phone comparison
- Sets a high threshold (default 90%) to avoid false positives
- Sorts results by similarity score (highest first)

### 5. UI Integration
The system integrates with the UI through a dedicated warning section:

```tsx
{potentialPhoneOnlyMatches && potentialPhoneOnlyMatches.length > 0 && (
  <div className="w-full bg-[#3a5258] rounded-md border border-red-500 shadow-md overflow-hidden h-[140px] mt-2">
    <div className="bg-red-800 px-4 py-1 border-b border-red-500">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center">
        <AlertTriangle className="h-4 w-4 mr-2 text-yellow-300" />
        ΠΡΟΕΙΔΟΠΟΙΗΣΗ: ΒΡΕΘΗΚΕ ΙΔΙΟ ΤΗΛΕΦΩΝΟ ΣΕ ΑΛΛΟ ΠΕΛΑΤΗ!
      </h2>
    </div>
    {/* Table of matches */}
  </div>
)}
```

- Uses distinct visual styling (red border, warning icon)
- Displays only when phone-only matches are found
- Includes explanatory text for context
- Highlights the phone number column for clarity

## Implementation Flow

1. **User Input Trigger**:
   - When a user enters a phone number with 7+ digits, the system triggers a phone-only search
   - Debounced by 200ms to avoid excessive database queries during typing

2. **Search Process**:
   - The phone number is normalized to extract the first 10 digits
   - A database search is performed using multiple format patterns
   - Results are scored based on phone similarity
   - Matches below the threshold are filtered out

3. **UI Presentation**:
   - Phone-only matches are displayed in a separate warning section
   - The section includes an explanatory warning message
   - Matches are sortable and clickable for detailed view
   - Phone fields are highlighted to emphasize the matching element

## Advantages

1. **Enhanced Detection**: Identifies important matches that might be missed by general similarity algorithms
2. **Clear Separation**: Distinguishes between general matches and phone-only matches
3. **Visual Priority**: Uses distinct styling to emphasize the importance of reviewing these matches
4. **Targeted Focus**: Concentrates on a specific high-value use case (same phone, different company)
5. **Data Quality**: Helps identify potential data entry errors or legitimate business relationships

## Configuration Options

The phone-only match system offers several configuration options:

1. **Threshold**: Default 90%, can be adjusted to control match sensitivity
2. **Minimum Digits**: Requires at least 7 digits to trigger a search
3. **UI Display**: The warning section only appears when matches are found
4. **Sorting**: Results are sorted by similarity score (highest first)

## Future Enhancements

1. **Customer Relationship Tagging**: Add ability to mark related companies as legitimate relationships
2. **Enhanced Normalization**: Improve phone normalization for international numbers
3. **Confidence Indicators**: Add additional metadata about match quality
4. **Batch Processing**: Apply phone-only matching to identify potential duplicates across the entire database
5. **Merge Functionality**: Streamlined workflow for merging duplicate records identified through phone-only matching

## Conclusion

The Phone-Only Match Detection System provides an important additional layer of duplicate detection focused specifically on phone number matches. By operating independently from the general similarity algorithm, it ensures that potential issues aren't missed due to weighted scoring across multiple fields. The dedicated UI presentation ensures these potential matches receive appropriate attention from users managing customer data. 