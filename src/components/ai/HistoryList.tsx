import { useState, type FormEvent } from 'react'
import { chats, MAX_CONVERSATIONS, type Conversation } from '../../lib/ai/history'
import { MODES } from '../../lib/ai/prompts'

const modeLabel = (m: Conversation['mode']) => MODES.find((x) => x.id === m)?.label ?? ''

function Row({ c, active, onOpen }: { c: Conversation; active: boolean; onOpen: () => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(c.title)
  const save = (e: FormEvent) => {
    e.preventDefault()
    chats.rename(c.id, title)
    setEditing(false)
  }
  if (editing)
    return (
      <form onSubmit={save} className="flex gap-1.5 p-1.5">
        <input
          autoFocus
          aria-label="Tên cuộc trò chuyện"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border-2 border-line bg-paper px-2 text-sm outline-none focus:border-ai pointer-coarse:text-base"
        />
        <button type="submit" className="min-h-10 rounded-lg bg-ai px-3 text-sm font-semibold text-on-ai">
          Lưu
        </button>
      </form>
    )
  return (
    <div className={`group flex items-center gap-1 rounded-xl ${active ? 'bg-ai-soft' : 'hover:bg-sunken'}`} data-chat={c.id}>
      <button type="button" onClick={onOpen} className="min-h-12 min-w-0 flex-1 px-3 py-2 text-left" aria-current={active ? 'true' : undefined}>
        <span className="flex items-center gap-1.5">
          {c.pinned && (
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-ai" fill="currentColor" aria-label="Đã ghim">
              <path d="M16 3H8v2l1 1v5l-3 3v2h5v6h2v-6h5v-2l-3-3V6l1-1z" />
            </svg>
          )}
          <span className="truncate text-sm font-medium">{c.title}</span>
        </span>
        <span className="block truncate text-xs text-muted">
          {modeLabel(c.mode)} · {c.messages.length} tin
        </span>
      </button>
      <div className="flex shrink-0 pr-1">
        <button type="button" onClick={() => chats.togglePin(c.id)} aria-label={c.pinned ? `Bỏ ghim ${c.title}` : `Ghim ${c.title}`} title={c.pinned ? 'Bỏ ghim' : 'Ghim'} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
          <svg viewBox="0 0 24 24" className="size-4" fill={c.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M16 3H8v2l1 1v5l-3 3v2h5v6h2v-6h5v-2l-3-3V6l1-1z" />
          </svg>
        </button>
        <button type="button" onClick={() => setEditing(true)} aria-label={`Đổi tên ${c.title}`} title="Đổi tên" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
          </svg>
        </button>
        <button type="button" onClick={() => chats.remove(c.id)} aria-label={`Xóa ${c.title}`} title="Xóa" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-beni-soft hover:text-beni">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** Danh sách lịch sử: mở, ghim, đổi tên, xóa từng cuộc, xóa tất cả. */
export function HistoryList({ list, activeId, onOpen, onNew }: { list: Conversation[]; activeId: string | null; onOpen: (id: string) => void; onNew: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="flex flex-col gap-2" data-chat-history>
      <button type="button" onClick={onNew} className="min-h-11 rounded-xl border border-dashed border-ai px-3 text-sm font-semibold text-ai hover:bg-ai-soft">
        + Cuộc trò chuyện mới
      </button>
      {list.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted">Chưa có cuộc trò chuyện nào.</p>
      ) : (
        <div className="space-y-0.5">
          {list.map((c) => (
            <Row key={c.id} c={c} active={c.id === activeId} onOpen={() => onOpen(c.id)} />
          ))}
        </div>
      )}
      <p className="px-2 text-xs text-muted">
        Lưu tối đa {MAX_CONVERSATIONS} cuộc trên máy này; cuộc thứ {MAX_CONVERSATIONS + 1} sẽ xóa cuộc cũ nhất chưa ghim.
      </p>
      {list.length > 0 &&
        (confirm ? (
          <div className="flex flex-wrap items-center gap-2 px-2">
            <span className="text-sm text-beni">Xóa cả {list.length} cuộc?</span>
            <button
              type="button"
              onClick={() => {
                chats.clearAll()
                setConfirm(false)
                onNew()
              }}
              className="min-h-9 rounded-lg bg-beni px-3 text-sm font-semibold text-on-ai"
            >
              Xóa tất cả
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="min-h-9 rounded-lg border border-line px-3 text-sm">
              Giữ lại
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="mx-2 min-h-9 self-start rounded-lg px-2 text-sm text-muted hover:text-beni">
            Xóa tất cả
          </button>
        ))}
    </div>
  )
}
