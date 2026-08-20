import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 p-8 bg-red-900 text-white z-[99999] flex flex-col items-center justify-center overflow-auto">
          <h1 className="text-3xl font-bold mb-4">React Render Error!</h1>
          <pre className="bg-black p-4 rounded text-sm overflow-auto max-w-4xl w-full">
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-6 py-2 bg-white text-red-900 font-bold rounded-lg"
          >
            Обновить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
