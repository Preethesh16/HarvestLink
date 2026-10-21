import { useId } from "react";
/** Original vector produce illustrations. No external images or network dependencies. */
export default function ProduceArt({ crop }: { crop: string }) {
  const id = useId().replaceAll(":", "");
  const name = crop.toLowerCase();
  const tomato = name.includes("tomato");
  const banana = name.includes("banana");
  const carrot = name.includes("carrot");
  return (
    <svg
      viewBox="0 0 480 250"
      className="produce-illustration"
      role="img"
      aria-label={`${crop} illustration`}
    >
      <defs>
        <radialGradient id={id + "red"} cx="32%" cy="24%" r="75%">
          <stop stopColor="#ffac71" />
          <stop offset=".3" stopColor="#f35b36" />
          <stop offset=".72" stopColor="#cd321e" />
          <stop offset="1" stopColor="#8e281e" />
        </radialGradient>
        <linearGradient id={id + "green"} x2="1" y2="1">
          <stop stopColor="#b6ce78" />
          <stop offset=".5" stopColor="#6c9850" />
          <stop offset="1" stopColor="#224f33" />
        </linearGradient>
        <linearGradient id={id + "gold"} x2=".4" y2="1">
          <stop stopColor="#ffe299" />
          <stop offset=".5" stopColor="#efb53d" />
          <stop offset="1" stopColor="#b1771b" />
        </linearGradient>
        <filter
          id={id + "shadow"}
          x="-50%"
          y="-100%"
          width="200%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <ellipse
        cx="250"
        cy="207"
        rx="111"
        ry="13"
        fill="#2b402d"
        opacity=".18"
        filter={`url(#${id}shadow)`}
      />
      {tomato ? (
        <>
          <g transform="translate(325 151) rotate(20)">
            <path
              d="M-4 38C-62 25-56-40-7-39C27-53 70-20 47 20C36 41 14 44-4 38"
              fill={`url(#${id}red)`}
            />
            <path
              d="M-2-35L-20-45L-11-25L-39-21L-14-15L-21 0L1-17L18-9L10-25L29-32L8-32L6-48Z"
              fill="#3c6835"
            />
            <path
              d="M-17-12Q-36-1-28 13"
              fill="none"
              stroke="#ffd0a1"
              strokeWidth="5"
              strokeLinecap="round"
              opacity=".5"
            />
          </g>
          <g transform="translate(211 126) rotate(-9)">
            <path
              d="M-14 78C-94 65-98-26-53-51C-29-65-12-53 1-53C23-67 58-58 76-37C119 13 81 80 37 84C13 88 5 77-14 78"
              fill={`url(#${id}red)`}
            />
            <path
              d="M-57-27C-77-5-76 13-67 28"
              fill="none"
              stroke="#ffcc9e"
              strokeWidth="8"
              strokeLinecap="round"
              opacity=".55"
            />
            <path
              d="M-8-47L-39-69L-23-40L-69-35L-31-24L-42-3L-8-26L10-8L10-30L48-21L26-42L45-58L9-49L9-73Z"
              fill="#456d36"
            />
            <path
              d="M2-42Q19-70 5-88"
              fill="none"
              stroke="#618342"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>
          <path
            d="M343 194Q372 155 411 164Q387 204 343 194"
            fill={`url(#${id}green)`}
          />
          <path d="M348 190L394 172" stroke="#c5d599" strokeWidth="2" />
        </>
      ) : banana ? (
        <g transform="rotate(-16 240 125)">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${160 + i * 23} 50Q${158 + i * 15} 156 ${330 + i * 8} 147Q${294 + i * 15} 236 ${204 + i * 10} 188Q${140 + i * 16} 148 ${150 + i * 22} 57Z`}
              fill={`url(#${id}gold)`}
              stroke="#ba8e2d"
              strokeWidth="2"
            />
          ))}
          <path d="M146 59L147 42L216 40L220 56" fill="#647544" />
        </g>
      ) : carrot ? (
        <g transform="rotate(37 240 125)">
          <path
            d="M205 65Q240 45 275 65L245 219Q237 230 232 215Z"
            fill={`url(#${id}gold)`}
          />
          {[-30, 0, 30].map((a) => (
            <path
              key={a}
              d="M240 66Q192 4 233 12Q258 18 240 66"
              fill={`url(#${id}green)`}
              transform={`rotate(${a} 240 66)`}
            />
          ))}
          <path
            d="M209 91L230 93M248 120L266 119M222 150L241 150"
            stroke="#c48b29"
            strokeWidth="3"
          />
        </g>
      ) : (
        <g transform="translate(240 131)">
          {[-60, -30, 0, 30, 60].map((a, i) => (
            <ellipse
              key={a}
              cx={0}
              cy={-14}
              rx={39}
              ry={77}
              transform={`rotate(${a})`}
              fill={`url(#${id}green)`}
              stroke="#426c40"
              strokeWidth="1.5"
            />
          ))}
          <path
            d="M0 68V-69M0 28L-48-10M0 12L46-25M0-17L-26-44"
            fill="none"
            stroke="#d0daa1"
            strokeWidth="3"
            opacity=".7"
          />
        </g>
      )}
      <g fill="none" stroke="#799265" opacity=".35">
        <path d="M65 177Q78 135 111 118M79 149Q52 143 62 130Q80 132 79 149M91 136Q91 111 109 114Q111 128 91 136" />
        <path d="M385 75h28M399 61v28" />
      </g>
    </svg>
  );
}
