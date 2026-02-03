interface ChellIconProps {
  className?: string;
}

export function ChellIcon({ className }: ChellIconProps) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Terminal prompt > on the left */}
      <path
        d="M3 11L9 16L3 21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 4 nodes forming a C shape */}
      <circle cx="26" cy="7" r="3" fill="currentColor" />
      <circle cx="18" cy="11" r="3" fill="currentColor" />
      <circle cx="18" cy="21" r="3" fill="currentColor" />
      <circle cx="26" cy="25" r="3" fill="currentColor" />
    </svg>
  );
}
