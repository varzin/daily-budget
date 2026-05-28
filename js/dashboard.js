import { state } from './state.js'
import {
  obligatoryTotal, currentSavingsTotal, computeDaysLeft,
  perDayYellow, perDayGreen, perDayAll
} from './math.js'
import { fmt, pluralDays } from './utils.js'

export function renderDashboard() {
  const bank = Number(state.bank) || 0
  const oblig = obligatoryTotal(state.categories)
  const savingsPool = currentSavingsTotal(state.savings)
  const daysLeft = computeDaysLeft(Number(state.incomeDay))

  document.getElementById('m-bank').textContent = fmt(bank)
  document.getElementById('m-withoutSavings').textContent = fmt(bank - savingsPool)

  document.getElementById('m-perDayYellow-sub').innerHTML = renderPerDayMetric(
    perDayYellow(bank, oblig, savingsPool, daysLeft),
    'metric-yellow', 'm-perDayYellow', 'm-perDayYellow-sym',
    `Without touching savings · ${daysLeft} ${pluralDays(daysLeft)} until income`
  )
  document.getElementById('m-perDayGreen-sub').innerHTML = renderPerDayMetric(
    perDayGreen(bank, oblig, savingsPool, daysLeft),
    'metric-green', 'm-perDayGreen', 'm-perDayGreen-sym',
    '+€200 to savings by month end'
  )
  document.getElementById('m-perDayAll-sub').innerHTML = renderPerDayMetric(
    perDayAll(bank, oblig, daysLeft),
    'metric-all', 'm-perDayAll', 'm-perDayAll-sym',
    'Including savings'
  )

  document.getElementById('m-afterObligatoryNoSavings').textContent = fmt(bank - oblig - savingsPool)
  document.getElementById('m-afterObligatoryAll').textContent = fmt(bank - oblig)

  document.getElementById('bank').value = state.bank || ''
  document.getElementById('incomeDay').value = state.incomeDay || ''
}

function renderPerDayMetric(result, metricId, valueId, symId, normalSubText) {
  const metricEl = document.getElementById(metricId)
  const valueEl = document.getElementById(valueId)
  const symEl = document.getElementById(symId)

  if (result.kind === 'ok') {
    metricEl.classList.remove('deficit')
    symEl.textContent = '€'
    valueEl.textContent = fmt(result.perDay)
    return normalSubText
  } else {
    metricEl.classList.add('deficit')
    symEl.textContent = '−€'
    valueEl.textContent = fmt(result.deficit)
    const days = result.daysNoSpend
    const dayWord = pluralDays(days)
    return `Deficit · ${days} ${dayWord} of no spending`
  }
}
