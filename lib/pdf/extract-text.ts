'use client'

/**
 * Plain-text extraction from a PDF in the browser (pdf.js). Text items are
 * regrouped into visual lines; a wide horizontal gap becomes a column
 * break (two spaces) so tabular lists like the Betriebsstellenverzeichnis
 * keep their columns.
 *
 * The worker is served from /public/vendor and must match the installed
 * pdfjs-dist version.
 */

const WORKER_SRC = '/vendor/pdf.worker-4.10.38.min.mjs'

interface Item {
  x: number
  y: number
  w: number
  h: number
  str: string
}

export async function extractPdfText(file: File, onProgress?: (page: number, pages: number) => void): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const out: string[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    onProgress?.(p, doc.numPages)
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items: Item[] = []
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue
      items.push({ x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || 8, str: it.str })
    }
    // Group into lines with a tolerance of ~40 % of the font height.
    items.sort((a, b) => b.y - a.y || a.x - b.x)
    const lines: Item[][] = []
    for (const it of items) {
      const line = lines.find((l) => Math.abs(l[0].y - it.y) <= Math.max(2, it.h * 0.4))
      if (line) line.push(it)
      else lines.push([it])
    }
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x)
      let text = ''
      let lastEnd = -Infinity
      for (const it of line) {
        const gap = it.x - lastEnd
        if (text) text += gap > it.h * 1.2 ? '   ' : gap > it.h * 0.15 ? ' ' : ''
        text += it.str
        lastEnd = it.x + it.w
      }
      out.push(text.trimEnd())
    }
    page.cleanup()
  }
  await doc.destroy()
  return out.join('\n')
}
