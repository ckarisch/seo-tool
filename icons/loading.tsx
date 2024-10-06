export const Loading = ({ width = 30, height = 30 }: { width?: number; height?: number }) => (
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
      r="40" 
      stroke="#e5e5e5" 
      strokeWidth="20" 
      fill="none" 
    />
    <circle 
      cx="50" 
      cy="50" 
      r="40" 
      stroke="rgb(231, 208, 124)" 
      strokeWidth="20" 
      fill="none" 
      strokeLinecap="round" 
      strokeDasharray="80,251.2"
    >
      <animateTransform 
        attributeName="transform" 
        type="rotate"
        dur="1s" 
        repeatCount="indefinite"
        from="0 50 50"
        to="360 50 50" 
      />
    </circle>
  </svg>
);