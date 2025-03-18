# Soft Delete Implementation for Offers

This migration adds soft delete functionality to the offers and offer_details tables.

## What's Included

1. Addition of `deleted_at` timestamp column to the `offers` and `offer_details` tables
2. Creation of several utility functions:
   - `soft_delete_record` - Marks a record as deleted by setting the deleted_at timestamp
   - `restore_deleted_record` - Restores a deleted record by clearing the deleted_at timestamp
   - `list_deleted_records` - Lists all soft-deleted records for a specific table
   - `cleanup_soft_deleted_records` - Permanently deletes records that have been soft-deleted for more than 30 days
   - `cleanup_all_soft_deleted_records` - Runs cleanup on all tables that support soft delete

3. Synchronization between offers and offer_details:
   - When an offer is soft-deleted, all its details are automatically soft-deleted
   - When an offer is restored, all its details are automatically restored

## How to Apply This Migration

Run the SQL script in the Supabase SQL Editor:

```sql
-- Run the migration script
\i supabase/migrations/soft_delete/add_soft_delete_to_offers.sql
```

## How to Use in Your Application

### Filtering Out Soft-Deleted Records

Update all your existing queries to filter out soft-deleted records by adding a WHERE clause:

```typescript
// Before
const { data, error } = await supabase
  .from("offers")
  .select("*");

// After
const { data, error } = await supabase
  .from("offers")
  .select("*")
  .is("deleted_at", null);  // Only get non-deleted records
```

### Deleting Records (Soft Delete)

Instead of using the delete() method, use the soft_delete_record RPC function:

```typescript
// Before
const { error } = await supabase
  .from("offers")
  .delete()
  .eq("id", offerId);

// After
const { error } = await supabase
  .rpc("soft_delete_record", {
    table_name: "offers",
    record_id: offerId
  });
```

### Restoring Deleted Records

To restore a soft-deleted record:

```typescript
const { data, error } = await supabase
  .rpc("restore_deleted_record", {
    table_name: "offers",
    record_id: offerId
  });
```

### Listing Deleted Records

To get a list of all soft-deleted records:

```typescript
const { data, error } = await supabase
  .rpc("list_deleted_records", {
    table_name: "offers"
  });
```

### Permanently Deleting Old Records

This happens automatically via a scheduled job, but you can trigger it manually:

```typescript
// Clean up a specific table
const { data, error } = await supabase
  .rpc("cleanup_soft_deleted_records", {
    table_name: "offers"
  });

// Clean up all tables
const { data, error } = await supabase
  .rpc("cleanup_all_soft_deleted_records");
```

## Update All Queries in Your Application

You'll need to update all queries in your application to filter out soft-deleted records by adding `.is("deleted_at", null)` to the query chain. 

Key files to update:
- `src/components/offers/improved/CustomerOffersPage.tsx`
- `src/components/offers/OffersPage.tsx`
- `src/components/offers/improved/ImprovedOffersPage.tsx`
- `src/services/offerDetailsService.ts`
- Any other files that query the offers or offer_details tables 