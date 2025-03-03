#!/usr/bin/env node

/**
 * Script to add a new version to the version history
 * Usage: node scripts/add-version.js [major|minor|patch] "Description" "Change 1" "Change 2" ...
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Get the version file path
const versionFilePath = path.join(__dirname, '../src/lib/version.ts');

// Read the current version file
const versionFileContent = fs.readFileSync(versionFilePath, 'utf8');

// Extract the current version
const versionMatch = versionFileContent.match(/version: "([0-9]+\.[0-9]+\.[0-9]+)"/);
if (!versionMatch) {
  console.error('Could not find current version in version.ts');
  process.exit(1);
}

const currentVersion = versionMatch[1];
console.log(`Current version: ${currentVersion}`);

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
Usage: node scripts/add-version.js [major|minor|patch] "Description" "Change 1" "Change 2" ...

Examples:
  node scripts/add-version.js minor "UI Improvements" "Fixed loading state" "Added version history"
  node scripts/add-version.js patch "Bug fixes" "Fixed user role comparison"
  `);
  process.exit(1);
}

const versionType = args[0];
const description = args[1];
const changes = args.slice(2);

if (!['major', 'minor', 'patch'].includes(versionType)) {
  console.error('Version type must be one of: major, minor, patch');
  process.exit(1);
}

// Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;

switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`New version: ${newVersion}`);
console.log(`Description: ${description}`);
console.log('Changes:');
changes.forEach(change => console.log(`- ${change}`));

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for confirmation
rl.question('\nDo you want to add this version? (y/n) ', (answer) => {
  if (answer.toLowerCase() !== 'y') {
    console.log('Operation cancelled');
    rl.close();
    process.exit(0);
  }

  // Create new version entry
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `  {
    version: "${newVersion}",
    date: "${today}",
    description: "${description}",
    changes: [
${changes.map(change => `      "${change}"`).join(',\n')}
    ]
  }`;

  // Find the VERSION_HISTORY array in the file
  const historyMatch = versionFileContent.match(/export const VERSION_HISTORY: VersionEntry\[\] = \[([\s\S]*?)\];/);
  if (!historyMatch) {
    console.error('Could not find VERSION_HISTORY array in version.ts');
    rl.close();
    process.exit(1);
  }

  // Add the new entry to the array
  const currentHistory = historyMatch[1];
  const newHistory = `${currentHistory},\n${newEntry}`;
  
  // Replace the history in the file
  const newFileContent = versionFileContent.replace(
    /export const VERSION_HISTORY: VersionEntry\[\] = \[([\s\S]*?)\];/,
    `export const VERSION_HISTORY: VersionEntry[] = [${newHistory}\];`
  );

  // Write the updated file
  fs.writeFileSync(versionFilePath, newFileContent);
  
  console.log(`\nVersion ${newVersion} added successfully!`);
  rl.close();
}); 