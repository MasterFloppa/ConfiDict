import { type FormEvent, useMemo, useState } from 'react'
import {
  Database,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { parseWordEntries } from '@/lib/importWords'
import type { StoredWordCard, WordEntry } from '@/types'

interface WordLibraryProps {
  words: StoredWordCard[]
  onImport: (
    entries: WordEntry[],
  ) => Promise<{ added: number; updated: number }>
  onDelete: (wordId: number) => Promise<void>
  onLoadSample: () => Promise<void>
  onClearAll: () => Promise<void>
}

export function WordLibrary({
  words,
  onImport,
  onDelete,
  onLoadSample,
  onClearAll,
}: WordLibraryProps) {
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredWords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) {
      return words
    }
    return words.filter(
      (word) =>
        word.term.toLocaleLowerCase().includes(query) ||
        word.definition.toLocaleLowerCase().includes(query),
    )
  }, [search, words])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!term.trim() || !definition.trim()) {
      setMessage('Add both a word and its definition.')
      return
    }

    setSaving(true)
    try {
      await onImport([{ term, definition }])
      setTerm('')
      setDefinition('')
      setMessage('Word saved.')
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entries = parseWordEntries(bulkText)
    if (entries.length === 0) {
      setMessage('No valid entries found. Use “word :: definition” per line.')
      return
    }

    setSaving(true)
    try {
      const result = await onImport(entries)
      setBulkText('')
      setMessage(
        `${result.added} added${
          result.updated > 0 ? ` and ${result.updated} updated` : ''
        }.`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(word: StoredWordCard) {
    if (!window.confirm(`Remove “${word.term}” and its review history?`)) {
      return
    }
    await onDelete(word.id)
  }

  async function handleClear() {
    if (
      !window.confirm(
        'Clear every word, review, and study session stored in this browser?',
      )
    ) {
      return
    }
    await onClearAll()
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="section-kicker">Local word library</span>
          <h1>Words and definitions</h1>
          <p>
            Keep the MVP simple: one word, one reference definition, one
            confidence score.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={onLoadSample}>
          <Database size={18} />
          Load sample deck
        </button>
      </div>

      {message ? (
        <div className="inline-message" role="status">
          {message}
        </div>
      ) : null}

      <div className="editor-grid">
        <form className="panel form-panel" onSubmit={handleAdd}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">One at a time</span>
              <h2>Add a word</h2>
            </div>
            <Plus size={20} />
          </div>
          <label>
            Word
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="ubiquitous"
              autoComplete="off"
            />
          </label>
          <label>
            Definition
            <textarea
              value={definition}
              onChange={(event) => setDefinition(event.target.value)}
              placeholder="present, appearing, or found everywhere"
              rows={4}
            />
          </label>
          <button className="button primary" type="submit" disabled={saving}>
            <Plus size={18} />
            Save word
          </button>
        </form>

        <form className="panel form-panel" onSubmit={handleBulkImport}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Paste a list</span>
              <h2>Bulk import</h2>
            </div>
            <Upload size={20} />
          </div>
          <label>
            One entry per line
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder={'candid :: truthful and straightforward\nresilient :: able to recover quickly'}
              rows={7}
            />
          </label>
          <p className="field-help">
            Supported separators: <code>::</code>, tab, <code>=&gt;</code>,
            spaced hyphen, or the first comma.
          </p>
          <button className="button primary" type="submit" disabled={saving}>
            <Upload size={18} />
            Import entries
          </button>
        </form>
      </div>

      <section className="panel library-panel">
        <div className="panel-heading library-heading">
          <div>
            <span className="section-kicker">Your collection</span>
            <h2>{words.length} words</h2>
          </div>
          <div className="library-tools">
            <label className="search-box">
              <Search size={17} />
              <span className="sr-only">Search words</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
              />
            </label>
            {words.length > 0 ? (
              <button className="button danger ghost" type="button" onClick={handleClear}>
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        {filteredWords.length === 0 ? (
          <div className="empty-list">
            <p>
              {words.length === 0
                ? 'Your library is empty.'
                : 'No words match this search.'}
            </p>
          </div>
        ) : (
          <div className="word-table" role="list">
            {filteredWords.map((word) => (
              <article className="word-row" role="listitem" key={word.id}>
                <div className="word-copy">
                  <strong>{word.term}</strong>
                  <span>{word.definition}</span>
                </div>
                <div className="word-meta">
                  <span>
                    {word.attempts} review{word.attempts === 1 ? '' : 's'}
                  </span>
                  <ConfidenceMeter confidence={word.confidence} compact />
                </div>
                <button
                  className="icon-button danger"
                  type="button"
                  onClick={() => handleDelete(word)}
                  aria-label={`Delete ${word.term}`}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
