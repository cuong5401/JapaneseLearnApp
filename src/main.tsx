import { StrictMode } from 'react'
import { MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout'

// Mỗi trang tách thành chunk riêng, tải khi điều hướng tới.
const router = createBrowserRouter([
  {
    element: <Layout />,
    // Trang đầu tiên tải trong chớp mắt; nền giấy trống thay vì cảnh báo.
    hydrateFallbackElement: <div className="min-h-dvh bg-paper" />,
    children: [
      { path: '/', lazy: () => import('./pages/Home').then((m) => ({ Component: m.Home })) },
      { path: '/kana', lazy: () => import('./pages/Kana').then((m) => ({ Component: m.Kana })) },
      { path: '/level/:level', lazy: () => import('./pages/DeckHub').then((m) => ({ Component: m.DeckHub })) },
      { path: '/level/:level/flashcards', lazy: () => import('./pages/Flashcards').then((m) => ({ Component: m.Flashcards })) },
      { path: '/level/:level/kanji', lazy: () => import('./pages/Kanji').then((m) => ({ Component: m.Kanji })) },
      { path: '/level/:level/quiz', lazy: () => import('./pages/Quiz').then((m) => ({ Component: m.Quiz })) },
      { path: '/terms/:category', lazy: () => import('./pages/DeckHub').then((m) => ({ Component: m.DeckHub })) },
      { path: '/terms/:category/flashcards', lazy: () => import('./pages/Flashcards').then((m) => ({ Component: m.Flashcards })) },
      { path: '/terms/:category/quiz', lazy: () => import('./pages/Quiz').then((m) => ({ Component: m.Quiz })) },
      { path: '/review', lazy: () => import('./pages/Review').then((m) => ({ Component: m.Review })) },
      { path: '/progress', lazy: () => import('./pages/Progress').then((m) => ({ Component: m.Progress })) },
      { path: '*', lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.NotFound })) },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </StrictMode>,
)
