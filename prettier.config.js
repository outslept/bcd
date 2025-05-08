// @ts-check

/** @type {import('prettier').Config} */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: [
        '**/.changeset/**',
        '**/.idea/**',
        '**/.output/**',
        '**/.vercel/**',
        '**/*.min.*',
        '**/CHANGELOG*.md',
        '**/coverage/**',
        '**/dist/**',
        '**/LICENSE*',
        '**/node_modules/**',
        '**/pnpm-lock.yaml',
        '**/temp/**',
        'output/**',
      ],
      options: {
        requirePragma: true,
      },
    },
  ],
}
