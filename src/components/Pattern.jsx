/** Pola bintang delapan (khatam) — motif geometri yang akrab di lingkungan pesantren. */
export default function Pattern({ className, id = 'khatam', color = '#ffffff', opacity = 0.08 }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth="1.2">
            <rect x="14" y="14" width="28" height="28" />
            <rect x="14" y="14" width="28" height="28" transform="rotate(45 28 28)" />
            <circle cx="28" cy="28" r="6" />
            <path d="M0 0 L14 14 M56 0 L42 14 M0 56 L14 42 M56 56 L42 42" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
