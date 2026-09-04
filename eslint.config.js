import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.sql', 'tilepoint*.db*'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'useDb',
            'useDbSelector',
            'useDbProducts',
            'useDbBranchStock',
            'useDbInventory',
            'useBranchStockStats',
            'useSettings',
            'useSync',
            'useQueryState',
            'preprocessAndVerifyClipboardText',
            'unwrapInboundPayload',
            'isStrictInboundReportSchema',
            'generateBarcodeCanvas',
            'generateBarcodeDataUrl',
            'drawBarcodeSvg',
            'generateEan13Barcode',
            'getCode128Modules',
            'generateCode128SvgHtml',
            'useAuth',
            'useCart',
            'usePosCart',
            'useTableAutoPageSize',
            'useReceiptFontSize',
            'useResponsivePageSize',
            'useStaffRole',
            'useDisclosure',
            'HeroModalHeader',
            'HeroModalBody',
            'HeroModalFooter',
            'HeroModalContent',
            'HeroTableHeader',
            'HeroTableBody',
            'HeroTableRow',
            'HeroTableCell',
            'HeroTableColumn',
            'PRESET_COLORS',
            'DEFAULT_PALETTES',
            'rgbToHex',
            'hexToRgb',
            'hslToRgb',
            'rgbToHsl',
            'allModulesList',
            'moduleCategories',
            'getBranchReceiptMeta',
            'sanitizeInputText',
            'sanitizeAndValidateNumber',
            'xorObfuscateString',
            'xorDeobfuscateString',
            'encryptString',
            'decryptString',
            'getSecuritySecretKey',
            'formatTenderInput',
            'parseTenderAmount',
            'resolveSyncStatus',
            'useTableContext',
            'generateQrMatrix',
            'generateQrCodeSvgHtml'
          ]
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          caughtErrors: 'none'
        }
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          caughtErrors: 'none'
        }
      ],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
);
