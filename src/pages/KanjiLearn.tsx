import { useParams } from 'react-router-dom'
import { LoadError, PageSkeleton } from '../components/LoadState'
import { PageHeader } from '../components/PageHeader'
import { STUDY_PAGE } from '../components/StudyLayout'
import { FlashcardSession } from '../components/study/FlashcardSession'
import { useEntries } from '../hooks/useData'
import type { VocabItem } from '../types'
import { NotFound } from './NotFound'
import { t } from '../i18n'

/** Flashcard cho các từ chứa một chữ Hán (nút "Học các từ này" ở trang Kanji). */
export function KanjiLearn() {
  const { kid = '' } = useParams()
  const kanji = useEntries([kid])
  const entry = kanji.entries.get(kid)
  const wordIds = entry?.kind === 'kanji' ? entry.item.words : []
  const words = useEntries(wordIds)

  if (kanji.status === 'error') return <LoadError error={kanji.error} onRetry={kanji.retry} />
  if (kanji.status !== 'ready') return <PageSkeleton header rows={4} />
  if (!entry || entry.kind !== 'kanji') return <NotFound />

  const back = { to: `/kanji?k=${encodeURIComponent(entry.item.kanji)}`, label: t('kanjiLearn.veChu', { kanji: entry.item.kanji }) }
  const items = wordIds
    .map((id) => words.entries.get(id))
    .flatMap((e) => (e?.kind === 'word' ? [e.item as VocabItem] : []))

  return (
    <div className={STUDY_PAGE}>
      <PageHeader title={t('kanjiLearn.tuCoChu', { kanji: entry.item.kanji })} back={back}>
        <span className="text-sm text-muted">{t('kanjiLearn.tu', { hanViet: entry.item.hanViet, length: wordIds.length })}</span>
      </PageHeader>
      {words.status === 'error' ? (
        <LoadError error={words.error} onRetry={words.retry} />
      ) : words.status !== 'ready' ? (
        <PageSkeleton rows={3} />
      ) : (
        <FlashcardSession key={kid} items={items} back={back} />
      )}
    </div>
  )
}
