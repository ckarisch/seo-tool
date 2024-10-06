
export const Warning = ({ width = 30, height = 30 }: { width?: number; height?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 100 100"
    width={width}
    height={height}
    style={{ display: 'inline-block' }}
  >
    <path 
      d="M50 15 L85 80 L15 80 Z" 
      fill="none" 
      stroke="rgb(234, 179, 8)" 
      strokeWidth="8" 
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <animate 
        attributeName="stroke-dasharray" 
        from="0 240" 
        to="240 240"
        dur="0.6s" 
        fill="freeze"
      />
    </path>
    <path 
      d="M50 40 L50 60 M50 70 L50 70.1" 
      stroke="rgb(234, 179, 8)" 
      strokeWidth="8" 
      strokeLinecap="round"
    >
      <animate 
        attributeName="stroke-dasharray" 
        from="0 32" 
        to="32 32"
        dur="0.3s"
        fill="freeze"
        begin="0.6s"
      />
    </path>
  </svg>
);