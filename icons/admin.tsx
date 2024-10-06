export const Admin = ({ width = 30, height = 30 }: { width?: number; height?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 100 100"
    width={width}
    height={height}
    style={{ display: 'inline-block' }}
  >
    <path 
      d="M15 65 L30 35 L50 50 L70 35 L85 65 L15 65 Z" 
      fill="none" 
      stroke="rgb(147, 51, 234)" 
      strokeWidth="8" 
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <animate 
        attributeName="stroke-dasharray" 
        from="0 200" 
        to="200 200"
        dur="0.6s" 
        fill="freeze"
      />
    </path>
    <path 
      d="M25 65 L75 65" 
      stroke="rgb(147, 51, 234)" 
      strokeWidth="8" 
      strokeLinecap="round"
    >
      <animate 
        attributeName="stroke-dasharray" 
        from="0 50" 
        to="50 50"
        dur="0.3s"
        fill="freeze"
        begin="0.6s"
      />
    </path>
  </svg>
);