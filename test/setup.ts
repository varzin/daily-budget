// Pin the timezone so date-boundary tests (e.g. `daysSince`, which uses local
// calendar days) are deterministic everywhere. CI runs in UTC; without this the
// suite would only agree with the fixtures when the dev's machine is also UTC.
process.env.TZ = 'UTC'

// Test environment storage shim.
//
// Node 22+ ships an experimental native `localStorage`/`sessionStorage` that is
// enabled by default but inert without a `--localstorage-file` backing path. In
// the jsdom environment that native stub shadows jsdom's Web Storage, leaving a
// bare `{}` on `window.localStorage` (no `clear`/`setItem`/`getItem`). Tests and
// the Zustand persist layer need a real store, so install a spec-compliant
// in-memory Storage whenever the ambient one is missing its methods.

class MemoryStorage implements Storage {
  #map = new Map<string, string>()

  get length(): number {
    return this.#map.size
  }

  clear(): void {
    this.#map.clear()
  }

  getItem(key: string): string | null {
    return this.#map.has(key) ? this.#map.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.#map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.#map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.#map.set(String(key), String(value))
  }

  [name: string]: unknown
}

function install(name: 'localStorage' | 'sessionStorage'): void {
  const current = (globalThis as Record<string, unknown>)[name] as
    | Storage
    | undefined
  if (current && typeof current.clear === 'function') return

  const storage = new MemoryStorage()
  const define = (target: object) =>
    Object.defineProperty(target, name, {
      value: storage,
      configurable: true,
      writable: true,
    })

  define(globalThis)
  if (typeof window !== 'undefined' && window !== (globalThis as unknown))
    define(window)
}

install('localStorage')
install('sessionStorage')
