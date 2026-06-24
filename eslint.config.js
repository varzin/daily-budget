import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import storybook from 'eslint-plugin-storybook'

// Deliberately small: recommended JS/TS rules plus the two React hooks rules.
// Type-level correctness is tsc's job (`npm run typecheck`); this catches the
// bug classes the compiler can't (hook misuse, unused code, foot-guns).
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'storybook-static'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Storybook's recommended flat config (adds story-specific lint rules).
  ...storybook.configs['flat/recommended'],
)
