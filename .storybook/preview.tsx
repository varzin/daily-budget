import { useEffect } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'

// Global design tokens + base styles — imported in src/main.tsx for the app,
// imported here so every story is styled exactly like production.
import '../src/styles/tokens.css'
import '../src/styles/base.css'

// --bg per resolved theme (kept in sync with tokens.css :root / [data-theme]).
const BG: Record<'dark' | 'light', string> = {
  dark: '#0d0e0c',
  light: '#f4f2ea',
}

/**
 * Writes the chosen theme to <html data-theme> exactly like the app does
 * (themeStore.applyResolvedTheme), and paints the canvas/iframe background to
 * the matching --bg so components aren't shown on a white void. Reviewers flip
 * it from the toolbar (defaults to dark).
 */
function ThemeWrapper({ theme, children }: { theme: 'dark' | 'light'; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.background = BG[theme]
    document.body.style.background = BG[theme]
  }, [theme])
  return <>{children}</>
}

const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as 'dark' | 'light') ?? 'dark'
  return (
    <ThemeWrapper theme={theme}>
      <Story />
    </ThemeWrapper>
  )
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Backgrounds are driven by the theme decorator (--bg), so disable the
    // addon-docs default white background grid.
    backgrounds: { disable: true },
    layout: 'centered',
  },
  initialGlobals: {
    theme: 'dark',
  },
  globalTypes: {
    theme: {
      description: 'App theme (writes <html data-theme>)',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
  tags: ['autodocs'],
}

export default preview
