import { describe, expect, it } from 'vitest'
import { DEFAULT_MAX_TOKENS, FIL_ROUGE_PROMPT } from '../../config/defaults'
import {
  defaultL2Config,
  describeDiff,
  diffRequestKeys,
  toRequest,
  type L2Config,
} from './config'
import { AB_PRESETS } from './presets'

const MODEL = 'claude-haiku-4-5-20251001'

describe('toRequest', () => {
  it('blocs éteints : requête nue, max_tokens au défaut', () => {
    const request = toRequest(defaultL2Config(), MODEL)
    expect(request).toEqual({
      model: MODEL,
      messages: [{ role: 'user', content: FIL_ROUGE_PROMPT }],
      max_tokens: DEFAULT_MAX_TOKENS,
    })
    expect('system' in request).toBe(false)
    expect('temperature' in request).toBe(false)
  })

  it('chaque bloc activé apparaît dans la requête avec sa valeur', () => {
    const config: L2Config = {
      ...defaultL2Config(),
      prompt: 'Question test',
      system: { enabled: true, value: 'Réponds en un mot.' },
      temperature: { enabled: true, value: 0.3 },
      maxTokens: { enabled: true, value: 200 },
    }
    expect(toRequest(config, MODEL)).toEqual({
      model: MODEL,
      messages: [{ role: 'user', content: 'Question test' }],
      max_tokens: 200,
      system: 'Réponds en un mot.',
      temperature: 0.3,
    })
  })

  it('un bloc éteint garde sa valeur mais ne part pas dans la requête', () => {
    const config = defaultL2Config()
    config.temperature = { enabled: false, value: 0.2 }
    expect('temperature' in toRequest(config, MODEL)).toBe(false)
  })

  it('schéma strict : output_config.format dans extra, system intact', () => {
    const config = defaultL2Config()
    config.schema.enabled = true
    config.schema.value.strict = true
    const request = toRequest(config, MODEL)
    expect('system' in request).toBe(false)
    const outputConfig = request.extra?.output_config as {
      format: { type: string; schema: Record<string, unknown> }
    }
    expect(outputConfig.format.type).toBe('json_schema')
    expect(outputConfig.format.schema.additionalProperties).toBe(false)
    expect(Object.keys(outputConfig.format.schema.properties as object)).toEqual(
      ['irritant', 'gravite', 'theme', 'verbatim_resume'],
    )
  })

  it('schéma non-strict : consigne de repli dans system, pas d’output_config', () => {
    const config = defaultL2Config()
    config.schema.enabled = true
    const request = toRequest(config, MODEL)
    expect(request.extra).toBeUndefined()
    expect(request.system).toContain('objet JSON conforme')
    expect(request.system).toContain('"gravite"')
  })

  it('schéma non-strict + system actif : consigne ajoutée après le system', () => {
    const config = defaultL2Config()
    config.system.enabled = true
    config.schema.enabled = true
    const request = toRequest(config, MODEL)
    expect(request.system!.startsWith(config.system.value)).toBe(true)
    expect(request.system).toContain('objet JSON conforme')
  })
})

describe('diffRequestKeys / describeDiff', () => {
  it('deux configs identiques : aucun diff', () => {
    const a = toRequest(defaultL2Config(), MODEL)
    const b = toRequest(defaultL2Config(), MODEL)
    expect(diffRequestKeys(a, b).size).toBe(0)
    expect(describeDiff(a, b)).toEqual([])
  })

  it('température modifiée sur B : seul temperature diffère', () => {
    const configA = defaultL2Config()
    configA.temperature = { enabled: true, value: 0 }
    const configB = defaultL2Config()
    configB.temperature = { enabled: true, value: 1 }
    const a = toRequest(configA, MODEL)
    const b = toRequest(configB, MODEL)
    expect([...diffRequestKeys(a, b)]).toEqual(['temperature'])
    expect(describeDiff(a, b)).toEqual([{ key: 'temperature', a: '0', b: '1' }])
  })

  it('bloc présent d\'un seul côté : valeur null côté absent', () => {
    const configB = defaultL2Config()
    configB.system.enabled = true
    const diff = describeDiff(
      toRequest(defaultL2Config(), MODEL),
      toRequest(configB, MODEL),
    )
    expect(diff).toHaveLength(1)
    expect(diff[0].key).toBe('system')
    expect(diff[0].a).toBeNull()
    expect(diff[0].b).toContain('analyste relation client')
  })

  it('prompt modifié : le diff porte sur messages, valeurs tronquées', () => {
    const configB = defaultL2Config()
    configB.prompt = 'Autre prompt, beaucoup plus court.'
    const diff = describeDiff(
      toRequest(defaultL2Config(), MODEL),
      toRequest(configB, MODEL),
    )
    expect(diff.map((d) => d.key)).toEqual(['messages'])
    expect(diff[0].a!.length).toBeLessThanOrEqual(61) // 60 + ellipse
  })
})

describe('presets A/B', () => {
  it('« sans/avec system prompt » : le diff est exactement system', () => {
    const preset = AB_PRESETS.find((p) => p.id === 'system')!
    const { a, b } = preset.make()
    expect([
      ...diffRequestKeys(toRequest(a, MODEL), toRequest(b, MODEL)),
    ]).toEqual(['system'])
  })

  it('« température 0 vs 1 » : le diff est exactement temperature', () => {
    const preset = AB_PRESETS.find((p) => p.id === 'temperature')!
    const { a, b } = preset.make()
    const requestA = toRequest(a, MODEL)
    const requestB = toRequest(b, MODEL)
    expect([...diffRequestKeys(requestA, requestB)]).toEqual(['temperature'])
    expect(requestA.temperature).toBe(0)
    expect(requestB.temperature).toBe(1)
  })

  it('« schéma : consigne vs strict » : le diff est system + output_config', () => {
    const preset = AB_PRESETS.find((p) => p.id === 'schema')!
    const { a, b } = preset.make()
    const requestA = toRequest(a, MODEL)
    const requestB = toRequest(b, MODEL)
    expect([...diffRequestKeys(requestA, requestB)].sort()).toEqual([
      'output_config',
      'system',
    ])
    expect(requestA.system).toContain('objet JSON conforme')
    expect(requestB.extra?.output_config).toBeDefined()
  })

  it('make() rend des objets frais — pas de partage entre colonnes', () => {
    const preset = AB_PRESETS[0]
    const first = preset.make()
    const second = preset.make()
    expect(first.a).not.toBe(second.a)
    first.a.system.value = 'muté'
    expect(second.a.system.value).not.toBe('muté')
  })
})
