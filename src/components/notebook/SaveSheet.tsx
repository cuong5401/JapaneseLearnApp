import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../BottomSheet'
import { COLOR_LABEL, NOTEBOOK_COLORS, hasItem, itemCount, notebooks, useNotebooks, type NotebookColor } from '../../lib/notebooks'
import { closeSaveSheet, useSaveSheetRef } from '../../lib/saveSheet'
import { BookColor } from './BookColor'
import { t } from '../../i18n'

/** Chọn màu cho sổ: các ô màu dạng radio. */
export function ColorPicker({ value, onChange, label = t('saveSheet.mauSoTay') }: { value: NotebookColor; onChange: (c: NotebookColor) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {NOTEBOOK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={COLOR_LABEL[c]}
          title={COLOR_LABEL[c]}
          onClick={() => onChange(c)}
          className={`grid size-11 place-items-center rounded-lg border-2 transition-colors ${value === c ? 'border-ink' : 'border-transparent hover:border-line'}`}
        >
          <BookColor color={c} className="size-6" />
        </button>
      ))}
    </div>
  )
}

function NewBookForm({ itemRef, onDone }: { itemRef: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<NotebookColor>('ai')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = notebooks.create(name, color)
    // Sổ vừa tạo được chọn sẵn cho mục đang lưu.
    notebooks.add(id, itemRef)
    onDone()
  }
  return (
    <form onSubmit={submit} className="mt-2 rounded-xl border border-line bg-surface p-3">
      <label className="block text-sm font-medium">{t('saveSheet.tenSoTay')}<input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t('saveSheet.viDuTuHay')}
          className="mt-1 h-11 w-full rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-1.5 text-sm font-medium">{t('saveSheet.mau')}</p>
      <ColorPicker value={color} onChange={setColor} />
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={!name.trim()} className="min-h-11 flex-1 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">{t('saveSheet.taoVaLuu')}</button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg border border-line px-4 hover:bg-sunken">{t('common.huy')}</button>
      </div>
    </form>
  )
}

/** Sheet "Lưu vào sổ tay" dùng chung (mở bằng openSaveSheet). Tick là lưu ngay, bỏ tick là gỡ. */
export function SaveSheetHost() {
  const itemRef = useSaveSheetRef()
  const state = useNotebooks()
  const [creating, setCreating] = useState(false)
  const close = () => {
    setCreating(false)
    closeSaveSheet()
  }

  return (
    <BottomSheet open={itemRef !== null} onClose={close} label={t('saveSheet.luuVaoSoTay')}>
      {itemRef && (
        <div className="pb-2">
          <h2 className="text-lg font-bold">{t('saveSheet.luuVaoSoTay')}</h2>
          <p className="text-sm text-muted">{t('saveSheet.chonMotHoacNhieu')}</p>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {state.books.map((b) => {
              const on = hasItem(state, b.id, itemRef)
              return (
                <li key={b.id}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-sunken">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => notebooks.toggle(b.id, itemRef)}
                      className="size-5 cursor-pointer accent-[var(--ai)]"
                    />
                    <BookColor color={b.color} />
                    <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">{t('saveSheet.muc', { itemCount: itemCount(state, b.id) })}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          {creating ? (
            <NewBookForm itemRef={itemRef} onDone={() => setCreating(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl px-4 font-semibold text-ai hover:bg-ai-soft"
            >
              <span aria-hidden className="text-xl leading-none">+</span>{t('saveSheet.taoSoTayMoi')}</button>
          )}
          <button type="button" onClick={close} className="mt-3 min-h-12 w-full rounded-xl bg-ai font-semibold text-on-ai hover:opacity-90">
            {t('common.done')}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
