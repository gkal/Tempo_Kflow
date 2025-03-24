import { VERSION_HISTORY, parseVersion } from './version';

/**
 * Compares two version strings
 * @param v1 First version
 * @param v2 Second version
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  try {
    const v1Parsed = parseVersion(v1);
    const v2Parsed = parseVersion(v2);
    
    if (v1Parsed.major !== v2Parsed.major) {
      return v1Parsed.major > v2Parsed.major ? 1 : -1;
    }
    
    if (v1Parsed.minor !== v2Parsed.minor) {
      return v1Parsed.minor > v2Parsed.minor ? 1 : -1;
    }
    
    if (v1Parsed.patch !== v2Parsed.patch) {
      return v1Parsed.patch > v2Parsed.patch ? 1 : -1;
    }
    
    return 0;
  } catch (error) {
    console.error('Error comparing versions:', error);
    return 0;
  }
}

/**
 * Gets the latest version from the version history
 * @returns The latest version string
 */
export function getLatestVersion(): string {
  return VERSION_HISTORY[0].version;
} 