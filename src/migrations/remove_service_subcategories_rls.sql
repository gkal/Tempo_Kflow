-- Disable RLS on service_subcategories table
ALTER TABLE public.service_subcategories DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated users to insert subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated users to update subcategories" ON public.service_subcategories;
DROP POLICY IF EXISTS "Allow authenticated users to delete subcategories" ON public.service_subcategories; 