// Archive ZIP minimale pour le téléchargement de la skill en
// `<nom>/SKILL.md` : méthode « store » (aucune compression), le sous-ensemble
// du format que tous les extracteurs comprennent. Écrit à la main plutôt que
// d'ajouter une dépendance — ~80 lignes, et le format reste lisible.
// Module pur, sans DOM.

export interface ZipEntry {
  /** Chemin dans l'archive, séparateur `/` (ex. `analyse-verbatim/SKILL.md`). */
  name: string
  data: Uint8Array
}

// Table CRC-32 standard (polynôme 0xEDB88320), calculée une fois.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Date DOS fixe (1980-01-01) : une archive reproductible vaut mieux qu'un
// horodatage réel pour un export pédagogique.
const DOS_TIME = 0
const DOS_DATE = 0x21
const UTF8_NAMES_FLAG = 0x0800

export function createZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)

    // Local file header (30 octets) + nom, suivi des données telles quelles.
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // version requise : 2.0
    lv.setUint16(6, UTF8_NAMES_FLAG, true)
    lv.setUint16(8, 0, true) // méthode 0 = store
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, entry.data.length, true) // taille compressée = brute
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true) // pas de champ extra
    local.set(name, 30)

    // Entrée du répertoire central (46 octets) + nom.
    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // version d'origine
    cv.setUint16(6, 20, true) // version requise
    cv.setUint16(8, UTF8_NAMES_FLAG, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, entry.data.length, true)
    cv.setUint32(24, entry.data.length, true)
    cv.setUint16(28, name.length, true)
    // Octets 30–41 (extra, commentaire, disque, attributs) : zéro.
    cv.setUint32(42, offset, true) // offset du local header
    central.set(name, 46)

    parts.push(local, entry.data)
    centrals.push(central)
    offset += local.length + entry.data.length
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0)

  // End of central directory (22 octets).
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true) // entrées sur ce disque
  ev.setUint16(10, entries.length, true) // entrées au total
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true) // offset du répertoire central

  const out = new Uint8Array(offset + centralSize + eocd.length)
  let pos = 0
  for (const part of [...parts, ...centrals, eocd]) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}
