import { describe, expect, it } from 'vitest'
import { detectFormat, formatLabel, summarizeTexts } from './synthesis'

describe('detectFormat', () => {
  it('détecte les listes à puces et numérotées', () => {
    expect(detectFormat('Voici :\n- premier point\n- second').hasList).toBe(true)
    expect(detectFormat('Étapes :\n1. ouvrir\n2. fermer').hasList).toBe(true)
    expect(detectFormat('Étapes :\n1) ouvrir').hasList).toBe(true)
    expect(detectFormat('Un paragraphe simple, sans liste.').hasList).toBe(false)
    // Un tiret en milieu de phrase n'est pas une liste.
    expect(detectFormat('Le service client - injoignable - déçoit.').hasList).toBe(false)
  })

  it('détecte le JSON (bloc fencé ou corps JSON direct)', () => {
    expect(detectFormat('Réponse :\n```json\n{"a": 1}\n```').hasJson).toBe(true)
    expect(detectFormat('{"irritant": "joignabilité"}').hasJson).toBe(true)
    expect(detectFormat('  [1, 2, 3]').hasJson).toBe(true)
    expect(detectFormat('Du texte avec des {accolades} au milieu.').hasJson).toBe(false)
  })

  it('détecte les titres Markdown et les lignes en gras', () => {
    expect(detectFormat('# Analyse\nContenu.').hasHeading).toBe(true)
    expect(detectFormat('Intro.\n## Gravité\nÉlevée.').hasHeading).toBe(true)
    expect(detectFormat('**Irritant principal :**\nLe chat coupe.').hasHeading).toBe(true)
    expect(detectFormat('Un texte **avec du gras** en ligne.').hasHeading).toBe(false)
  })
})

describe('formatLabel', () => {
  it('nomme chaque combinaison de traits', () => {
    expect(formatLabel({ hasList: false, hasJson: false, hasHeading: false })).toBe(
      'texte simple',
    )
    expect(formatLabel({ hasList: true, hasJson: false, hasHeading: false })).toBe(
      'liste',
    )
    expect(formatLabel({ hasList: true, hasJson: true, hasHeading: true })).toBe(
      'JSON + liste + titres',
    )
  })
})

describe('summarizeTexts', () => {
  it('retourne null sans aucune réponse', () => {
    expect(summarizeTexts([])).toBeNull()
  })

  it('calcule min, max et médiane des longueurs (effectif impair)', () => {
    const synthesis = summarizeTexts(['a'.repeat(10), 'b'.repeat(30), 'c'.repeat(20)])!
    expect(synthesis.minLength).toBe(10)
    expect(synthesis.maxLength).toBe(30)
    expect(synthesis.medianLength).toBe(20)
  })

  it('calcule la médiane par moyenne des deux centraux (effectif pair)', () => {
    const synthesis = summarizeTexts(['a'.repeat(10), 'b'.repeat(20)])!
    expect(synthesis.medianLength).toBe(15)
  })

  it('compte les formats distincts', () => {
    const synthesis = summarizeTexts([
      'Paragraphe simple.',
      'Autre paragraphe simple.',
      '- une\n- liste',
      '{"json": true}',
    ])!
    expect(synthesis.distinctFormats).toBe(3)
    expect(synthesis.formatLabels).toEqual(['texte simple', 'liste', 'JSON'])
  })
})
