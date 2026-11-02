import { defineConfig } from 'tsup';

const external = ['react', '@mui/material', '@phosphor-icons/react', 'motion'];

export default defineConfig([
  // Components: client only, which Next needs to be told.
  {
    entry: ['src/index.ts'],
    format: 'esm',
    dts: true,
    clean: true,
    external,
    banner: { js: "'use client';" },
  },
  // Plain values, safe to read on the server (metadata, emails).
  { entry: ['src/tokens.ts'], format: 'esm', dts: true, external },
]);
