export const AbstractSeo2 = () => <svg xmlns="http://www.w3.org/2000/svg" width={500} viewBox="0 0 400 300">
    <defs>
        <linearGradient id="screenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#2B2D42", stopOpacity: 0.05 }} />
            <stop offset="100%" style={{ stopColor: "#2B2D42", stopOpacity: 0.02 }} />
        </linearGradient>
        <filter id="frameDepth">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1" />
        </filter>
        {/* <!-- Symbol Definitions --> */}
        <path id="searchSymbol" d="M-6,-6 L6,6 M-6,6 L6,-6" stroke="#D4AF37" strokeWidth="2" fill="none" />
        <path id="rankSymbol" d="M-6,6 L0,-6 L6,6" stroke="#D4AF37" strokeWidth="2" fill="none" />
        <path id="contentSymbol" d="M-6,-6 h12 v12 h-12 z" stroke="#D4AF37" strokeWidth="2" fill="none" />
    </defs>

    {/* <!-- Enhanced screen frame --> */}
    <g filter="url(#frameDepth)">
        <rect x="40" y="30" width="320" height="220" rx="4" fill="#fafafa" stroke="#2B2D42" strokeWidth="1.5" />
        <rect x="40" y="30" width="320" height="20" rx="4" fill="#f0f0f0" stroke="#2B2D42" strokeWidth="1.5" />
        <circle cx="55" cy="40" r="3" fill="#D4AF37" opacity="0.5" />
        <circle cx="70" cy="40" r="3" fill="#2B2D42" opacity="0.3" />
        <text x="180" y="44" fontSize="10" fill="#2B2D42" opacity="0.5" text-anchor="middle">SEO Analysis</text>
    </g>

    {/* <!-- Screen content area --> */}
    <rect x="45" y="55" width="310" height="190" fill="url(#screenGlow)" />

    {/* <!-- Subtle grid --> */}
    <path d="M60 80 H340 M60 110 H340 M60 140 H340 M60 170 H340 M60 200 H340"
        stroke="#2B2D42" strokeWidth="0.2" opacity="0.05" />

    {/* <!-- Primary analysis circles --> */}
    <g>
        <circle cx="200" cy="140" r="70" fill="none" stroke="#D4AF37" strokeWidth="1.5">
            <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="10s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="140" r="55" fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" />
    </g>

    {/* <!-- Orbiting SEO elements --> */}
    <g>
        {/* <!-- Search Element --> */}
        <g>
            <animateMotion
                path="M200,140 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"
                dur="60s"
                repeatCount="indefinite">
            </animateMotion>
            <use href="#searchSymbol" />
            <text x="15" y="0" fontSize="8" fill="#D4AF37">SEARCH</text>
        </g>

        {/* <!-- Ranking Element --> */}
        <g>
            <animateMotion
                path="M200,140 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"
                dur="60s"
                begin="20s"
                repeatCount="indefinite">
            </animateMotion>
            <use href="#rankSymbol" />
            <text x="15" y="0" fontSize="8" fill="#D4AF37">RANK</text>
        </g>

        {/* <!-- Content Element --> */}
        <g>
            <animateMotion
                path="M200,140 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"
                dur="60s"
                begin="40s"
                repeatCount="indefinite">
            </animateMotion>
            <use href="#contentSymbol" />
            <text x="15" y="0" fontSize="8" fill="#D4AF37">CONTENT</text>
        </g>
    </g>

    {/* <!-- Central hub --> */}
    <g>
        <circle cx="200" cy="140" r="15" fill="none" stroke="#D4AF37" strokeWidth="1">
            <animate attributeName="r" values="15;16;15" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="140" r="8" fill="#D4AF37">
            <animate attributeName="r" values="8;8.5;8" dur="6s" repeatCount="indefinite" />
        </circle>
        <text x="200" y="142" fontSize="6" fill="#fafafa" text-anchor="middle">SEO</text>
    </g>

    {/* <!-- Connection lines --> */}
    <line x1="130" y1="140" x2="270" y2="140" stroke="#D4AF37" strokeWidth="0.5" opacity="0.2" />
    <line x1="200" y1="70" x2="200" y2="210" stroke="#D4AF37" strokeWidth="0.5" opacity="0.2" />

    {/* <!-- Status indicators --> */}
    <circle cx="320" cy="40" r="3" fill="#D4AF37">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
    </circle>

    {/* <!-- Data metrics --> */}
    <g opacity="0.5">
        <text x="60" y="70" fontSize="8" fill="#2B2D42">Metrics</text>
        <text x="320" y="70" fontSize="8" fill="#2B2D42" text-anchor="end">Analytics</text>
    </g>
</svg>