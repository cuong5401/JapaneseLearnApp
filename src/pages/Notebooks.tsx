import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button, CardLink } from '../components/Pressable'
import { Stagger, StaggerItem } from '../components/Stagger'
import { BookColor } from '../components/notebook/BookColor'
import { ColorPicker } from '../components/notebook/SaveSheet'
import { itemCount, notebooks, useNotebooks, type Notebook, type NotebookColor } from '../lib/notebooks'
import { formatDate, t } from '../i18n'

const dateText = (ms: number) => (ms ? formatDate(ms) : '')

function NewBook({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<NotebookColor>('ai')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    notebooks.create(name, color)
    onDone()
  }
  return (
    <form onSubmit={submit} className="rounded-2xl border border-ai bg-surface p-4">
      <label className="block text-sm font-medium">{t('notebooks.tenSoTay')}<input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t('notebooks.viDuTuHay')}
          className="mt-1 h-11 w-full rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-1.5 text-sm font-medium">{t('notebooks.mau')}</p>
      <ColorPicker value={color} onChange={setColor} />
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">{t('notebooks.taoSo')}</button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg border border-line px-4 hover:bg-sunken">{t('common.huy')}</button>
      </div>
    </form>
  )
}

/** Sửa một sổ: đổi tên, đổi màu, lên/xuống, xóa (có xác nhận). */
function EditBook({ book, index, total, onDone }: { book: Notebook; index: number; total: number; onDone: () => void }) {
  const [name, setName] = useState(book.name)
  const [confirm, setConfirm] = useState(false)
  const save = (e: FormEvent) => {
    e.preventDefault()
    notebooks.rename(book.id, name)
    onDone()
  }
  return (
    <form onSubmit={save} className="rounded-2xl border border-ai bg-surface p-4" aria-label={t('notebooks.suaSo', { name: book.name })}>
      <label className="block text-sm font-medium">{t('notebooks.tenSoTay')}<input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="mt-1 h-11 w-full rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-1.5 text-sm font-medium">{t('notebooks.mau')}</p>
      <ColorPicker value={book.color} onChange={(c) => notebooks.recolor(book.id, c)} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">{t('notebooks.luu')}</button>
        <button type="button" disabled={index === 0} onClick={() => notebooks.move(book.id, -1)} className="min-h-11 rounded-lg border border-line px-3 hover:bg-sunken disabled:opacity-40">{t('notebooks.len')}</button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => notebooks.move(book.id, 1)}
          className="min-h-11 rounded-lg border border-line px-3 hover:bg-sunken disabled:opacity-40"
        >{t('notebooks.xuong')}</button>
        {total > 1 &&
          (confirm ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-beni">{t('notebooks.xoaSoVaCac')}</span>
              <button
                type="button"
                onClick={() => {
                  notebooks.remove(book.id)
                  onDone()
                }}
                className="min-h-11 rounded-lg bg-beni px-4 font-semibold text-on-ai"
              >{t('common.xoa')}</button>
              <button type="button" onClick={() => setConfirm(false)} className="min-h-11 rounded-lg border border-line px-3">{t('common.giuLai')}</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="ml-auto min-h-11 rounded-lg border border-beni px-4 font-medium text-beni hover:bg-beni-soft">{t('notebooks.xoaSo')}</button>
          ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t('notebooks.xoaSoChiBo')}</p>
    </form>
  )
}

export function Notebooks() {
  const state = useNotebooks()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader title={t('common.soTay')}>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90">{t('notebooks.taoSoTay')}</Button>
        )}
      </PageHeader>
      <p className="-mt-3 mb-6 text-sm text-muted">{t('notebooks.bamBieuTuongDanh')}</p>

      {creating && (
        <div className="mb-4">
          <NewBook onDone={() => setCreating(false)} />
        </div>
      )}

      <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
        {state.books.map((b, i) => (
          <StaggerItem as="li" key={b.id}>
            {editing === b.id ? (
              <EditBook book={b} index={i} total={state.books.length} onDone={() => setEditing(null)} />
            ) : (
              <div className="relative">
                <CardLink
                  to={`/notebooks/${b.id}`}
                  data-notebook={b.name}
                  className="flex min-h-24 items-center gap-4 rounded-2xl border border-line bg-surface p-4 pr-20 hover:border-ai"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, var(--nb-${b.color}) 18%, transparent)` }}>
                    <BookColor color={b.color} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-semibold">{b.name}</span>
                    <span className="block text-sm text-muted">{t('notebooks.muc', { itemCount: itemCount(state, b.id), v: b.updatedAt ? t('notebooks.editedPart', { date: dateText(b.updatedAt) }) : '' })}</span>
                  </span>
                </CardLink>
                <button
                  type="button"
                  onClick={() => setEditing(b.id)}
                  className="absolute top-1/2 right-3 min-h-11 -translate-y-1/2 rounded-lg px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
                  aria-label={t('notebooks.suaSo', { name: b.name })}
                >{t('notebooks.sua')}</button>
              </div>
            )}
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
