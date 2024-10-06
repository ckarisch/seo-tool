
export const Cross = ({ width = 30, height = 30 }: { width?: number; height?: number }) => (
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
      stroke="rgb(239, 68, 68)" 
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
      d="M35 35 L65 65 M65 35 L35 65" 
      fill="none" 
      stroke="rgb(239, 68, 68)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <animate 
        attributeName="stroke-dasharray" 
        from="0 90" 
        to="90 90"
        dur="0.4s"
        fill="freeze"
        begin="0.6s"
      />
    </path>
  </svg>
);