import type { WordEntry } from '@/types'

const DELIMITERS = ['::', '\t', '=>', ' - ']

function splitEntry(line: string): [string, string] | null {
  for (const delimiter of DELIMITERS) {
    const index = line.indexOf(delimiter)
    if (index > 0) {
      return [
        line.slice(0, index).trim(),
        line.slice(index + delimiter.length).trim(),
      ]
    }
  }

  const commaIndex = line.indexOf(',')
  if (commaIndex > 0) {
    return [
      line.slice(0, commaIndex).trim(),
      line.slice(commaIndex + 1).trim(),
    ]
  }

  return null
}

export function parseWordEntries(input: string): WordEntry[] {
  const entries = new Map<string, WordEntry>()

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const parts = splitEntry(line)
    if (!parts) {
      continue
    }

    const [term, definition] = parts
    if (!term || !definition) {
      continue
    }

    entries.set(term.toLocaleLowerCase(), { term, definition })
  }

  return [...entries.values()]
}
