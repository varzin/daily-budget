import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

// Bumped key, independent from the budget data (`budget_app_v1`). Theme is a
// device-local UI preference and is deliberately NOT synced via Dropbox.
// NOTE: keep this key in sync with the inline boot script in index.html, which
// applies the persisted theme before React mounts to avoid a flash.
export const THEME_STORAGE_KEY = 'budget_theme_v1'

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

/** Does the OS currently prefer a dark color scheme? Defaults to dark. */
function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

/** Collapse a mode into the concrete theme the DOM should show. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

interface ThemeState {
  /** The user's choice. Persisted. */
  mode: ThemeMode
  /** The concrete theme currently applied to the DOM. Derived, not persisted. */
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  /** Internal: kept in sync with the DOM by useApplyTheme. */
  _setResolved: (resolved: ResolvedTheme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark', // Default theme is Dark.
      resolved: 'dark',
      setMode: (mode) => set({ mode, resolved: resolveTheme(mode) }),
      _setResolved: (resolved) => set({ resolved }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the user's choice is persisted; `resolved` is recomputed on load.
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) state.resolved = resolveTheme(state.mode)
      },
    },
  ),
)

/** Theme-color meta values per resolved theme (must match --bg in tokens.css). */
const META_THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: '#0d0e0c',
  light: '#f4f2ea',
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_THEME_COLOR[resolved])
}

/**
 * Side-effect hook: writes the resolved theme to <html data-theme> and the
 * theme-color meta, and — while mode is 'system' — follows live OS changes.
 * Mount once near the app root.
 */
export function useApplyTheme(): void {
  const mode = useThemeStore((s) => s.mode)
  const setResolved = useThemeStore((s) => s._setResolved)

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(mode)
      applyResolvedTheme(resolved)
      setResolved(resolved)
    }
    apply()

    if (mode !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia(SYSTEM_DARK_QUERY)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mode, setResolved])
}
