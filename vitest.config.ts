import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        isolate: true, // Todo: ideally, this shall not be needed
        include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    },
});
