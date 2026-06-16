import { useState } from "react";

/**
 * LoginPainel — painel visual do lado direito da tela de login.
 *
 * Modos de uso:
 *
 *  1) Foto institucional (PREFERIDO em produção):
 *     <LoginPainel src="/login-tanques.jpg" />
 *     - Coloca a foto em `frontend/public/login-tanques.jpg` (ou outro nome)
 *     - Aceita qualquer URL (relativa OU absoluta)
 *     - Se a imagem falhar (404, rede), cai automaticamente no SVG ilustrado
 *
 *  2) SVG ilustrado (fallback / dev sem foto):
 *     <LoginPainel />        // sem src → usa o SVG direto
 *     <LoginPainel src={null} />  // mesmo efeito
 *
 *  3) Forçar SVG mesmo tendo foto:
 *     <LoginPainel src="/login-tanques.jpg" forcarSvg />
 *
 * Props:
 *   - src          string  caminho/URL da foto (default: "/login-tanques.jpg")
 *   - alt          string  texto alternativo da foto
 *   - forcarSvg    bool    ignora a foto e usa SVG
 */
export default function LoginPainel({
  src       = "/login-tanques.jpg",
  alt       = "Tanques de armazenamento da Pontual Petróleo ao pôr-do-sol",
  forcarSvg = false,
}) {
  const [erro, setErro] = useState(false);
  const usarFoto = !!src && !forcarSvg && !erro;

  if (usarFoto) {
    // Cache-bust: garante que o browser sempre baixe a versão atual da foto
    // mesmo quando ela é trocada em /public sem mudar o nome do arquivo.
    const srcFinal = src.includes("?") ? src : `${src}?v=${ASSET_VERSION}`;
    return (
      <img
        src={srcFinal}
        alt={alt}
        onError={() => setErro(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return <PainelTanquesSvg />;
}

// Bump esse número quando trocar a foto em /public pra forçar refresh do browser.
const ASSET_VERSION = "20260615-1738";


/* ---------------- SVG ilustrado (fallback) ---------------- */
function PainelTanquesSvg() {
  return (
    <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"
         style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="lp_sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffb84d"/>
          <stop offset="35%"  stopColor="#ffc966"/>
          <stop offset="65%"  stopColor="#ffd97a"/>
          <stop offset="100%" stopColor="#fff0b0"/>
        </linearGradient>
        <radialGradient id="lp_sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"/>
          <stop offset="25%"  stopColor="#fff7c0" stopOpacity="0.95"/>
          <stop offset="65%"  stopColor="#ffd066" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#ffb14a" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="lp_tank" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#e0d8c0"/>
          <stop offset="35%"  stopColor="#fbfbfb"/>
          <stop offset="65%"  stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#c8c0a8"/>
        </linearGradient>
        <radialGradient id="lp_tankTop" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0%"   stopColor="#ffffff"/>
          <stop offset="70%"  stopColor="#eee5cc"/>
          <stop offset="100%" stopColor="#c5b899"/>
        </radialGradient>
        <linearGradient id="lp_ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#4a4030"/>
          <stop offset="100%" stopColor="#231d14"/>
        </linearGradient>
        <linearGradient id="lp_ySwoosh" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#f5c318"/>
          <stop offset="100%" stopColor="#fadb4a"/>
        </linearGradient>
      </defs>

      {/* céu */}
      <rect width="600" height="540" fill="url(#lp_sky)"/>

      {/* sol */}
      <circle cx="430" cy="160" r="240" fill="url(#lp_sun)"/>
      <circle cx="430" cy="160" r="48"  fill="#ffffff" opacity="0.95"/>
      <circle cx="430" cy="160" r="28"  fill="#ffffff"/>

      {/* horizonte */}
      <g fill="#3a2e1c" opacity="0.85">
        <rect x="0"   y="455" width="80" height="35"/>
        <rect x="80"  y="445" width="40" height="45"/>
        <rect x="120" y="450" width="60" height="40"/>
        <rect x="180" y="440" width="35" height="50"/>
        <rect x="215" y="455" width="40" height="35"/>
        <rect x="510" y="445" width="60" height="45"/>
        <rect x="570" y="455" width="30" height="35"/>
      </g>
      <g fill="#2b2410" opacity="0.7">
        <ellipse cx="265" cy="470" rx="15" ry="10"/>
        <ellipse cx="290" cy="475" rx="10" ry="8"/>
        <ellipse cx="495" cy="472" rx="12" ry="9"/>
      </g>

      {/* torre */}
      <g stroke="#1a1305" strokeWidth="2" fill="#1a1305" opacity="0.9">
        <line x1="340" y1="120" x2="340" y2="490"/>
        <line x1="332" y1="490" x2="340" y2="120"/>
        <line x1="348" y1="490" x2="340" y2="120"/>
        <line x1="325" y1="490" x2="340" y2="200"/>
        <line x1="355" y1="490" x2="340" y2="200"/>
        <line x1="332" y1="180" x2="348" y2="180" strokeWidth="2"/>
        <line x1="330" y1="220" x2="350" y2="220" strokeWidth="2"/>
        <line x1="328" y1="260" x2="352" y2="260" strokeWidth="2"/>
        <line x1="326" y1="310" x2="354" y2="310" strokeWidth="2"/>
        <line x1="323" y1="370" x2="357" y2="370" strokeWidth="2"/>
        <line x1="320" y1="430" x2="360" y2="430" strokeWidth="2"/>
        <line x1="340" y1="120" x2="340" y2="95" strokeWidth="1.5"/>
        <circle cx="340" cy="92" r="3" fill="#1a1305"/>
      </g>

      {/* chão */}
      <rect y="500" width="600" height="250" fill="url(#lp_ground)"/>
      <line x1="0" y1="500" x2="600" y2="500" stroke="#241d10" strokeWidth="2"/>

      {/* piscina de contenção */}
      <rect x="50" y="540" width="500" height="170" fill="#1a1408" stroke="#5a4a30" strokeWidth="2"/>
      <rect x="50" y="540" width="500" height="6"   fill="#f5c318" opacity="0.55"/>
      <rect x="50" y="704" width="500" height="6"   fill="#f5c318" opacity="0.55"/>

      {/* tanque traseiro central */}
      <g>
        <ellipse cx="300" cy="395" rx="125" ry="22" fill="url(#lp_tankTop)"/>
        <path d="M175,395 L175,605 Q175,615 200,618 L400,618 Q425,615 425,605 L425,395 Z" fill="url(#lp_tank)"/>
        <ellipse cx="300" cy="618" rx="125" ry="14" fill="#998a6a"/>
        <rect x="175" y="475" width="250" height="85" fill="#1a3a8c"/>
        <path d="M175,548 Q300,538 425,548 L425,562 Q300,553 175,562 Z" fill="url(#lp_ySwoosh)"/>
        <path d="M175,544 Q300,536 425,544 L425,548 Q300,540 175,548 Z" fill="#0d1f4a"/>
        <text x="300" y="525" textAnchor="middle" fontFamily="'Arial Black', sans-serif"
              fontStyle="italic" fontWeight="900" fontSize="40" fill="#ffffff"
              letterSpacing="-1">PONTUAL</text>
      </g>

      {/* tanque frontal esquerdo */}
      <g>
        <ellipse cx="170" cy="475" rx="110" ry="20" fill="url(#lp_tankTop)"/>
        <path d="M60,475 L60,685 Q60,700 90,705 L250,705 Q280,700 280,685 L280,475 Z" fill="url(#lp_tank)"/>
        <ellipse cx="170" cy="705" rx="110" ry="13" fill="#998a6a"/>
        <rect x="60" y="565" width="220" height="78" fill="#1a3a8c"/>
        <path d="M60,632 Q170,623 280,632 L280,646 Q170,637 60,646 Z" fill="url(#lp_ySwoosh)"/>
        <path d="M60,628 Q170,621 280,628 L280,632 Q170,625 60,632 Z" fill="#0d1f4a"/>
        <text x="170" y="612" textAnchor="middle" fontFamily="'Arial Black', sans-serif"
              fontStyle="italic" fontWeight="900" fontSize="38" fill="#ffffff"
              letterSpacing="-1">PONTUAL</text>
        <g stroke="#3a3220" strokeWidth="1.5" fill="none" opacity="0.85">
          <line x1="280" y1="490" x2="280" y2="700"/>
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1="272" y1={500 + i*20} x2="280" y2={500 + i*20}/>
          ))}
        </g>
      </g>

      {/* tanque frontal direito */}
      <g>
        <ellipse cx="430" cy="475" rx="110" ry="20" fill="url(#lp_tankTop)"/>
        <path d="M320,475 L320,685 Q320,700 350,705 L510,705 Q540,700 540,685 L540,475 Z" fill="url(#lp_tank)"/>
        <ellipse cx="430" cy="705" rx="110" ry="13" fill="#998a6a"/>
        <rect x="320" y="565" width="220" height="78" fill="#1a3a8c"/>
        <path d="M320,632 Q430,623 540,632 L540,646 Q430,637 320,646 Z" fill="url(#lp_ySwoosh)"/>
        <path d="M320,628 Q430,621 540,628 L540,632 Q430,625 320,632 Z" fill="#0d1f4a"/>
        <text x="430" y="612" textAnchor="middle" fontFamily="'Arial Black', sans-serif"
              fontStyle="italic" fontWeight="900" fontSize="38" fill="#ffffff"
              letterSpacing="-1">PONTUAL</text>
        <g stroke="#3a3220" strokeWidth="1.5" fill="none" opacity="0.85">
          <line x1="320" y1="490" x2="320" y2="700"/>
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1="320" y1={500 + i*20} x2="328" y2={500 + i*20}/>
          ))}
        </g>
      </g>

      {/* tubulações */}
      <g stroke="#3a2e1c" strokeWidth="3" fill="none" opacity="0.9">
        <line x1="280" y1="690" x2="320" y2="690"/>
        <line x1="280" y1="700" x2="320" y2="700"/>
      </g>

      {/* reflexos dourados */}
      <path d="M60,485 Q170,460 280,485"  stroke="#ffd97a" strokeWidth="5" opacity="0.65" fill="none"/>
      <path d="M320,485 Q430,460 540,485" stroke="#ffd97a" strokeWidth="5" opacity="0.65" fill="none"/>
      <path d="M175,405 Q300,380 425,405" stroke="#fff0b0" strokeWidth="5" opacity="0.55" fill="none"/>
    </svg>
  );
}
