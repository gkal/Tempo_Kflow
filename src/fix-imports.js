/**
 * Script to fix all imports from supabase.ts to supabaseClient.ts
 * To run: node src/fix-imports.js
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files to update
const filesToProcess = [
  'src/components/admin/RecoveryPage.tsx',
  'src/components/dashboard/MetricCards.tsx',
  'src/components/admin/ServiceTypesPage.tsx',
  'src/components/settings/UserManagementDialog.tsx',
  'src/components/settings/SimpleUserDialog.tsx',
  'src/components/settings/SettingsPage.tsx',
  'src/components/offers/improved/CustomerOffersPage.tsx',
  'src/components/offers/OffersPage.tsx',
  'src/components/offers/improved/ImprovedOffersPage.tsx',
  'src/components/offers/OfferHistory.tsx',
  'src/components/admin/BackupPage.tsx',
  'src/components/customers/CustomerDialog.tsx',
  'src/components/customers/CustomersPage.tsx',
  'src/components/customers/CustomerForm.tsx',
  'src/components/customers/OffersDialog.tsx',
  'src/components/contacts/PositionDialog.tsx',
  'src/components/customers/OffersTable.tsx',
  'src/components/contacts/ContactDialog.tsx',
  'src/components/customers/CustomerDetailPage.tsx'
];

// Function to update imports in a file
function updateImports(filePath) {
  try {
    // Read the file content
    const content = readFileSync(filePath, 'utf8');
    
    // Check if the file contains a reference to supabase
    if (!content.includes('/lib/supabase')) {
      console.log(`No imports to update in ${filePath}`);
      return;
    }
    
    // Simple search and replace for imports
    let updatedContent = content;
    
    // Handle @/lib/supabase path
    updatedContent = updatedContent.replace(
      /from\s+(['"])@\/lib\/supabase\1/g,
      "from $1@/lib/supabaseClient$1"
    );
    
    // Handle ./lib/supabase path
    updatedContent = updatedContent.replace(
      /from\s+(['"])\.\/lib\/supabase\1/g,
      "from $1./lib/supabaseClient$1"
    );
    
    // Handle ../lib/supabase path
    updatedContent = updatedContent.replace(
      /from\s+(['"])\.\.\/lib\/supabase\1/g,
      "from $1../lib/supabaseClient$1"
    );
    
    // Handle ../../lib/supabase path
    updatedContent = updatedContent.replace(
      /from\s+(['"])\.\.\/\.\.\/lib\/supabase\1/g,
      "from $1../../lib/supabaseClient$1"
    );
    
    // Check if content was modified
    if (content === updatedContent) {
      console.log(`No changes made to ${filePath}`);
      
      // Debug: show lines with supabase references to help diagnose
      const lines = content.split('\n');
      const supabaseLines = lines.filter(line => line.includes('/lib/supabase'));
      
      if (supabaseLines.length > 0) {
        console.log('Found the following supabase imports:');
        supabaseLines.forEach(line => console.log(`- ${line.trim()}`));
      }
      
      return;
    }
    
    // Write the updated content back to the file
    writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Process all files
let filesFound = 0;
let filesProcessed = 0;

filesToProcess.forEach(filePath => {
  if (existsSync(filePath)) {
    filesFound++;
    updateImports(filePath);
    filesProcessed++;
  } else {
    console.warn(`⚠️ File not found: ${filePath}`);
  }
});

console.log(`\nSummary: Found ${filesFound} files, processed ${filesProcessed} files`);
console.log('Finished processing imports!'); 