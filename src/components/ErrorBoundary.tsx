// Si algo dentro falla (por ejemplo el 3D), muestra `fallback` en vez de dejar la pantalla en blanco.
import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  onError?: () => void;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Fallo en la escena 3D, se usa el tablero 2D:', error);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
