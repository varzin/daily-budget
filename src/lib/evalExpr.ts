// Tiny safe expression evaluator for the Spent field.
// Grammar:
//   expr   = term (('+'|'-') term)*
//   term   = unary (('*'|'/') unary)*
//   unary  = ('+'|'-') unary | atom
//   atom   = '(' expr ')' | number
//   number = digits ('.' digits)? | '.' digits

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false }

export function evaluateExpr(input: string): EvalResult {
  const src = input.replace(/,/g, '.').trim()
  if (src === '') return { ok: true, value: 0 }

  let i = 0

  const peek = (): string => (i < src.length ? src[i]! : '')
  const eof = () => i >= src.length
  const skipWs = () => { while (i < src.length && /\s/.test(src[i]!)) i++ }

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
    if (peek() === '(') {
      i++
      const v = parseExpr()
      if (v === null) return null
      skipWs()
      if (peek() !== ')') return null
      i++
      return v
    }
    return parseNumber()
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
export function evaluateLenient(input: string): EvalResult {
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
  return evaluateExpr(s)
}

export function hasMathOps(input: string): boolean {
  // Strip a single leading minus so "-5" alone is not treated as an expression.
  return /[+\-*/()]/.test(input.trim().replace(/^-/, ''))
}
