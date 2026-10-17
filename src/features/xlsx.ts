// Minimal .xlsx reader for the vehicle import: first worksheet only, cell values as text.
// No dependency: the zip container is read by hand, entries are inflated with the
// browser's DecompressionStream, and the sheet XML is read with DOMParser.
// Legacy .xls (binary) files are not supported.

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  localOffset: number
}

function readEntries(buf: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buf)
  // End of central directory: scan back from the end (it may be followed by a comment).
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('not a zip')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const out: ZipEntry[] = []
  for (let k = 0; k < count; k++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('bad central directory')
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    out.push({
      method: view.getUint16(p + 10, true),
      compressedSize: view.getUint32(p + 20, true),
      localOffset: view.getUint32(p + 42, true),
      name: decoder.decode(new Uint8Array(buf, p + 46, nameLen)),
    })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

async function readText(buf: ArrayBuffer, e: ZipEntry): Promise<string> {
  const view = new DataView(buf)
  const start = e.localOffset + 30 + view.getUint16(e.localOffset + 26, true) + view.getUint16(e.localOffset + 28, true)
  const data = new Uint8Array(buf, start, e.compressedSize)
  if (e.method === 0) return new TextDecoder().decode(data)
  if (e.method !== 8) throw new Error('unsupported compression')
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

const colIndex = (ref: string) => {
  const letters = ref.replace(/[0-9]/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** Returns the first worksheet as rows of cell text, with the spreadsheet row number. */
export async function readXlsx(file: Blob): Promise<{ line: number; cells: string[] }[]> {
  const buf = await file.arrayBuffer()
  const entries = readEntries(buf)
  const find = (name: string) => entries.find((e) => e.name === name)
  const parse = async (e: ZipEntry) => new DOMParser().parseFromString(await readText(buf, e), 'application/xml')

  const shared: string[] = []
  const ss = find('xl/sharedStrings.xml')
  if (ss) {
    const doc = await parse(ss)
    for (const si of Array.from(doc.getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''))
    }
  }

  // The first sheet in workbook order, resolved through the workbook relationships.
  let sheetPath = ''
  const wb = find('xl/workbook.xml')
  const rels = find('xl/_rels/workbook.xml.rels')
  if (wb && rels) {
    const first = (await parse(wb)).getElementsByTagName('sheet')[0]
    const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const rel = Array.from((await parse(rels)).getElementsByTagName('Relationship')).find((r) => r.getAttribute('Id') === rid)
    const target = rel?.getAttribute('Target')
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`
  }
  const sheet = find(sheetPath) ?? entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0]
  if (!sheet) throw new Error('no worksheet')

  const doc = await parse(sheet)
  const rows: { line: number; cells: string[] }[] = []
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const cells: string[] = []
    let next = 0
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r')
      const i = ref ? colIndex(ref) : next
      const type = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent ?? ''
      let text = v
      if (type === 's') text = shared[Number(v)] ?? ''
      else if (type === 'inlineStr') text = Array.from(c.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('')
      cells[i] = text.trim()
      next = i + 1
    }
    rows.push({ line: Number(row.getAttribute('r')) || rows.length + 1, cells: Array.from(cells, (x) => x ?? '') })
  }
  return rows
}
