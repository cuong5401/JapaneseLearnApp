import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../BottomSheet'
import { COLOR_LABEL, NOTEBOOK_COLORS, hasItem, itemCount, notebooks, useNotebooks, type NotebookColor } from '../../lib/notebooks'
import { closeSaveSheet, useSaveSheetRef } from '../../lib/saveSheet'
import { BookColor } from './BookColor'

/** Chọn màu cho sổ: các ô màu dạng radio. */
export function ColorPicker({ value, onChange, label = 'Màu sổ tay' }: { value: NotebookColor; onChange: (c: NotebookColor) => void; label?: string }) {
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
          className={`grid size-10 place-items-center rounded-lg border-2 transition-colors ${value === c ? 'border-ink' : 'border-transparent hover:border-line'}`}
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
      <label className="block text-sm font-medium">
        Tên sổ tay
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Ví dụ: Từ hay nhầm, Kanji tuần này"
          className="mt-1 h-11 w-full rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-1.5 text-sm font-medium">Màu</p>
      <ColorPicker value={color} onChange={setColor} />
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={!name.trim()} className="min-h-11 flex-1 rounded-lg bg-ai font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">
          Tạo và lưu
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg border border-line px-4 hover:bg-sunken">
          Hủy
        </button>
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
    <BottomSheet open={itemRef !== null} onClose={close} label="Lưu vào sổ tay">
      {itemRef && (
        <div className="pb-2">
          <h2 className="text-lg font-bold">Lưu vào sổ tay</h2>
          <p className="text-sm text-muted">Chọn một hoặc nhiều sổ. Nhấn giữ nút đánh dấu để lưu nhanh vào sổ dùng gần nhất.</p>
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
                    <span className="shrink-0 text-sm tabular-nums text-muted">{itemCount(state, b.id)} mục</span>
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
              <span aria-hidden className="text-xl leading-none">+</span> Tạo sổ tay mới
            </button>
          )}
          <button type="button" onClick={close} className="mt-3 min-h-12 w-full rounded-xl bg-ai font-semibold text-on-ai hover:opacity-90">
            Xong
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
