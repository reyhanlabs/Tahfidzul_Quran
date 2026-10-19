/** Ikon WhatsApp berwarna hijau (gelembung obrolan + gagang telepon). */
export default function WaIcon({ className = 'size-4', warna = '#25D366', terbalik = false }) {
  const [latar, gagang] = terbalik ? ['#fff', warna] : [warna, '#fff'];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill={latar} d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.4 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2Z" />
      <path fill={gagang} d="M9.1 7.3c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.8c.1.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-1.7-.8c-.3-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.9Z" />
    </svg>
  );
}
