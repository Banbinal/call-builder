import { describe, expect, it } from 'vitest'
import { pageHash, parsePageHash, type PageId } from './router'

describe('parsePageHash', () => {
  it('maps level fragments to level ids', () => {
    expect(parsePageHash('#/l1')).toBe('L1')
    expect(parsePageHash('#/l2')).toBe('L2')
    expect(parsePageHash('#/l3')).toBe('L3')
    expect(parsePageHash('#/l4')).toBe('L4')
  })

  it('is case-insensitive and tolerates slash variants', () => {
    expect(parsePageHash('#/L1')).toBe('L1')
    expect(parsePageHash('#l2')).toBe('L2')
    expect(parsePageHash('#/l3/')).toBe('L3')
  })

  it('falls back to the home page for empty or unknown fragments', () => {
    expect(parsePageHash('')).toBe('accueil')
    expect(parsePageHash('#')).toBe('accueil')
    expect(parsePageHash('#/')).toBe('accueil')
    expect(parsePageHash('#/l5')).toBe('accueil')
    expect(parsePageHash('#/n-importe-quoi')).toBe('accueil')
  })

  it('round-trips every page through pageHash', () => {
    const pages: PageId[] = ['accueil', 'L1', 'L2', 'L3', 'L4']
    for (const page of pages) {
      expect(parsePageHash(pageHash(page))).toBe(page)
    }
  })
})
