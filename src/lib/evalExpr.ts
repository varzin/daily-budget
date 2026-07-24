// Tiny safe expression evaluator for the amount fields.
// Grammar:
//   expr   = term (('+'|'-') term)*
//   term   = unary (('*'|'/') unary)*
//   unary  = ('+'|'-') unary | atom
//   atom   = currency? ('(' expr ')' | number) currency?
//   number = digits ('.' digits)? | '.' digits
//
// A `currency` token converts a foreign amount to the default currency at
// evaluation time — e.g. "10 AMD", "$10", "10 ₽". It is recognized ONLY when a
// rate resolver is supplied (via opts.rate); without one the evaluator behaves
// exactly as before, so unrelated call sites and tests are unaffected.

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false }

/** Resolve a currency token (ISO code or symbol) to a multiplier into the
 *  default currency, or null when it can't be resolved. */
export type Rate = (token: string) => number | null

export interface EvalOptions {
  rate?: Rate
}

export function evaluateExpr(input: string, opts: EvalOptions = {}): EvalResult {
  const src = input.replace(/,/g, '.').trim()
  if (src === '') return { ok: true, value: 0 }

  const rate = opts.rate
  let i = 0

  const peek = (): string => (i < src.length ? src[i]! : '')
  const eof = () => i >= src.length
  const skipWs = () => { while (i < src.length && /\s/.test(src[i]!)) i++ }

  // A currency symbol is any char that isn't a digit, letter, operator, paren,
  // dot or whitespace (e.g. €, $, ₽). Letters form ISO-code tokens separately.
  const isSymbolChar = (ch: string): boolean =>
    ch !== '' && !/[0-9A-Za-z+\-*/().\s]/.test(ch)

  // Read a trailing currency token: a run of ASCII letters (ISO code) or a
  // single symbol char. Advances `i` past it, or returns null (no token).
  function readCurrencyToken(): string | null {
    skipWs()
    if (/[A-Za-z]/.test(peek())) {
      const start = i
      while (i < src.length && /[A-Za-z]/.test(src[i]!)) i++
      return src.slice(start, i)
    }
    if (isSymbolChar(peek())) {
      const ch = peek()
      i++
      return ch
    }
    return null
  }

  function parseNumber(): number | null {
    skipWs()
    const start = i
    while (i < src.length && /[0-9]/.test(src[i]!)) i++
    if (i < src.length && src[i] === '.') {
      i++
      while (i < src.length && /[0-9]/.test(src[i]!)) i++
    }
    if (i === start) return null
    const s = src.slice(start, i)
    if (s === '.') return null
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }

  function parseAtom(): number | null {
    skipWs()
    // Optional prefix currency symbol ("$10", "€10"). Letters are never a
    // prefix — ISO codes always follow the number.
    let prefix: string | null = null
    if (rate && isSymbolChar(peek())) {
      prefix = peek()
      i++
      skipWs()
    }

    let value: number | null
    if (peek() === '(') {
      i++
      const v = parseExpr()
      if (v === null) return null
      skipWs()
      if (peek() !== ')') return null
      i++
      value = v
    } else {
      value = parseNumber()
    }
    if (value === null) return null

    // At most one currency token per atom: prefix symbol XOR trailing token.
    const token = prefix ?? (rate ? readCurrencyToken() : null)
    if (token !== null) {
      const m = rate ? rate(token) : null
      if (m === null || m === undefined) return null
      value = value * m
    }
    return value
  }

  function parseUnary(): number | null {
    skipWs()
    if (peek() === '+') { i++; const v = parseUnary(); return v === null ? null : v }
    if (peek() === '-') { i++; const v = parseUnary(); return v === null ? null : -v }
    return parseAtom()
  }

  function parseTerm(): number | null {
    let left = parseUnary()
    if (left === null) return null
    while (true) {
      skipWs()
      const op = peek()
      if (op !== '*' && op !== '/') break
      i++
      const right = parseUnary()
      if (right === null) return null
      if (op === '*') left = left * right
      else {
        if (right === 0) return null
        left = left / right
      }
    }
    return left
  }

  function parseExpr(): number | null {
    let left = parseTerm()
    if (left === null) return null
    while (true) {
      skipWs()
      const op = peek()
      if (op !== '+' && op !== '-') break
      i++
      const right = parseTerm()
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  const result = parseExpr()
  skipWs()
  if (result === null || !eof() || !Number.isFinite(result)) return { ok: false }
  return { ok: true, value: result }
}

export function formatEvalResult(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

// Lenient: trailing operators dropped, unclosed parens auto-closed,
// empty input → 0. Genuine token garbage ("abc", "5 5") still fails.
export function evaluateLenient(input: string, opts: EvalOptions = {}): EvalResult {
  let s = input.replace(/,/g, '.').trim()
  // Drop trailing operators / unmatched openings.
  while (s.length > 0 && /[+\-*/(\s]$/.test(s)) s = s.slice(0, -1).trimEnd()
  // Auto-close any unmatched opening parens.
  let depth = 0
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
  }
  if (depth > 0) s = s + ')'.repeat(depth)
  return evaluateExpr(s, opts)
}

export function hasMathOps(input: string): boolean {
  // Strip a single leading minus so "-5" alone is not treated as an expression.
  return /[+\-*/()]/.test(input.trim().replace(/^-/, ''))
}

// A currency token is any char outside the numeric/operator alphabet — an ISO
// code letter or a currency symbol. Used to decide when the blurred display
// should show the converted result of an otherwise operator-free entry.
export function hasCurrencyToken(input: string): boolean {
  return /[^\d+\-*/().,\s]/.test(input)
}
