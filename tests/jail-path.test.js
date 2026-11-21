import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { jailPath, safeRelative, PathTraversalError, InvalidPathError } from '../src/index.js';

test('resolves valid relative paths inside root directory', () => {
  const root = '/srv/storage/tenant_104';
  const resolved = jailPath(root, 'documents/invoices/inv_9821.pdf');
  assert.equal(resolved, path.resolve(root, 'documents/invoices/inv_9821.pdf'));
});

test('handles leading slashes as relative to root, not filesystem root', () => {
  const root = '/srv/storage/tenant_104';
  const resolved = jailPath(root, '/reports/summary_2026.csv');
  assert.equal(resolved, path.resolve(root, 'reports/summary_2026.csv'));
});

test('blocks directory traversal using dot-dot segments', () => {
  const root = '/srv/storage/tenant_104';
  assert.throws(
    () => jailPath(root, '../../etc/passwd'),
    (err) => err instanceof PathTraversalError && err.code === 'ERR_PATH_TRAVERSAL'
  );
});

test('prevents boundary prefix overlap vulnerability', () => {
  // If root is /app/data, /app/data_leak must not be considered valid
  const root = '/app/data';
  assert.throws(
    () => jailPath(root, '../data_leak/secrets.json'),
    PathTraversalError
  );
});

test('rejects null bytes', () => {
  const root = '/var/uploads';
  assert.throws(
    () => jailPath(root, 'avatar.png\0.exe'),
    (err) => err instanceof InvalidPathError && err.code === 'ERR_INVALID_PATH'
  );
});

test('handles root boundary access according to allowRootAccess option', () => {
  const root = '/var/shared';
  assert.throws(() => jailPath(root, '.', { allowRootAccess: false }), PathTraversalError);
  assert.equal(jailPath(root, '.', { allowRootAccess: true }), path.resolve(root));
});

test('safeRelative returns normalized relative string or null on escape', () => {
  const root = '/var/cache/app';
  assert.equal(safeRelative(root, 'chunks/chunk_01.bin'), path.normalize('chunks/chunk_01.bin'));
  assert.equal(safeRelative(root, '../../../etc/hosts'), null);
});
