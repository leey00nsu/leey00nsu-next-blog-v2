import nextConfig from 'eslint-config-next'
import unicorn from 'eslint-plugin-unicorn'
import eslintConfigPrettier from 'eslint-config-prettier'

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'storybook-static/**',
    ],
  },
  ...nextConfig,
  {
    plugins: {
      unicorn,
    },
    rules: {
      ...unicorn.configs.recommended.rules,
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-null': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-array-reduce': 'off',
      // React Compiler 규칙 - 일부 패턴에서 false positive 발생
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  eslintConfigPrettier,
]

export default eslintConfig
