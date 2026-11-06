import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Kana } from './pages/Kana'
import { DeckHub } from './pages/DeckHub'
import { Flashcards } from './pages/Flashcards'
import { Kanji } from './pages/Kanji'
import { Quiz } from './pages/Quiz'
import { Review } from './pages/Review'
import { Progress } from './pages/Progress'
import { NotFound } from './pages/NotFound'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/kana', element: <Kana /> },
      { path: '/level/:level', element: <DeckHub /> },
      { path: '/level/:level/flashcards', element: <Flashcards /> },
      { path: '/level/:level/kanji', element: <Kanji /> },
      { path: '/level/:level/quiz', element: <Quiz /> },
      { path: '/terms/:category', element: <DeckHub /> },
      { path: '/terms/:category/flashcards', element: <Flashcards /> },
      { path: '/terms/:category/quiz', element: <Quiz /> },
      { path: '/review', element: <Review /> },
      { path: '/progress', element: <Progress /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
