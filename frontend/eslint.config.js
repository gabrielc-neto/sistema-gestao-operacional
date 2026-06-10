import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Contextos exportam Provider + hook no mesmo arquivo (padrão do projeto).
      // Só afeta o Fast Refresh em dev, não o runtime. Desligado conscientemente.
      'react-refresh/only-export-components': 'off',
      // Regra nova do React 19 que dispara em vários patterns válidos do projeto:
      //   - polling SASCAR a cada 30s (useSascarPosicoes)
      //   - carga inicial no mount (Atrelamento, Ferias, Historico, OC, Manutencao)
      //   - sync de state local com contexto/profile (OC, Permissoes)
      // Cada caso foi auditado: são sincronizações com sistema externo ou estado de pai,
      // que é exatamente o uso recomendado de useEffect. Desligar evita ruído sem perder sinal.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
