export function JourneyArt() {
  return (
    <div className="journey-art">
      <svg
        viewBox="0 0 660 555"
        role="img"
        aria-label="An orange bus travelling through the green hills of Sri Lanka"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sky" x2="0" y2="1">
            <stop stopColor="#e9eee1" />
            <stop offset="1" stopColor="#f5edda" />
          </linearGradient>
          <linearGradient id="bus" x2="0" y2="1">
            <stop stopColor="#f19a55" />
            <stop offset="1" stopColor="#dd7138" />
          </linearGradient>
          <clipPath id="scene">
            <path d="M64 276C64 128 180 28 340 28S604 136 604 287V499H64Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#scene)">
          <path fill="url(#sky)" d="M0 0h660v555H0z" />
          <circle cx="476" cy="119" r="43" fill="#edc476" />
          <path
            d="m-30 360 170-208 81 95 108-158 126 172 74-80 170 182v200H0"
            fill="#b9c9ab"
          />
          <path
            d="m122 281 99-34 108-158 52 107-57-31-48 89-55 40z"
            fill="#d2d9bc"
          />
          <path
            d="M-20 381q95-170 241-43 102-134 236-56 136-90 248 48v230H0"
            fill="#87a889"
          />
          <path
            d="M-40 370Q141 252 314 418 440 295 687 333v230H0"
            fill="#577d65"
          />
          <path d="M-5 451q175-77 358-24 104-57 331-16v150H0" fill="#365c4e" />
          <path
            d="M358 368q-145 50 14 99t-43 135"
            fill="none"
            stroke="#e4d8bc"
            strokeWidth="76"
          />
          <path
            d="M358 368q-145 50 14 99t-43 135"
            fill="none"
            stroke="#fff9e9"
            strokeWidth="2"
            strokeDasharray="15 14"
          />
          <g fill="#294f40">
            <path d="m550 258-32 71h20l-33 62h84l-34-62h23z" />
            <path d="m108 287-25 55h15l-26 51h71l-29-51h18z" />
          </g>
          <g fill="none" stroke="#aec29c" strokeWidth="2" opacity=".7">
            <path d="M71 399q73-36 138 1M76 410q73-36 138 1M81 421q73-36 138 1M452 412q65-28 133-5M452 423q65-28 133-5" />
          </g>
        </g>
        <ellipse
          cx="331"
          cy="460"
          rx="163"
          ry="20"
          fill="#1c3b30"
          opacity=".2"
        />
        <g transform="translate(123 262) rotate(-5 190 95)">
          <path
            d="M20 34q0-25 25-25h279q20 0 29 24l24 64v67H20z"
            fill="url(#bus)"
            stroke="#ba6032"
            strokeWidth="2"
          />
          <path d="M39 24h272q18 0 23 18l17 53H39z" fill="#274b44" />
          <path d="m294 24 17 71h40l-17-53q-5-18-23-18z" fill="#40675e" />
          <path
            d="M104 25v69m64-69v69m65-69v69m55-69v69"
            stroke="#ed9c60"
            strokeWidth="8"
          />
          <path
            d="m52 28 31 59m63-59 30 59m62-59 25 59"
            stroke="#90aaa0"
            strokeWidth="13"
            opacity=".25"
          />
          <path d="M23 107h266" stroke="#f8cd92" strokeWidth="5" />
          <path d="M291 104h43v60h-43z" fill="#b96034" />
          <path d="M297 111h31v28h-31z" fill="#37584f" />
          <path d="M31 151h340v14H31" fill="#f1b375" />
          <rect x="14" y="149" width="25" height="14" rx="4" fill="#2d493f" />
          <rect x="350" y="132" width="25" height="11" rx="4" fill="#fff0bc" />
          <path
            d="m354 52 23-1v38"
            stroke="#29483d"
            strokeWidth="6"
            fill="none"
          />
          <rect x="370" y="57" width="13" height="27" rx="4" fill="#29483d" />
          <g fill="#263e35" stroke="#d6753d" strokeWidth="5">
            <circle cx="88" cy="162" r="31" />
            <circle cx="310" cy="162" r="31" />
          </g>
          <g fill="#94a398" stroke="#e0e0c9" strokeWidth="4">
            <circle cx="88" cy="162" r="14" />
            <circle cx="310" cy="162" r="14" />
          </g>
          <text
            x="132"
            y="139"
            fill="#fff7e4"
            fontFamily="Arial,sans-serif"
            fontWeight="700"
            fontSize="20"
          >
            way to home.
          </text>
          <path
            d="M48 6h253"
            stroke="#38594b"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
        <g fill="#faf8f0">
          <path d="M108 109q8-17 22-6 9-26 31-10 24-4 27 16z" />
          <path d="M379 74q8-14 19-7 9-20 27-10 19-1 24 17z" />
        </g>
        <path
          d="m388 153 8-5 8 5m13-12 8-5 8 5"
          fill="none"
          stroke="#4f715c"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div className="art-note">
        <span className="live-dot" />
        <span>
          Next stop?<strong>Somewhere that feels like home.</strong>
        </span>
      </div>
      <div className="art-stamp">
        THE SCENIC ROUTE
        <br />
        <span>is always worth it ↗</span>
      </div>
    </div>
  );
}
