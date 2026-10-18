import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  LibraryBig,
} from 'lucide-react'
import { Dashboard } from '@/components/Dashboard'
import { ProgressView } from '@/components/ProgressView'
import { StudyExperience } from '@/components/StudyExperience'
import { WordLibrary } from '@/components/WordLibrary'
import {
  clearAllLearningData,
  db,
  deleteWord,
  getOrCreateTodaySession,
  loadSampleWords,
  upsertWords,
} from '@/data/db'
import { checkOllamaAvailability } from '@/lib/grader'
import { todayKey } from '@/lib/study'
import type { StoredWordCard, WordCard, WordEntry } from '@/types'

type View = 'home' | 'words' | 'progress' | 'study'

function isStoredWord(word: WordCard): word is StoredWordCard {
  return typeof word.id === 'number'
}

function App() {
  const [view, setView] = useState<View>('home')
  const [notice, setNotice] = useState<string | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<
    'checking' | 'ready' | 'missing' | 'offline'
  >('checking')
  const dateKey = todayKey()

  const wordRecords = useLiveQuery(
    () => db.words.orderBy('confidence').toArray(),
    [],
  )
  const reviews = useLiveQuery(
    () => db.reviews.orderBy('reviewedAt').reverse().limit(100).toArray(),
    [],
  )
  const todaySession = useLiveQuery(
    () => db.sessions.get(dateKey),
    [dateKey],
  )

  const words = useMemo(
    () => (wordRecords ?? []).filter(isStoredWord),
    [wordRecords],
  )

  useEffect(() => {
    if (!notice) {
      return
    }
    const timeout = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    let active = true
    checkOllamaAvailability()
      .then(({ modelInstalled }) => {
        if (active) {
          setOllamaStatus(modelInstalled ? 'ready' : 'missing')
        }
      })
      .catch(() => {
        if (active) {
          setOllamaStatus('offline')
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function handleStartStudy() {
    await getOrCreateTodaySession()
    setView('study')
  }

  async function handleImport(entries: WordEntry[]) {
    const result = await upsertWords(entries)
    setNotice(
      `${result.added} word${result.added === 1 ? '' : 's'} added${
        result.updated > 0 ? `, ${result.updated} updated` : ''
      }.`,
    )
    return result
  }

  async function handleLoadSample() {
    const result = await loadSampleWords()
    setNotice(
      result.added > 0
        ? `Loaded ${result.added} sample words.`
        : 'The sample words are already in your library.',
    )
  }

  async function handleDeleteWord(wordId: number) {
    await deleteWord(wordId)
    setNotice('Word removed from your library.')
  }

  async function handleClearAll() {
    await clearAllLearningData()
    setView('home')
    setNotice('Local learning data cleared.')
  }

  const loading = wordRecords === undefined || reviews === undefined

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="brand"
          type="button"
          onClick={() => setView('home')}
          aria-label="Open ConfiDict dashboard"
        >
          <span className="brand-mark" aria-hidden="true">
            <BrainCircuit size={22} strokeWidth={2.2} />
          </span>
          <span>
            <strong>ConfiDict</strong>
            <small>Know what you know</small>
          </span>
        </button>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button
            type="button"
            className={view === 'home' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('home')}
          >
            <BookOpenCheck size={18} />
            Today
          </button>
          <button
            type="button"
            className={view === 'words' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('words')}
          >
            <LibraryBig size={18} />
            Words
          </button>
          <button
            type="button"
            className={view === 'progress' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('progress')}
          >
            <BarChart3 size={18} />
            Progress
          </button>
        </nav>

        <div className={`privacy-badge status-${ollamaStatus}`} aria-live="polite">
          <span aria-hidden="true" />
          {ollamaStatus === 'checking' ? 'Checking Gemma' : null}
          {ollamaStatus === 'ready' ? 'Gemma ready' : null}
          {ollamaStatus === 'missing' ? 'Gemma model missing' : null}
          {ollamaStatus === 'offline' ? 'Ollama offline' : null}
        </div>
      </header>

      {notice ? (
        <div className="notice" role="status">
          {notice}
        </div>
      ) : null}

      <main className="app-main">
        {loading ? (
          <section className="loading-panel" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            Loading your local word library…
          </section>
        ) : null}

        {!loading && view === 'home' ? (
          <Dashboard
            words={words}
            reviews={reviews}
            session={todaySession}
            onStart={handleStartStudy}
            onOpenWords={() => setView('words')}
            onLoadSample={handleLoadSample}
          />
        ) : null}

        {!loading && view === 'words' ? (
          <WordLibrary
            words={words}
            onImport={handleImport}
            onDelete={handleDeleteWord}
            onLoadSample={handleLoadSample}
            onClearAll={handleClearAll}
          />
        ) : null}

        {!loading && view === 'progress' ? (
          <ProgressView words={words} reviews={reviews} />
        ) : null}

        {!loading && view === 'study' && todaySession ? (
          <StudyExperience
            key={`${todaySession.date}-${todaySession.completedWordIds.length}`}
            session={todaySession}
            words={words}
            onExit={() => setView('home')}
          />
        ) : null}
      </main>

      <footer className="app-footer">
        <span>Words and progress stay in this browser.</span>
        <a
          href="https://ollama.com/library/gemma3"
          target="_blank"
          rel="noreferrer"
        >
          Gemma grading through Ollama
        </a>
      </footer>
    </div>
  )
}

export default App
