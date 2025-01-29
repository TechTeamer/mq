/* eslint-disable n/no-unpublished-import */
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import jest from 'eslint-plugin-jest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname
})

const defaultRules = {
  languageOptions: {
    globals: {
      ...globals.commonjs
    },
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    curly: ['error', 'all'],
    'brace-style': ['error', '1tbs', {
      allowSingleLine: false
    }],
    'guard-for-in': 'error',
    'no-console': 'error',
    'no-debugger': 'error',
    radix: 'error',
    'n/no-deprecated-api': 'warn',
    'n/no-process-exit': 'off',
    'no-process-exit': 'off',
    'n/shebang': 'off',
    'no-empty-function': 'error',
    'no-shadow': 'warn',

    // TODO: new rules added
    'n/no-unsupported-features/node-builtins': 'off',
    'n/hashbang': 'off'
  }
}

export default [
  {
    ignores: ['dist/', 'web/', 'client/libs/', 'client/polyfills/', 'logs/']
  },
  ...compat.extends('standard', 'plugin:n/recommended', 'plugin:jest-formatting/strict'),
  defaultRules,
  js.configs.recommended,
  {
    files: ['test/*', 'test/**/*'],
    ...jest.configs['flat/recommended'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
        context: 'readonly',
        jestPuppeteer: 'readonly',
        vuer: 'readonly'
      }
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest-formatting/padding-around-all': 'warn'
    }
  },
  {
    files: ['server/*', 'server/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },
  {
    files: ['engines/*', 'engines/**/*'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['customization/ui/*', 'customization/ui/**/*'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery,
        bootbox: 'readonly',
        echarts: 'readonly',
        pdfjsLib: 'readonly'
      }
    },

    rules: {
      'no-console': ['error', {
        allow: ['warn', 'error', 'info', 'time', 'timeEnd']
      }]
    }
  },
  {
    files: ['db/*', 'db/**/*'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['bin/*', 'bin/**/*'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['client/*', 'client/**/*'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery,
        bootbox: 'readonly',
        echarts: 'readonly',
        pdfjsLib: 'readonly'
      }
    },

    rules: {
      'no-console': ['error', {
        allow: ['warn', 'error', 'info', 'time', 'timeEnd']
      }]
    }
  }
]
