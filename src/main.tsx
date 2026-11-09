// Phải đứng đầu: migrate localStorage trước khi module store nào được nạp.
import './lib/migrateOnLoad'
import { StrictMode } from 'react'
import { MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout'
import { LegacyLevel } from './components/LegacyLevel'
import { UnlockGate } from './components/UnlockGate'
import { fixDuplicateBase } from './lib/basePath'
// Bắt sự kiện beforeinstallprompt sớm, trước khi trang nào kịp render.
import './lib/install'

// Link / bookmark hỏng do lỗi cũ (basename bị lặp: /JapaneseLearnApp/JapaneseLearnApp/…): sửa URL trước khi router đọc.
const fixedPath = fixDuplicateBase(window.location.pathname, import.meta.env.BASE_URL)
if (fixedPath) window.history.replaceState(window.history.state, '', fixedPath + window.location.search + window.location.hash)

// Mỗi trang tách thành chunk riêng, tải khi điều hướng tới.
const router = createBrowserRouter([
  {
    element: <Layout />,
    // Trang đầu tiên tải trong chớp mắt; nền giấy trống thay vì cảnh báo.
    hydrateFallbackElement: <div className="min-h-dvh bg-paper" />,
    children: [
      { path: '/', lazy: () => import('./pages/Home').then((m) => ({ Component: m.Home })) },
      { path: '/kana', lazy: () => import('./pages/Kana').then((m) => ({ Component: m.Kana })) },
      { path: '/vocab/:deck', lazy: () => import('./pages/VocabDeck').then((m) => ({ Component: m.VocabDeck })) },
      { path: '/vocab/:deck/:lesson', lazy: () => import('./pages/Lesson').then((m) => ({ Component: m.Lesson })) },
      { path: '/word/:id', lazy: () => import('./pages/WordPage').then((m) => ({ Component: m.WordPage })) },
      { path: '/kanji', lazy: () => import('./pages/Kanji').then((m) => ({ Component: m.Kanji })) },
      { path: '/kanji/:kid/learn', lazy: () => import('./pages/KanjiLearn').then((m) => ({ Component: m.KanjiLearn })) },
      { path: '/grammar', lazy: () => import('./pages/Grammar').then((m) => ({ Component: m.Grammar })) },
      { path: '/grammar/:level', lazy: () => import('./pages/Grammar').then((m) => ({ Component: m.Grammar })) },
      { path: '/grammar/:level/:gid', lazy: () => import('./pages/GrammarDetail').then((m) => ({ Component: m.GrammarDetail })) },
      { path: '/terms/:category', lazy: () => import('./pages/DeckHub').then((m) => ({ Component: m.DeckHub })) },
      {
        path: '/terms/:category/flashcards',
        lazy: () => import('./pages/DeckHub').then((m) => ({ Component: () => <m.TermStudy mode="flashcards" /> })),
      },
      {
        path: '/terms/:category/quiz',
        lazy: () => import('./pages/DeckHub').then((m) => ({ Component: () => <m.TermStudy mode="quiz" /> })),
      },
      { path: '/review', lazy: () => import('./pages/Review').then((m) => ({ Component: m.Review })) },
      { path: '/notebooks', lazy: () => import('./pages/Notebooks').then((m) => ({ Component: m.Notebooks })) },
      { path: '/notebooks/:id', lazy: () => import('./pages/NotebookPage').then((m) => ({ Component: m.NotebookPage })) },
      { path: '/progress', lazy: () => import('./pages/Progress').then((m) => ({ Component: m.Progress })) },
      { path: '/ai', lazy: () => import('./pages/AskAi').then((m) => ({ Component: m.AskAi })) },
      { path: '/settings', lazy: () => import('./pages/Settings').then((m) => ({ Component: m.Settings })) },
      { path: '/level/:level/kanji', element: <LegacyLevel kanji /> },
      { path: '/level/:level/*', element: <LegacyLevel /> },
      { path: '/level/:level', element: <LegacyLevel /> },
      { path: '*', lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.NotFound })) },
    ],
  },
], { basename: import.meta.env.BASE_URL })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <UnlockGate>
        <RouterProvider router={router} />
      </UnlockGate>
    </MotionConfig>
  </StrictMode>,
)
