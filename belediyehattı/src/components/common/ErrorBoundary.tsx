import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FileText } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error('[ErrorBoundary] Unhandled runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isDark = document.documentElement.classList.contains('dark');
      
      return (
        <div className={`min-h-screen flex items-center justify-center p-5 font-sans ${
          isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}>
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-xl ${
            isDark 
              ? 'border-slate-800 bg-slate-900/90 backdrop-blur-md' 
              : 'border-slate-200/80 bg-white/90 backdrop-blur-md'
          }`}>
            <div className="flex flex-col items-center text-center">
              <div className={`p-4 rounded-full mb-4 ${
                isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'
              }`}>
                <AlertTriangle className="w-12 h-12" />
              </div>

              <h2 className="text-xl font-bold tracking-tight mb-2">
                Bir Şeyler Ters Gitti
              </h2>
              
              <p className={`text-sm mb-6 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Uygulama beklenmedik bir hata ile karşılaştı. Lütfen sayfayı yenilemeyi deneyin. Sorunun devam etmesi halinde destek ekibimizle iletişime geçebilirsiniz.
              </p>

              <div className="flex flex-col w-full gap-2.5">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-lg shadow-primary/25"
                >
                  <RefreshCw className="w-4 h-4" />
                  Yeniden Dene
                </button>

                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all border ${
                    isDark 
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800/50' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {this.state.showDetails ? 'Detayları Gizle' : 'Hata Detaylarını Göster'}
                </button>
              </div>

              {this.state.showDetails && (
                <div className={`mt-5 w-full text-left rounded-xl p-4 text-xs font-mono overflow-auto max-h-48 border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-red-400' : 'bg-slate-100 border-slate-200 text-red-600'
                }`}>
                  <p className="font-bold mb-1">{this.state.error?.toString()}</p>
                  <pre className="whitespace-pre-wrap text-[10px] opacity-80">
                    {this.state.errorInfo?.componentStack || 'Yığın bilgisi yok.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
