import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by Dronacharya ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {this.props.fallbackTitle || "Application Recovery"}
            </h2>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Dronacharya encountered an unexpected visual rendering state. You can restore your active session or reset with zero data loss.
            </p>

            {this.state.error && (
              <div className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 mb-6 text-left overflow-x-auto max-h-32">
                <p className="font-mono text-[11px] text-rose-300 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reset Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
