# 📱 Phone Number Normalization Guide

## Overview

This guide explains our approach to phone number normalization and searching, which focuses on extracting the first 10 digits of a phone number to provide consistent matching regardless of formatting or annotations.

## Background

Phone numbers in our database have varied formats due to:
- Different user input patterns (spaces, dashes, dots)
- Special characters added by users (*, +, etc. for their own reference)
- Extensions and annotations (int:201, εσ.123, etc.)
- Different international formats

This created challenges when searching for matches, as the same phone number could be stored as:
- `6985505043`
- `6985-50.50.43`
- `6985-50.50 int:201`
- `6985 50 50 43 *` (with * indicating a good customer)

## Solution: First 10 Digits Normalization

Our approach normalizes phone numbers by:
1. Removing all non-digit characters
2. Taking only the first 10 digits

This provides a balance between:
- Capturing the essential identifying information
- Ignoring irrelevant formatting and annotations
- Ensuring consistent matching across different input patterns

## Implementation

### Client-Side Implementation

In our TypeScript/JavaScript code, the normalization function is:

```typescript
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Extract only digits from the phone number, removing all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Take only the first 10 digits (typical phone number length without country code)
  // This ensures consistent matching regardless of extensions or special formatting
  return digitsOnly.substring(0, 10);
};
```

### Database-Side Implementation

For optimal performance, we also implement this as a PostgreSQL/Supabase function:

```sql
CREATE OR REPLACE FUNCTION normalize_phone(phone_text TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN SUBSTRING(REGEXP_REPLACE(phone_text, '[^0-9]', '', 'g'), 1, 10);
END;
$$ LANGUAGE plpgsql;
```

### Search Query Example

When searching for customers by phone number:

```typescript
// In application code
const normalizedPhoneSearch = normalizePhone(userInputPhone);

// Use in query
const results = await supabase
  .from('customers')
  .select('*')
  .filter('telephone', 'not.is', null)
  .or(
    `telephone.ilike.%${normalizedPhoneSearch}%,` +
    `telephone.ilike.%${normalizedPhoneSearch.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}%,` +
    `telephone.ilike.%${normalizedPhoneSearch.replace(/(\d{3})(\d{3})(\d{4})/, '$1.$2.$3')}%`
  );
```

Or with the SQL function (when available in the database):

```sql
SELECT * FROM customers 
WHERE normalize_phone(telephone) = normalize_phone(:search_telephone);
```

## Performance Optimization (Optional)

For large databases with frequent phone searches, consider:

1. Adding a computed column:

```sql
ALTER TABLE customers ADD COLUMN normalized_phone TEXT;
UPDATE customers SET normalized_phone = normalize_phone(telephone);
CREATE INDEX idx_customers_normalized_phone ON customers (normalized_phone);
```

2. Creating a trigger to keep it updated:

```sql
CREATE OR REPLACE FUNCTION update_normalized_phone()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_phone := normalize_phone(NEW.telephone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_normalized_phone
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_normalized_phone();
```

## Advantages

- **Simplicity**: The approach is easy to understand and implement
- **Robustness**: Handles a wide variety of phone formats and input patterns
- **Flexibility**: Works with or without database function support
- **Performance**: Can be optimized with database-side function and indexing

## Limitations

- Does not handle international format differences (different lengths)
- May not be suitable for applications where extensions are critical identifiers
- Requires database-level implementation for optimal performance

## Conclusion

This approach provides a practical solution to the challenge of phone number matching in our application, balancing simplicity, performance, and real-world usage patterns. It acknowledges that phone numbers in our system are often messy and have user-added annotations, while focusing on the core identifying digits. 