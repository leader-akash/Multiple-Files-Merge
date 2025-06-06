// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-600 p-8">
          Something went wrong. Please try again later.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;