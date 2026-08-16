import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#121824] border border-red-500/30 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 text-2xl font-bold">
              !
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Session Error Detected</h2>
              <p className="text-sm text-slate-400 mt-2">
                {this.state.error?.message || "An unexpected client-side error occurred."}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/";
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer hover:from-amber-400 hover:to-yellow-300 transition-all"
              >
                Reset Session & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
