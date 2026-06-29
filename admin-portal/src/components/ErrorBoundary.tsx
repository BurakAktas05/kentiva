import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const SHOW_ERROR_DETAILS = import.meta.env.DEV;

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bir Şeyler Ters Gitti</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Sayfa yüklenirken veya çalışırken beklenmeyen bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.
              </p>
            </div>

            {SHOW_ERROR_DETAILS && this.state.error && (
              <pre className="text-left text-xs bg-slate-100 dark:bg-slate-950 p-4 rounded-xl text-slate-600 dark:text-slate-400 overflow-auto max-h-40 border border-slate-200/50 dark:border-slate-800/50">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl py-3.5 shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              Yeniden Yükle
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
