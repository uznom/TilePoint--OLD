import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      SECURITY_SECRET: 'test_security_secret_key_that_is_long_enough_32_chars_plus_12345'
    },
    include: ['tests/**/*.{test,spec}.{ts,js}', 'src/**/*.{test,spec}.{ts,js}'],
    testTimeout: 10000
  }
});
