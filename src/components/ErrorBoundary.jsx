import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/** Mencegah layar kosong bila satu halaman bermasalah; tampilkan pesan & tombol muat ulang. */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertTriangle className="size-10 mx-auto text-brass-500" strokeWidth={1.5} />
        <h1 className="text-lg font-bold mt-3">Halaman ini mengalami kendala</h1>
        <p className="text-sm text-muted mt-1">Data Anda aman. Coba muat ulang halaman. Jika terus terjadi, kirimkan pesan berikut ke pengelola aplikasi:</p>
        <p className="text-xs font-mono bg-paper border border-line rounded-lg px-3 py-2 mt-3 break-all">{String(this.state.error?.message || this.state.error)}</p>
        <button onClick={() => window.location.reload()} className="mt-5 h-10 px-4 rounded-lg bg-brand-700 text-white text-sm font-semibold">Muat ulang</button>
      </div>
    );
  }
}
