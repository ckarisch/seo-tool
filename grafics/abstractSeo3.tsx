export const AbstractSeo3 = () => <svg xmlns="http://www.w3.org/2000/svg" width={500} viewBox="0 0 400 300">
    <defs>
        <linearGradient id="screenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#2B2D42", stopOpacity: 0.05 }} />
            <stop offset="100%" style={{ stopColor: "#2B2D42", stopOpacity: 0.02 }} />
        </linearGradient>
        <filter id="frameDepth">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1"/>
        </filter>
    </defs>

    
    <g filter="url(#frameDepth)">
        <rect x="40" y="30" width="320" height="220" rx="4" fill="#fafafa" stroke="#2B2D42" stroke-width="1.5">
            <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
        </rect>
        <rect x="40" y="30" width="320" height="20" rx="4" fill="#f0f0f0" stroke="#2B2D42" stroke-width="1.5"/>
        <circle cx="55" cy="40" r="3" fill="#D4AF37" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="70" cy="40" r="3" fill="#2B2D42" opacity="0.3"/>
    </g>

    
    <rect x="45" y="55" width="310" height="190" fill="url(#screenGlow)">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite"/>
    </rect>

    
    <g transform="translate(70, 65)">
        
        <rect x="0" y="0" width="120" height="120" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5" opacity="0.8">
            <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite"/>
        </rect>
        
        
        <rect x="0" y="0" width="120" height="30" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5" opacity="0.8"/>
        <rect x="10" y="10" width="60" height="10" fill="#D4AF37" opacity="0.2">
            <animate attributeName="width" values="60;65;60" dur="2s" repeatCount="indefinite"/>
        </rect>
        
        
        <g transform="translate(0, 35)">
            <rect width="120" height="15" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5" opacity="0.5"/>
            <rect x="10" y="5" width="15" height="5" fill="#D4AF37" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite"/>
            </rect>
            <rect x="35" y="5" width="15" height="5" fill="#D4AF37" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" begin="0.5s" repeatCount="indefinite"/>
            </rect>
            <rect x="60" y="5" width="15" height="5" fill="#D4AF37" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" begin="1s" repeatCount="indefinite"/>
            </rect>
        </g>

        
        <g transform="translate(0, 55)">
            <rect width="120" height="60" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5" opacity="0.3"/>
            <rect x="10" y="10" width="100" height="5" fill="#D4AF37" opacity="0.2">
                <animate attributeName="width" values="100;95;100" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="10" y="20" width="80" height="5" fill="#D4AF37" opacity="0.2">
                <animate attributeName="width" values="80;85;80" dur="3s" begin="0.5s" repeatCount="indefinite"/>
            </rect>
            <rect x="10" y="30" width="90" height="5" fill="#D4AF37" opacity="0.2">
                <animate attributeName="width" values="90;85;90" dur="3s" begin="1s" repeatCount="indefinite"/>
            </rect>
        </g>
    </g>

    
    <g transform="translate(210, 65)">
        
        <rect x="20" y="0" width="80" height="12" fill="#D4AF37" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="4s" repeatCount="indefinite"/>
        </rect>
        
        
        <g transform="translate(0, 20)">
            
            <line x1="20" y1="100" x2="20" y2="20" stroke="#D4AF37" stroke-width="1.5"/>
            <g opacity="0.6">
                <line x1="18" y1="90" x2="22" y2="90" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="18" y1="70" x2="22" y2="70" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="18" y1="50" x2="22" y2="50" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="18" y1="30" x2="22" y2="30" stroke="#D4AF37" stroke-width="1.5"/>
            </g>

            
            <line x1="20" y1="100" x2="120" y2="100" stroke="#D4AF37" stroke-width="1.5"/>
            <g opacity="0.6">
                <line x1="40" y1="98" x2="40" y2="102" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="60" y1="98" x2="60" y2="102" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="80" y1="98" x2="80" y2="102" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="100" y1="98" x2="100" y2="102" stroke="#D4AF37" stroke-width="1.5"/>
            </g>

            
            <path d="M20,90 L40,85 L60,70 L80,50 L100,35" 
                  fill="none" 
                  stroke="#D4AF37" 
                  stroke-width="1.5"
                  opacity="0.6">
                <animate attributeName="d" 
                         values="M20,90 L40,85 L60,70 L80,50 L100,35;
                                M20,88 L40,83 L60,68 L80,48 L100,33;
                                M20,90 L40,85 L60,70 L80,50 L100,35"
                         dur="8s"
                         repeatCount="indefinite"/>
            </path>
            
            
            <circle cx="40" cy="85" r="2" fill="#D4AF37" opacity="0.8">
                <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="60" cy="70" r="2" fill="#D4AF37" opacity="0.8">
                <animate attributeName="r" values="2;3;2" dur="2s" begin="0.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="80" cy="50" r="2" fill="#D4AF37" opacity="0.8">
                <animate attributeName="r" values="2;3;2" dur="2s" begin="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx="100" cy="35" r="2" fill="#D4AF37" opacity="0.8">
                <animate attributeName="r" values="2;3;2" dur="2s" begin="1.5s" repeatCount="indefinite"/>
            </circle>
        </g>

        
        <g transform="translate(20, 130)">
            
            <rect x="0" y="0" width="100" height="10" fill="#D4AF37" opacity="0.1"/>
            <rect x="5" y="3" width="20" height="4" fill="#D4AF37" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="35" y="3" width="20" height="4" fill="#D4AF37" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" begin="1s" repeatCount="indefinite"/>
            </rect>
            <rect x="65" y="3" width="20" height="4" fill="#D4AF37" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" begin="2s" repeatCount="indefinite"/>
            </rect>
            
            
            <g opacity="0.6">
                
                <g>
                    <animate attributeName="opacity" values="0.5;0.7;0.5" dur="4s" repeatCount="indefinite"/>
                </g>
                
                <rect x="0" y="15" width="100" height="8" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5"/>
                <rect x="5" y="17" width="15" height="4" fill="#D4AF37" opacity="0.4"/>
                <rect x="35" y="17" width="25" height="4" fill="#D4AF37" opacity="0.4"/>
                <rect x="65" y="17" width="20" height="4" fill="#D4AF37" opacity="0.4"/>
                
                
                <rect x="0" y="28" width="100" height="8" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5"/>
                <rect x="5" y="30" width="20" height="4" fill="#D4AF37" opacity="0.4"/>
                <rect x="35" y="30" width="15" height="4" fill="#D4AF37" opacity="0.4"/>
                <rect x="65" y="30" width="25" height="4" fill="#D4AF37" opacity="0.4"/>
                
                
                <rect x="0" y="41" width="100" height="8" fill="#f5f5f5" stroke="#D4AF37" stroke-width="1.5"/>
                <rect x="5" y="43" width="15" height="4" fill="#D4AF37" opacity="0.4"/>
                <rect x="35" y="43" width="20" height="4" fill="#D4AF37" opacity="0.4"/>
                <rect x="65" y="43" width="15" height="4" fill="#D4AF37" opacity="0.4"/>
            </g>
        </g>
    </g>

    
    <g transform="translate(70, 190)">
        
        <text x="0" y="10" font-size="6" fill="#2B2D42" opacity="0.7">SEO</text>
        <text x="40" y="10" font-size="6" fill="#2B2D42" opacity="0.7">Speed</text>
        <text x="80" y="10" font-size="6" fill="#2B2D42" opacity="0.7">Mobile</text>

        
        <g transform="translate(0, 15)">
            
            <rect x="0" y="0" width="30" height="8" fill="#D4AF37" opacity="0.8">
                <animate attributeName="width" values="30;32;30" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="0" y="12" width="25" height="8" fill="#D4AF37" opacity="0.6">
                <animate attributeName="width" values="25;27;25" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="0" y="24" width="20" height="8" fill="#D4AF37" opacity="0.4">
                <animate attributeName="width" values="20;22;20" dur="3s" repeatCount="indefinite"/>
            </rect>

            
            <rect x="40" y="0" width="28" height="8" fill="#D4AF37" opacity="0.7">
                <animate attributeName="width" values="28;30;28" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="40" y="12" width="30" height="8" fill="#D4AF37" opacity="0.8">
                <animate attributeName="width" values="30;32;30" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="40" y="24" width="22" height="8" fill="#D4AF37" opacity="0.5">
                <animate attributeName="width" values="22;24;22" dur="3s" repeatCount="indefinite"/>
            </rect>

            
            <rect x="80" y="0" width="25" height="8" fill="#D4AF37" opacity="0.6">
                <animate attributeName="width" values="25;27;25" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="80" y="12" width="28" height="8" fill="#D4AF37" opacity="0.7">
                <animate attributeName="width" values="28;30;28" dur="3s" repeatCount="indefinite"/>
            </rect>
            <rect x="80" y="24" width="30" height="8" fill="#D4AF37" opacity="0.8">
                <animate attributeName="width" values="30;32;30" dur="3s" repeatCount="indefinite"/>
            </rect>
        </g>
    </g>
    
    <circle cx="320" cy="40" r="3" fill="#D4AF37">
        <animate attributeName="opacity" 
                 values="0.7;1;0.7" 
                 dur="4s"
                 repeatCount="indefinite"/>
    </circle>
</svg>
