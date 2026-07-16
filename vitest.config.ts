import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // fake-indexeddb is imported per-test-file via `fake-indexeddb/auto`
    // so we get a fresh in-memory IndexedDB for each run.
  },
});
