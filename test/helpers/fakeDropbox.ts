/**
 * In-memory emulation of the slice of the Dropbox HTTP API that the sync layer
 * talks to. It implements the bits that actually matter for the reliability
 * rework described in CLAUDE.md:
 *
 *   - every stored file carries a `rev` that changes on each write;
 *   - `download` returns that rev in the `Dropbox-API-Result` response header
 *     (exactly like real Dropbox), so the client can remember it;
 *   - `upload` honours the three write modes — `"add"`, `"overwrite"` and the
 *     compare-and-swap `{ ".tag": "update", update: <rev> }` — and returns a
 *     `409 path/conflict` when an `update` is attempted against a stale rev.
 *
 * The emulator is exposed as a `fetch`-compatible handler so the REAL
 * `src/sync/dropbox.ts` module can run end-to-end against it unchanged: tests
 * install `installFakeFetch()` and drive the real `pull()` / `push()` flow.
 *
 * Nothing here knows about budgets — it is a dumb file store. That keeps the
 * tests honest: all merge/CAS/conflict-copy behaviour has to come from the
 * code under test, not from the harness.
 */

export interface StoredFile {
  path: string
  rev: string
  content: string
  serverModified: number
}

export interface UploadRecord {
  path: string
  mode: 'add' | 'overwrite' | { '.tag': 'update'; update: string }
  autorename: boolean
  /** Result: 'written' for success, 'conflict' for a rejected stale CAS. */
  result: 'written' | 'conflict'
}

const DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download'
const UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload'
const ACCOUNT_URL = 'https://api.dropboxapi.com/2/users/get_current_account'
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'

export class FakeDropbox {
  /** path -> file */
  readonly files = new Map<string, StoredFile>()
  /** every upload attempt, in order — lets tests assert the CAS protocol. */
  readonly uploads: UploadRecord[] = []

  private revCounter = 0
  private clock = 1_000

  account = { email: 'tester@example.com', name: { display_name: 'Tester' } }

  // ---- test-facing seeding / inspection ----------------------------------

  /** Place a file as if another device had pushed it. Returns its rev. */
  setFile(path: string, content: string): string {
    const rev = this.nextRev()
    this.files.set(path, {
      path,
      rev,
      content,
      serverModified: this.clock++,
    })
    return rev
  }

  getFile(path: string): StoredFile | undefined {
    return this.files.get(path)
  }

  getJson<T = unknown>(path: string): T | undefined {
    const f = this.files.get(path)
    return f ? (JSON.parse(f.content) as T) : undefined
  }

  /** Files whose name marks them as conflict copies. */
  conflictCopies(): StoredFile[] {
    return [...this.files.values()].filter((f) => /\(conflict[^)]*\)\.json$/.test(f.path))
  }

  private nextRev(): string {
    this.revCounter += 1
    return `rev${this.revCounter}`
  }

  // ---- the fetch handler --------------------------------------------------

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === DOWNLOAD_URL) return this.handleDownload(init)
    if (url === UPLOAD_URL) return this.handleUpload(init)
    if (url === ACCOUNT_URL) return this.json(this.account)
    if (url === TOKEN_URL) {
      // Token refresh — hand back a long-lived token so tests never expire.
      return this.json({ access_token: 'fake-access', expires_in: 14_400 })
    }
    return new Response(`unexpected URL: ${url}`, { status: 500 })
  }

  private handleDownload(init?: RequestInit): Response {
    const arg = this.apiArg(init)
    const file = this.files.get(arg.path)
    if (!file) {
      return new Response(JSON.stringify({ error_summary: 'path/not_found/.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(file.content, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        // Real Dropbox returns file metadata (incl. rev) in this header.
        'Dropbox-API-Result': JSON.stringify(this.metadata(file)),
      },
    })
  }

  private async handleUpload(init?: RequestInit): Promise<Response> {
    const arg = this.apiArg(init)
    const mode = arg.mode ?? 'add'
    const autorename = !!arg.autorename
    const body = await this.readBody(init)
    const existing = this.files.get(arg.path)

    const record: UploadRecord = {
      path: arg.path,
      mode,
      autorename,
      result: 'written',
    }

    // Compare-and-swap write.
    if (typeof mode === 'object' && mode['.tag'] === 'update') {
      if (!existing || existing.rev !== mode.update) {
        record.result = 'conflict'
        this.uploads.push(record)
        return this.conflict()
      }
      const file = this.write(arg.path, body)
      this.uploads.push(record)
      return this.json(this.metadata(file))
    }

    // mode === 'add'
    if (mode === 'add') {
      if (existing && !autorename) {
        record.result = 'conflict'
        this.uploads.push(record)
        return this.conflict()
      }
      const path = existing && autorename ? this.autorenamePath(arg.path) : arg.path
      const file = this.write(path, body)
      this.uploads.push(record)
      return this.json(this.metadata(file))
    }

    // mode === 'overwrite' — unconditional clobber (the OLD, lossy behaviour).
    const file = this.write(arg.path, body)
    this.uploads.push(record)
    return this.json(this.metadata(file))
  }

  // ---- internals ----------------------------------------------------------

  private write(path: string, content: string): StoredFile {
    const file: StoredFile = {
      path,
      rev: this.nextRev(),
      content,
      serverModified: this.clock++,
    }
    this.files.set(path, file)
    return file
  }

  private autorenamePath(path: string): string {
    // Mimic Dropbox autorename: "/x.json" -> "/x (1).json".
    const m = path.match(/^(.*?)(\.[^./]+)?$/)
    const base = m?.[1] ?? path
    const ext = m?.[2] ?? ''
    let i = 1
    let candidate = `${base} (${i})${ext}`
    while (this.files.has(candidate)) {
      i += 1
      candidate = `${base} (${i})${ext}`
    }
    return candidate
  }

  private metadata(file: StoredFile) {
    return {
      name: file.path.split('/').pop(),
      path_lower: file.path.toLowerCase(),
      path_display: file.path,
      rev: file.rev,
      size: file.content.length,
      server_modified: new Date(file.serverModified).toISOString(),
    }
  }

  private apiArg(init?: RequestInit): {
    path: string
    mode?: UploadRecord['mode']
    autorename?: boolean
  } {
    const headers = new Headers(init?.headers)
    const raw = headers.get('Dropbox-API-Arg')
    return raw ? JSON.parse(raw) : { path: '' }
  }

  private async readBody(init?: RequestInit): Promise<string> {
    const body = init?.body
    if (body == null) return ''
    if (typeof body === 'string') return body
    if (body instanceof Blob) return await body.text()
    return String(body)
  }

  private conflict(): Response {
    return new Response(
      JSON.stringify({
        error_summary: 'path/conflict/file/.',
        error: { '.tag': 'path', reason: { '.tag': 'conflict' } },
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    )
  }

  private json(obj: unknown): Response {
    return new Response(JSON.stringify(obj), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
