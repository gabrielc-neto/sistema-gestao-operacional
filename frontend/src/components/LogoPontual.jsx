export default function LogoPontual({ height = 36 }) {
  return (
    <svg
      height={height}
      viewBox="0 0 340 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="swoosh_grad" x1="0" y1="0" x2="340" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2d6a4f"/>
          <stop offset="20%"  stopColor="#3d9142"/>
          <stop offset="48%"  stopColor="#8ec63f"/>
          <stop offset="72%"  stopColor="#f5c318"/>
          <stop offset="100%" stopColor="#e8a800"/>
        </linearGradient>
      </defs>

      {/* traçado perspectiva — linha de sombra */}
      <path d="M14,66 L326,56 L326,60 L14,70 Z" fill="#0d2030" opacity="0.35"/>

      {/* traçado perspectiva — faixa colorida */}
      <path d="M14,62 L326,52 L326,68 Q260,73 180,71 Q90,69 14,75 Z" fill="url(#swoosh_grad)"/>

      {/* texto PONTUAL */}
      <text
        x="6"
        y="58"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontSize="60"
        fontWeight="900"
        fontStyle="italic"
        fill="white"
        letterSpacing="-1"
      >PONTUAL</text>
    </svg>
  );
}
