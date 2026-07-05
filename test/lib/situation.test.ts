/**
 * Phase C — single situational widget (CLAUDE.md "Future ideas" #3).
 * computeSituation picks the state (ahead / onTrack / intoSavings / over) and
 * the daily figure that state should feature.
 */
import { describe, expect, it } from 'vitest'
import { availableWidgetModes, computeSituation } from '../../src/lib/math'

// Common fixture: 100 fixed still to pay, 200 in savings, 50 cushion, 10 days.
const OBLIG = 100
const SAVINGS = 200
const BUFFER = 50
const DAYS = 10

const sit = (bank: number, buffer = BUFFER) =>
  computeSituation(bank, OBLIG, SAVINGS, buffer, DAYS)

describe('computeSituation', () => {
  it('ahead — keeps the full cushion, features the green-zone daily', () => {
    // 400 − 100 − 200 − 50 = 50 spare → 5/day
    const s = sit(400)
    expect(s.state).toBe('ahead')
    expect(s.result).toEqual({ kind: 'ok', perDay: 5 })
  })

  it('onTrack — savings whole but cushion not, features break-even daily', () => {
    // 320 − 100 − 200 = 20 spare (but − cushion is negative) → 2/day
    const s = sit(320)
    expect(s.state).toBe('onTrack')
    expect(s.result).toEqual({ kind: 'ok', perDay: 2 })
  })

  it('intoSavings — fixed covered but dipping into savings, features spend-all', () => {
    // 150 − 100 = 50 over fixed, but below the savings line → 5/day
    const s = sit(150)
    expect(s.state).toBe('intoSavings')
    expect(s.result).toEqual({ kind: 'ok', perDay: 5 })
  })

  it("over — can't even cover fixed expenses, features the deficit", () => {
    // 80 − 100 = −20 → deficit of 20, no-spend window = days left
    const s = sit(80)
    expect(s.state).toBe('over')
    expect(s.result).toEqual({ kind: 'deficit', deficit: 20, daysNoSpend: DAYS })
  })

  it('with no cushion, being in the black reads as ahead at the boundary', () => {
    // buffer 0: afterBuffer == afterSavings == 0 → ahead, 0/day
    const s = sit(300, 0)
    expect(s.state).toBe('ahead')
    expect(s.result).toEqual({ kind: 'ok', perDay: 0 })
  })
})

describe('availableWidgetModes', () => {
  it('ahead — every mode is selectable', () => {
    expect(availableWidgetModes('ahead')).toEqual(['ahead', 'onTrack', 'intoSavings'])
  })

  it('onTrack — the cushion mode is blocked', () => {
    expect(availableWidgetModes('onTrack')).toEqual(['onTrack', 'intoSavings'])
  })

  it('intoSavings — only spend-everything remains', () => {
    expect(availableWidgetModes('intoSavings')).toEqual(['intoSavings'])
  })

  it('over — nothing selectable, the widget falls back to the deficit card', () => {
    expect(availableWidgetModes('over')).toEqual([])
  })

  it('mirrors computeSituation: the strictest available mode is the situation itself', () => {
    for (const bank of [400, 320, 150]) {
      const s = sit(bank)
      expect(availableWidgetModes(s.state)[0]).toBe(s.state)
    }
    expect(availableWidgetModes(sit(80).state)).toHaveLength(0)
  })
})
