// Tests du scénario MCP (T8) : les messages affichés sont du JSON-RPC
// syntaxiquement valide, les paires requête/réponse se répondent par id, et
// le schéma du tool est celui défini au niveau 2 (T6).

import { describe, expect, it } from 'vitest'
import { defaultSchemaSpec, toJsonSchema } from '../../schema/model'
import { validateResponse } from '../../schema/validate'
import { SCENARIO, TOOL_OUTPUT_SCHEMA, type ScenarioStep } from './scenario'

function messagesOf(steps: ScenarioStep[]) {
  return steps.flatMap((step) => (step.message ? [step.message] : []))
}

describe('SCENARIO', () => {
  it('se déroule en 5 temps, chacun visible dans au moins une colonne', () => {
    expect(SCENARIO).toHaveLength(5)
    for (const step of SCENARIO) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(
        step.agent !== undefined ||
          step.tool !== undefined ||
          step.message !== undefined,
      ).toBe(true)
    }
  })

  it('chaque message est du JSON-RPC 2.0 valide (requête ou réponse)', () => {
    const messages = messagesOf(SCENARIO)
    expect(messages.length).toBeGreaterThan(0)
    for (const { direction, payload } of messages) {
      expect(payload.jsonrpc).toBe('2.0')
      expect(typeof payload.id).toBe('number')
      if (direction === 'agent_to_server') {
        // Une requête a une méthode, jamais de résultat.
        expect(typeof payload.method).toBe('string')
        expect(payload).not.toHaveProperty('result')
        expect(payload).not.toHaveProperty('error')
      } else {
        // Une réponse a un résultat (ou une erreur), jamais de méthode.
        expect(payload).not.toHaveProperty('method')
        expect('result' in payload || 'error' in payload).toBe(true)
      }
    }
  })

  it('chaque réponse reprend l’id de la requête qui la précède', () => {
    const messages = messagesOf(SCENARIO)
    const pendingIds = new Map<unknown, string>()
    for (const { direction, payload } of messages) {
      if (direction === 'agent_to_server') {
        expect(pendingIds.has(payload.id)).toBe(false)
        pendingIds.set(payload.id, payload.method as string)
      } else {
        expect(pendingIds.has(payload.id)).toBe(true)
        pendingIds.delete(payload.id)
      }
    }
    // Toute requête a reçu sa réponse à la fin du scénario.
    expect(pendingIds.size).toBe(0)
  })

  it('emprunte uniquement les méthodes MCP tools/list et tools/call', () => {
    const methods = messagesOf(SCENARIO)
      .filter((m) => m.direction === 'agent_to_server')
      .map((m) => m.payload.method)
    expect(methods).toEqual(['tools/list', 'tools/call'])
  })

  it('le schéma de sortie du tool est exactement le schéma T6', () => {
    expect(TOOL_OUTPUT_SCHEMA).toEqual(toJsonSchema(defaultSchemaSpec()))
    const listResult = SCENARIO[1].message?.payload.result as {
      tools: Array<{ name: string; outputSchema: unknown }>
    }
    expect(listResult.tools[0].name).toBe('analyse-verbatim')
    expect(listResult.tools[0].outputSchema).toEqual(TOOL_OUTPUT_SCHEMA)
  })

  it('le résultat structuré rejoué est conforme au schéma annoncé', () => {
    const callResult = SCENARIO[4].message?.payload.result as {
      structuredContent: Record<string, unknown>
      content: Array<{ type: string; text: string }>
    }
    const validation = validateResponse(
      JSON.stringify(callResult.structuredContent),
      TOOL_OUTPUT_SCHEMA,
    )
    expect(validation.status).toBe('valid')
    // Le bloc texte et le contenu structuré racontent la même chose.
    expect(JSON.parse(callResult.content[0].text)).toEqual(
      callResult.structuredContent,
    )
  })

  it('les arguments du tools/call respectent le schéma d’entrée du tool', () => {
    const params = SCENARIO[3].message?.payload.params as {
      name: string
      arguments: { verbatim: unknown }
    }
    expect(params.name).toBe('analyse-verbatim')
    expect(typeof params.arguments.verbatim).toBe('string')
    expect((params.arguments.verbatim as string).length).toBeGreaterThan(0)
  })
})
