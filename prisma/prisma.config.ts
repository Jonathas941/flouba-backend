import { defineConfig } from '@prisma/internals';

export const prismaConfig = defineConfig({
  seed: 'tsx prisma/seed.ts',
});
