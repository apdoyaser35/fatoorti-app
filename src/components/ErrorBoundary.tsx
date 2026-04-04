import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'حدث خطأ غير متوقع في التطبيق';
      let errorDetail = '';

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = 'خطأ في قاعدة البيانات: صلاحيات غير كافية';
            errorDetail = `العملية: ${parsed.operationType}, المسار: ${parsed.path}`;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="text-destructive" size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">{errorMessage}</h2>
              {errorDetail && <p className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded-lg">{errorDetail}</p>}
              <p className="text-gray-500">يرجى المحاولة مرة أخرى أو التواصل مع المسؤول</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCcw size={20} />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
