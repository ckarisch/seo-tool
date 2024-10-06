
export const Check = ({
  width = 30,
  height = 30
}: {
  width?: number;
  height?: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    width={width}
    height={height}
    style={{ display: 'inline-block' }}
  >
    <circle
      cx="50"
      cy="50"
      r="45"
      fill="none"
      stroke="rgb(34, 197, 94)"
      strokeWidth="8"
    >
      <animate
        attributeName="stroke-dasharray"
        from="0 283"
        to="283 283"
        dur="0.6s"
        fill="freeze"
      />
    </circle>
    <path
      d="M30 50 L45 65 L70 35"
      fill="none"
      stroke="rgb(34, 197, 94)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <animate
        attributeName="stroke-dasharray"
        from="0 60"
        to="60 60"
        dur="0.4s"
        fill="freeze"
        begin="0.6s"
      />
    </path>
  </svg>
);