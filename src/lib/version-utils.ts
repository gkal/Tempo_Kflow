import { VERSION_HISTORY, VersionEntry } from './version';
import fs from 'fs';
import path from 'path';

/**
 * Adds a new version to the version history
 * @param version Version number (e.g., "1.2.0")
 * @param description Short description of the version
 * @param changes Array of changes in this version
 * @returns The updated version history
 */
export function addVersion(version: string, description: string, changes: string[]): VersionEntry[] {
  // This function is meant to be used in a Node.js environment
  // It will update the version.ts file with a new version entry
  
  const newEntry: VersionEntry = {
    version,
    date: new Date().toISOString().split('T')[0],
    description,
    changes
  };
  
  // In a real implementation, this would modify the version.ts file
  // For now, we'll just return the updated history
  return [...VERSION_HISTORY, newEntry];
}

/**
 * Increments the version number based on semantic versioning
 * @param currentVersion Current version string (e.g., "1.1.1")
 * @param type Type of version increment: 'major', 'minor', or 'patch'
 * @returns The new version string
 */
export function incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
}

/**
 * Compares two version strings
 * @param v1 First version
 * @param v2 Second version
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < v1Parts.length; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }
  
  return 0;
}

/**
 * Gets the latest version from the version history
 * @returns The latest version string
 */
export function getLatestVersion(): string {
  return VERSION_HISTORY[VERSION_HISTORY.length - 1].version;
} 