

# Section 01: Project Setup

This section scaffolds the entire project: `package.json`, `tsconfig.json`, Vitest configuration, directory structure, and dependency installation. The result is a buildable, testable, empty TypeScript project that all subsequent sections build upon.

## Prerequisites

- Node.js >= 20 installed
- npm available
- Working directory: `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure`

## Tests First

There are no behavioral tests for this section -- it is pure scaffolding. Verify the setup works by creating a single trivial test file and confirming `npx vitest run` passes.

**File: `src/smoke.test.ts`**

```
# Test: Vitest runs successfully with a trivial passing test
```

The test should simply assert `true` equals `true`. Its only purpose is to confirm that TypeScript compilation, ESM module resolution, and Vitest are all wired correctly. This file can be deleted once section-02 adds real tests.

## Implementation Steps

### 1. Initialize the project

Run `npm init -y` in `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure`. Then modify the generated `package.json` to set:

- `"name": "code-review-agent"`
- `"version": "0.1.0"`
- `"type": "module"` (required for ESM)
- `"bin": { "code-review": "./dist/index.js" }`
- `"engines": { "node": ">=20" }`
- `"scripts"`:
  - `"build": "tsc"`
  - `"dev": "tsx src/index.ts"`
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`

### 2. Install dependencies

**Runtime dependencies:**

```
npm install commander @anthropic-ai/sdk @octokit/rest @octokit/plugin-throttling @octokit/plugin-retry zod chalk picomatch
```

**Dev dependencies:**

```
npm install -D typescript vitest @types/node tsx @types/picomatch
```

### 3. Create TypeScript configuration

**File: `tsconfig.json`**

Configure with:
- `"target": "ES2022"` (Node 20 compatible)
- `"module": "Node16"` (or `"NodeNext"`)
- `"moduleResolution": "Node16"` (or `"NodeNext"`)
- `"strict": true`
- `"outDir": "./dist"`
- `"rootDir": "./src"`
- `"declaration": true`
- `"esModuleInterop": true`
- `"skipLibCheck": true`
- `"forceConsistentCasingInFileNames": true`
- `"resolveJsonModule": true`
- `"include": ["src"]`
- `"exclude": ["node_modules", "dist"]`

### 4. Create Vitest configuration

**File: `vitest.config.ts`**

A minimal Vitest config. Define with `defineConfig` from `vitest/config`. Set:
- `test.globals`: `false` (use explicit imports)
- `test.environment`: `"node"`
- `test.include`: `["src/**/*.test.ts"]`

### 5. Create directory structure

Create all the directories that subsequent sections will populate. Every directory should contain no files yet (except `src/smoke.test.ts` for verification).

```
src/
  config/
  pipeline/
  agents/
  clients/
  types/
  commands/
  utils/
```

Create these directories under `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/`.

### 6. Create the CLI entry point stub

**File: `src/index.ts`**

Create a minimal placeholder so the project compiles. This should contain just the shebang line and a placeholder comment. The actual Commander.js setup is done in section-08.

```typescript
#!/usr/bin/env node
// CLI entry point — implemented in section-08
```

### 7. Create .gitignore

**File: `.gitignore`**

Include standard entries:
- `node_modules/`
- `dist/`
- `coverage/`
- `.env`

### 8. Verify the setup

After completing all steps, confirm:

1. `npx tsc --noEmit` completes without errors
2. `npx vitest run` finds and passes the smoke test
3. `npm run build` produces output in `dist/`
4. `dist/index.js` retains the `#!/usr/bin/env node` shebang line

## Key Files Produced

| File | Purpose |
|------|---------|
| `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/package.json` | NPM package config with ESM, bin entry, scripts |
| `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/tsconfig.json` | Strict TypeScript config targeting ES2022 |
| `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/vitest.config.ts` | Vitest test runner configuration |
| `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/.gitignore` | Git ignore rules |
| `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/src/index.ts` | CLI entry point stub with shebang |
| `/Users/andrew/Code/scratchpad/code-review/01-core-infrastructure/src/smoke.test.ts` | Trivial test to verify tooling works |

## Dependencies on Other Sections

None. This is the foundation section with no dependencies. All other sections depend on this one being completed first.

## Notes

- The `tsx` dev dependency is used for the `dev` script, allowing running TypeScript directly without a compile step during development.
- The `@types/picomatch` package is needed because `picomatch` does not ship its own type declarations.
- The shebang (`#!/usr/bin/env node`) on `src/index.ts` is critical. TypeScript preserves it during compilation. After `npm run build`, verify `dist/index.js` starts with `#!/usr/bin/env node` on its first line.