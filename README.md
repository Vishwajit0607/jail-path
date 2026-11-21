# jail-path

Confines and validates untrusted user-provided paths within an designated root directory.

## Installation

```bash
npm install jail-path
```

## Usage

```javascript
import { jailPath, PathTraversalError } from 'jail-path';

const uploadRoot = '/var/app/uploads/tenant_402';

try {
  // Resolves to: /var/app/uploads/tenant_402/invoices/2026-Q1.pdf
  const filePath = jailPath(uploadRoot, req.body.targetFile);
  await handleFile(filePath);
} catch (err) {
  if (err instanceof PathTraversalError) {
    res.status(400).send({ error: 'Path traversal detected' });
    return;
  }
  throw err;
}
```

### API

#### `jailPath(rootDir, userInput, options?)`

Resolves `userInput` against `rootDir`. Throws `PathTraversalError` if the resulting path resolves outside `rootDir`. Throws `InvalidPathError` if null bytes or forbidden Windows device names are encountered.

Options:
- `allowRootAccess` (boolean, default: `false`): Permit returning the exact `rootDir`.
- `windowsDeviceCheck` (boolean, default: `true`): Reject DOS reserved device names (`CON`, `PRN`, etc.).

#### `safeRelative(rootDir, userInput, options?)`

Returns a normalized relative path from `rootDir` to `userInput`, or `null` if the input traverses outside or is invalid.

## License

MIT
