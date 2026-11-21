export interface JailPathOptions {
  /**
   * Whether resolving directly to rootDir itself is permitted.
   * @default false
   */
  allowRootAccess?: boolean;

  /**
   * Block Windows DOS device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
   * and alternate data streams (':').
   * @default true
   */
  windowsDeviceCheck?: boolean;
}

export class PathTraversalError extends Error {
  code: 'ERR_PATH_TRAVERSAL';
  userPath: string;
  rootDir: string;
  constructor(userPath: string, rootDir: string);
}

export class InvalidPathError extends Error {
  code: 'ERR_INVALID_PATH';
  userPath: string;
  constructor(userPath: string, reason: string);
}

/**
 * Resolves an untrusted user path and guarantees it resides strictly inside rootDir.
 * Throws PathTraversalError or InvalidPathError if the boundary is violated.
 */
export function jailPath(rootDir: string, userInput: string, options?: JailPathOptions): string;

/**
 * Returns a safe normalized relative path inside rootDir, or null if the path escapes or is malformed.
 */
export function safeRelative(rootDir: string, userInput: string, options?: JailPathOptions): string | null;
