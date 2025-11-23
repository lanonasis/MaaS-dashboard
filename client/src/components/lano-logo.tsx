export function LanoLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* L */}
      <path
        d="M4 3v14h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 0 */}
      <ellipse cx="16" cy="10" rx="4" ry="5.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
