import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from './Pressable'

/** Lỗi trong vùng nội dung: luôn có chữ và nút, không bao giờ để trắng. */
export function ErrorPanel({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : ''
  return (
    <div role="alert" data-error-panel className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
      <h1 className="text-lg font-bold">Trang này gặp lỗi</h1>
      <p className="mt-2 text-sm text-muted">Có thể do mạng chập chờn hoặc ứng dụng vừa được cập nhật. Tải lại thường là đủ.</p>
      {detail && <p className="mt-3 truncate font-mono text-xs text-muted">{detail}</p>}
      <div className="mt-5 flex justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} className="min-h-11 rounded-lg border border-line px-5 font-semibold">
            Thử lại
          </Button>
        )}
        <Button onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-beni px-5 font-semibold text-on-ai">
          Tải lại
        </Button>
      </div>
    </div>
  )
}

/** Lỗi khi tải chunk của trang (lazy) hoặc khi render trang: hiện trong vùng main, sidebar vẫn còn. */
export function RouteError() {
  return <ErrorPanel error={useRouteError()} />
}

/** Chốt chặn cuối quanh vùng main (lỗi mà router không bắt): đổi trang thì tự đặt lại. */
export class MainErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: unknown; key: string }> {
  state = { error: null as unknown, key: this.props.resetKey }

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? new Error('Lỗi không rõ') }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: unknown; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Lỗi vùng nội dung:', error, info.componentStack)
  }

  render() {
    return this.state.error ? <ErrorPanel error={this.state.error} onRetry={() => this.setState({ error: null })} /> : this.props.children
  }
}
