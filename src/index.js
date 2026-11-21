/**
 * Resolves untrusted user-provided paths and verifies they remain inside
 * an explicit boundary directory.
 */

import path from 'node:path';

export class PathTraversalError extends Error {
  /**
   * @param {string} userPath
   * @param {string} rootDir
   */
  constructor(userPath, rootDir) {
    super(`Path escapes allowed root directory: "${userPath}"`);
    this.name = 'PathTraversalError';
    this.code = 'ERR_PATH_TRAVERSAL';
    this.userPath = userPath;
    this.rootDir = rootDir;
  }
}

export class InvalidPathError extends Error {
  /**
   * @param {string} userPath
   * @param {string} reason
   */
  constructor(userPath, reason) {
    super(`Invalid path "${userPath}": ${reason}`);
    this.name = 'InvalidPathError';
    this.code = 'ERR_INVALID_PATH';
    this.userPath = userPath;
  }
}

const NULL_BYTE_REGEX = /\0/;
const WINDOWS_DRIVE_REGEX = /^[a-zA-Z]:/;
const WINDOWS_DEVICE_STREAM_REGEX = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

/**
 * Validates and confines an untrusted relative or absolute path within a safe base directory.
 *
 * @param {string} rootDir - Trusted root directory boundary (e.g. "/var/data/uploads")
 * @param {string} userInput - Untrusted target path (e.g. "tenant_42/invoices/march.pdf")
 * @param {object} [options]
 * @param {boolean} [options.allowRootAccess=false] - Whether resolving directly to rootDir is permitted
 * @param {boolean} [options.windowsDeviceCheck=true] - Guard against DOS device names on Windows
 * @returns {string} Fully resolved, normalized absolute path guaranteed to reside within rootDir
 */
export function jailPath(rootDir, userInput, options = {}) {
  if (typeof rootDir !== 'string' || rootDir.length === 0) {
    throw new TypeError('Root directory must be a non-empty string');
  }

  if (typeof userInput !== 'string' || userInput.length === 0) {
    throw new InvalidPathError(String(userInput), 'Path cannot be empty');
  }

  if (NULL_BYTE_REGEX.test(userInput) || NULL_BYTE_REGEX.test(rootDir)) {
    throw new InvalidPathError(userInput, 'Null bytes are forbidden');
  }

  const { allowRootAccess = false, windowsDeviceCheck = true } = options;

  const resolvedRoot = path.resolve(rootDir);

  // Normalize slashes and strip leading separators so absolute user inputs resolve relative to root
  let sanitizedInput = userInput.replace(/\\/g, '/');

  // Strip Windows drive letters if someone provides C:/path/to/file on POSIX or Windows
  if (WINDOWS_DRIVE_REGEX.test(sanitizedInput)) {
    sanitizedInput = sanitizedInput.replace(WINDOWS_DRIVE_REGEX, '');
  }

  // Remove leading slashes to prevent path.resolve from treating it as root filesystem root
  while (sanitizedInput.startsWith('/')) {
    sanitizedInput = sanitizedInput.slice(1);
  }

  const candidate = path.resolve(resolvedRoot, sanitizedInput);

  // Guard against root directory boundary prefix mismatches:
  // e.g. root = "/var/data/app", candidate = "/var/data/app_backup/file.txt"
  const isExactRoot = candidate === resolvedRoot;
  const isInside = candidate.startsWith(resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep);

  if (!isInside && !isExactRoot) {
    throw new PathTraversalError(userInput, resolvedRoot);
  }

  if (isExactRoot && !allowRootAccess) {
    throw new PathTraversalError(userInput, resolvedRoot);
  }

  if (windowsDeviceCheck) {
    const segments = sanitizedInput.split('/');
    for (const segment of segments) {
      if (WINDOWS_DEVICE_STREAM_REGEX.test(segment) || segment.includes(':')) {
        throw new InvalidPathError(userInput, `Windows reserved device or stream name "${segment}" is not permitted`);
      }
    }
  }

  return candidate;
}

/**
 * Returns a relative path from rootDir to userInput, or null if it escapes rootDir.
 *
 * @param {string} rootDir
 * @param {string} userInput
 * @param {object} [options]
 * @returns {string | null}
 */
export function safeRelative(rootDir, userInput, options = {}) {
  try {
    const resolved = jailPath(rootDir, userInput, options);
    const resolvedRoot = path.resolve(rootDir);
    return path.relative(resolvedRoot, resolved);
  } catch (err) {
    if (err instanceof PathTraversalError || err instanceof InvalidPathError) {
      return null;
    }
    throw err;
  }
}
