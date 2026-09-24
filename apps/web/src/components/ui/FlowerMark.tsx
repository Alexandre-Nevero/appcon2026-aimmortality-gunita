export function FlowerMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="14" r="8" fill="#2B56C2" />
      <circle cx="14" cy="22" r="8" fill="#2B56C2" />
      <circle cx="34" cy="22" r="8" fill="#2B56C2" />
      <circle cx="17" cy="34" r="8" fill="#2B56C2" />
      <circle cx="31" cy="34" r="8" fill="#2B56C2" />
      <circle cx="24" cy="24" r="7" fill="#EB8A37" />
    </svg>
  );
}
