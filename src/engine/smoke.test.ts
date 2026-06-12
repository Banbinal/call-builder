import { describe, expect, it } from 'vitest'
import { ENGINE_NAME } from './index'

describe('engine — test fumigène', () => {
  it("le module engine se charge en environnement Node, sans React ni DOM", () => {
    expect(ENGINE_NAME).toBe('call-builder-engine')
    expect(typeof window).toBe('undefined')
  })
})
