-- Create RLS policies for service_subcategories table

-- Policy for SELECT: Allow all authenticated users to view subcategories
CREATE POLICY "Allow authenticated users to view subcategories"
ON public.service_subcategories
FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT: Allow authenticated users to insert subcategories
CREATE POLICY "Allow authenticated users to insert subcategories"
ON public.service_subcategories
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for UPDATE: Allow authenticated users to update subcategories
CREATE POLICY "Allow authenticated users to update subcategories"
ON public.service_subcategories
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for DELETE: Allow authenticated users to delete subcategories
CREATE POLICY "Allow authenticated users to delete subcategories"
ON public.service_subcategories
FOR DELETE
TO authenticated
USING (true); 