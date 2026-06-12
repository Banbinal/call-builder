import { describe, expect, it } from 'vitest'
import { crc32, createZip } from './zip'

const encoder = new TextEncoder()

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true)
}

function readU16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint16(offset, true)
}

describe('crc32', () => {
  it('retourne la valeur de contrôle standard du format', () => {
    // Valeur de référence du CRC-32 (polynôme 0xEDB88320) pour "123456789".
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
  })

  it('retourne 0 pour des données vides', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})

describe('createZip', () => {
  const name = 'analyse-verbatim/SKILL.md'
  const content = encoder.encode('---\nname: analyse-verbatim\n---\n')
  const zip = createZip([{ name, data: content }])

  it('commence par un local file header et finit par l’EOCD', () => {
    expect(readU32(zip, 0)).toBe(0x04034b50)
    expect(readU32(zip, zip.length - 22)).toBe(0x06054b50)
  })

  it('déclare la bonne entrée dans l’EOCD et le répertoire central', () => {
    const eocd = zip.length - 22
    expect(readU16(zip, eocd + 10)).toBe(1) // nombre total d'entrées
    const centralOffset = readU32(zip, eocd + 16)
    expect(readU32(zip, centralOffset)).toBe(0x02014b50)
    const nameLength = readU16(zip, centralOffset + 28)
    const centralName = zip.slice(
      centralOffset + 46,
      centralOffset + 46 + nameLength,
    )
    expect(new TextDecoder().decode(centralName)).toBe(name)
  })

  it('stocke les données telles quelles (méthode store) avec le bon CRC', () => {
    expect(readU16(zip, 8)).toBe(0) // méthode 0 = store
    expect(readU32(zip, 14)).toBe(crc32(content))
    const nameLength = readU16(zip, 26)
    const stored = zip.slice(30 + nameLength, 30 + nameLength + content.length)
    expect(stored).toEqual(content)
  })

  it('chaîne plusieurs entrées avec les bons offsets', () => {
    const a = { name: 'a.txt', data: encoder.encode('aaa') }
    const b = { name: 'b/b.txt', data: encoder.encode('bbbb') }
    const multi = createZip([a, b])
    const eocd = multi.length - 22
    expect(readU16(multi, eocd + 10)).toBe(2)
    const centralOffset = readU32(multi, eocd + 16)
    // Deuxième entrée du répertoire central : son offset pointe sur un
    // local header dont le nom est bien b/b.txt.
    const firstCentralLength = 46 + readU16(multi, centralOffset + 28)
    const second = centralOffset + firstCentralLength
    const localOffset = readU32(multi, second + 42)
    expect(readU32(multi, localOffset)).toBe(0x04034b50)
    const nameLength = readU16(multi, localOffset + 26)
    const localName = multi.slice(
      localOffset + 30,
      localOffset + 30 + nameLength,
    )
    expect(new TextDecoder().decode(localName)).toBe('b/b.txt')
  })
})
