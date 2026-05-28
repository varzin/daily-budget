function safeDate(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

/** Days until next income day; if today is on/after it, count to next month. */
export function computeDaysLeft(incomeDay, today = new Date()) {
  if (!incomeDay || incomeDay < 1 || incomeDay > 31) return 0

  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  let target
  if (d < incomeDay) {
    target = safeDate(y, m, incomeDay)
  } else {
    target = safeDate(y, m + 1, incomeDay)
  }

  const msPerDay = 24 * 60 * 60 * 1000
  const startOfToday = new Date(y, m, d).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diff = Math.round((startOfTarget - startOfToday) / msPerDay)
  return Math.max(1, diff)
}

export function categoryAmount(cat) {
  if (cat.done) return 0
  const budget = Number(cat.budget) || 0
  const spent = Number(cat.spent) || 0
  return Math.max(0, budget - spent)
}

export function obligatoryTotal(categories) {
  return categories.reduce((sum, c) => sum + categoryAmount(c), 0)
}

export function currentSavingsTotal(savings) {
  if (!savings || savings.length === 0) return 0
  const last = savings[savings.length - 1]
  return Number(last.bank) || 0
}

export function perDayYellow(bank, oblig, savingsPool, daysLeft) {
  const available = bank - oblig - savingsPool
  return budgetResult(available, daysLeft)
}

export function perDayGreen(bank, oblig, savingsPool, daysLeft, greenBuffer = 200) {
  const available = bank - oblig - savingsPool - greenBuffer
  return budgetResult(available, daysLeft)
}

export function perDayAll(bank, oblig, daysLeft) {
  const available = bank - oblig
  return budgetResult(available, daysLeft)
}

export function savedIndicator(saved) {
  const v = Number(saved) || 0
  if (v >= 500) return 'blue'
  if (v >= 200) return 'green'
  if (v >= 1) return 'yellow'
  return 'red'
}

/** Positive available → per-day; negative → deficit with daysLeft as the no-spend window. */
function budgetResult(available, daysLeft) {
  if (daysLeft <= 0) {
    return { kind: 'ok', perDay: 0 }
  }
  if (available >= 0) {
    return { kind: 'ok', perDay: available / daysLeft }
  }
  return {
    kind: 'deficit',
    deficit: Math.abs(available),
    daysNoSpend: daysLeft
  }
}
