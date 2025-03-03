# Version Management System

This document explains how to use the version management system in the K-Flow application.

## Overview

The K-Flow application uses semantic versioning (MAJOR.MINOR.PATCH) to track changes:

- **MAJOR**: Incompatible API changes or significant UI overhauls
- **MINOR**: New features in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

## Viewing Version History

Users can view the version history by clicking on the version number in the top bar of the application. This will open a modal showing all versions with their descriptions and changes.

## Adding a New Version

When you make changes to the application, you should update the version history. There are several ways to do this:

### Using npm scripts

The easiest way is to use the npm scripts:

```bash
# For a major version update (e.g., 1.2.0 -> 2.0.0)
npm run version:major "Description" "Change 1" "Change 2"

# For a minor version update (e.g., 1.2.0 -> 1.3.0)
npm run version:minor "Description" "Change 1" "Change 2"

# For a patch version update (e.g., 1.2.0 -> 1.2.1)
npm run version:patch "Description" "Change 1" "Change 2"
```

### Using the script directly

You can also run the script directly:

```bash
node scripts/add-version.js [major|minor|patch] "Description" "Change 1" "Change 2" ...
```

### Manual update

If you prefer, you can manually update the `src/lib/version.ts` file:

1. Add a new entry to the `VERSION_HISTORY` array
2. Update the version number, date, description, and changes
3. The current version is automatically set to the last entry in the array

## Best Practices

- Keep descriptions concise but informative
- List specific changes rather than vague statements
- Update the version before deploying to production
- Follow semantic versioning principles
- Group related changes into a single version update

## Example

```bash
npm run version:minor "User Interface Improvements" "Added dark mode support" "Improved responsive layout" "Fixed navigation issues on mobile"
```

This will create a new minor version with the specified description and changes. 