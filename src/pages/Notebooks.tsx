import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button, CardLink } from '../components/Pressable'
import { Stagger, StaggerItem } from '../components/Stagger'
import { BookColor } from '../components/notebook/BookColor'
import { ColorPicker } from '../components/notebook/SaveSheet'
import { itemCount, notebooks, useNotebooks, type Notebook, type NotebookColor } from '../lib/notebooks'

const dateText = (ms: number) => (ms ? new Date(ms).toLocaleDateString('vi-VN') : '')

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
      <label className="block text-sm font-medium">
        Tên sổ tay
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Ví dụ: Từ hay nhầm"
          className="mt-1 h-11 w-full rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-1.5 text-sm font-medium">Màu</p>
      <ColorPicker value={color} onChange={setColor} />
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90 disabled:opacity-40">
          Tạo sổ
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg border border-line px-4 hover:bg-sunken">
          Hủy
        </button>
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
    <form onSubmit={save} className="rounded-2xl border border-ai bg-surface p-4" aria-label={`Sửa sổ ${book.name}`}>
      <label className="block text-sm font-medium">
        Tên sổ tay
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="mt-1 h-11 w-full rounded-lg border-2 border-line bg-paper px-3 outline-none focus:border-ai"
        />
      </label>
      <p className="mt-3 mb-1.5 text-sm font-medium">Màu</p>
      <ColorPicker value={book.color} onChange={(c) => notebooks.recolor(book.id, c)} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="min-h-11 rounded-lg bg-ai px-5 font-semibold text-on-ai hover:opacity-90">
          Lưu
        </button>
        <button type="button" disabled={index === 0} onClick={() => notebooks.move(book.id, -1)} className="min-h-11 rounded-lg border border-line px-3 hover:bg-sunken disabled:opacity-40">
          Lên
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => notebooks.move(book.id, 1)}
          className="min-h-11 rounded-lg border border-line px-3 hover:bg-sunken disabled:opacity-40"
        >
          Xuống
        </button>
        {total > 1 &&
          (confirm ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-beni">Xóa sổ và các mục trong sổ?</span>
              <button
                type="button"
                onClick={() => {
                  notebooks.remove(book.id)
                  onDone()
                }}
                className="min-h-11 rounded-lg bg-beni px-4 font-semibold text-on-ai"
              >
                Xóa
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="min-h-11 rounded-lg border border-line px-3">
                Giữ lại
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="ml-auto min-h-11 rounded-lg border border-beni px-4 font-medium text-beni hover:bg-beni-soft">
              Xóa sổ
            </button>
          ))}
      </div>
      <p className="mt-2 text-xs text-muted">Xóa sổ chỉ bỏ danh sách đã lưu, không ảnh hưởng tiến độ học.</p>
    </form>
  )
}

export function Notebooks() {
  const state = useNotebooks()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader title="Sổ tay">
        {!creating && (
          <Button onClick={() => setCreating(true)} className="min-h-11 rounded-lg bg-ai px-4 font-semibold text-on-ai hover:opacity-90">
            + Tạo sổ tay
          </Button>
        )}
      </PageHeader>
      <p className="-mt-3 mb-6 text-sm text-muted">Bấm biểu tượng đánh dấu trên từ, chữ Hán, bộ thủ hay mẫu ngữ pháp để lưu vào sổ. Nhấn giữ để lưu nhanh.</p>

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
                    <span className="block text-sm text-muted">
                      {itemCount(state, b.id)} mục{b.updatedAt ? ` · sửa ${dateText(b.updatedAt)}` : ''}
                    </span>
                  </span>
                </CardLink>
                <button
                  type="button"
                  onClick={() => setEditing(b.id)}
                  className="absolute top-1/2 right-3 min-h-11 -translate-y-1/2 rounded-lg px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-ink"
                  aria-label={`Sửa sổ ${b.name}`}
                >
                  Sửa
                </button>
              </div>
            )}
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
