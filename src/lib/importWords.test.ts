import { describe, expect, it } from 'vitest'
import { parseWordEntries } from '@/lib/importWords'

describe('parseWordEntries', () => {
  it('parses supported separators and skips malformed lines', () => {
    const entries = parseWordEntries(`
      candid :: truthful and straightforward
      diligent - showing careful effort
      resilient, able to recover quickly
      malformed
    `)

    expect(entries).toEqual([
      { term: 'candid', definition: 'truthful and straightforward' },
      { term: 'diligent', definition: 'showing careful effort' },
      { term: 'resilient', definition: 'able to recover quickly' },
    ])
  })

  it('keeps the latest duplicate from the same import', () => {
    const entries = parseWordEntries(`
      novel :: a book
      Novel :: new or unusual
    `)

    expect(entries).toEqual([
      { term: 'Novel', definition: 'new or unusual' },
    ])
  })
})
