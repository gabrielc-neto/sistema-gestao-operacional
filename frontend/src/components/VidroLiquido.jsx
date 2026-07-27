// Efeito "liquid glass" — refração de verdade, não só desfoque.
//
// Técnica de https://kube.io/blog/liquid-glass-css-svg/: um mapa de deslocamento
// codifica, em RGB, para onde cada pixel do fundo deve ser puxado. O filtro SVG
// aplica esse mapa com feDisplacementMap, e o CSS o usa como backdrop-filter.
//
// ⚠️ SÓ FUNCIONA NO CHROME. Filtro SVG como backdrop-filter não é suportado por
// Safari nem Firefox — é limitação deles, não do código. Nesses navegadores o
// @supports do intranet.css não casa e fica o glassmorphism de sempre (blur), que
// é o que havia antes. Ninguém vê tela quebrada; vê a versão anterior.
//
// A FÍSICA (do artigo):
//   1. A borda do vidro é um squircle convexo: y = ⁴√(1 - (1-x)⁴).
//      É o perfil que a Apple usa — transição suave do plano para a curva.
//   2. A derivada dessa altura dá a inclinação da superfície, e daí a normal.
//   3. Snell-Descartes (n₁sen θ₁ = n₂sen θ₂, ar=1, vidro=1.5) dá quanto o raio
//      entorta ao atravessar.
//   4. O desvio vira deslocamento em pixels, na direção da normal da borda.
//
// O mapa é gerado uma vez por tamanho, num canvas, e vira data URL. Regerar é
// caro (o artigo alerta); por isso os cards compartilham um filtro só — todos têm
// o mesmo tamanho na grade.

import { useEffect, useRef, useState } from "react";

const N_AR = 1.0;    // índice de refração do ar
const N_VIDRO = 1.5; // do vidro

// Altura da superfície do squircle convexo. x=0 na borda, x=1 no fim do bisel.
const altura = (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25);

// Derivada numérica — aproxima a normal da superfície naquele ponto.
function inclinacao(x) {
  const d = 0.001;
  const a = altura(Math.min(1, x + d));
  const b = altura(Math.max(0, x - d));
  return (a - b) / (2 * d);
}

// Quanto o raio se desloca ao atravessar o vidro, em unidades de espessura.
// Raio incidente ortogonal: o ângulo com a normal é atan(inclinação).
function desvio(x) {
  const t1 = Math.atan(inclinacao(x));
  const seno2 = Math.sin(t1) * (N_AR / N_VIDRO);
  if (Math.abs(seno2) > 1) return 0;      // reflexão total: não refrata
  const t2 = Math.asin(seno2);
  return Math.tan(t1 - t2);
}

// Distância com sinal até a borda de um retângulo arredondado (SDF).
// Negativa dentro, positiva fora, zero na borda.
function sdf(px, py, meiaL, meiaA, raio) {
  const qx = Math.abs(px) - meiaL + raio;
  const qy = Math.abs(py) - meiaA + raio;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - raio;
}

/**
 * Gera o mapa de deslocamento como data URL.
 *   R = deslocamento em X, G = em Y. 128 = neutro (o feDisplacementMap trata
 *   0 → -escala, 128 → 0, 255 → +escala).
 */
function gerarMapa(largura, altura_, raio, bisel) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(largura));
  cv.height = Math.max(1, Math.round(altura_));
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const img = ctx.createImageData(cv.width, cv.height);

  const meiaL = cv.width / 2;
  const meiaA = cv.height / 2;
  const r = Math.min(raio, meiaL, meiaA);

  // Normaliza pelo maior desvio, para caber no intervalo fixo de 8 bits — é o que
  // o artigo chama de "normalize so that the maximum magnitude is 1".
  let maxDesvio = 0;
  for (let i = 0; i <= 64; i++) maxDesvio = Math.max(maxDesvio, Math.abs(desvio(i / 64)));
  if (maxDesvio === 0) maxDesvio = 1;

  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      const px = x - meiaL + 0.5;
      const py = y - meiaA + 0.5;
      const d = sdf(px, py, meiaL, meiaA, r);

      let dx = 0;
      let dy = 0;
      // Só a faixa do bisel refrata; o miolo do vidro é plano e não entorta luz.
      if (d < 0 && -d < bisel) {
        const u = 1 - (-d) / bisel;          // 1 na borda, 0 no fim do bisel
        const mag = desvio(1 - u) / maxDesvio;

        // Gradiente do SDF = direção normal à borda.
        const e = 1;
        const gx = (sdf(px + e, py, meiaL, meiaA, r) - sdf(px - e, py, meiaL, meiaA, r)) / (2 * e);
        const gy = (sdf(px, py + e, meiaL, meiaA, r) - sdf(px, py - e, meiaL, meiaA, r)) / (2 * e);
        const norma = Math.hypot(gx, gy) || 1;

        dx = (gx / norma) * mag;
        dy = (gy / norma) * mag;
      }

      const i = (y * cv.width + x) * 4;
      img.data[i] = Math.round(128 + Math.max(-1, Math.min(1, dx)) * 127);
      img.data[i + 1] = Math.round(128 + Math.max(-1, Math.min(1, dy)) * 127);
      img.data[i + 2] = 128;   // canal azul não é usado
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

/**
 * Define um filtro de vidro líquido. Renderiza um <svg> escondido com o filtro;
 * quem quiser usar aplica `backdrop-filter: url(#id)`.
 *
 * `escala` é o deslocamento máximo em pixels — o artigo recomenda usar o desvio
 * máximo calculado; aqui fica exposto para permitir ajuste fino por elemento.
 */
export default function VidroLiquido({ id, largura, altura: alt, raio = 16, bisel = 14, escala = 22, desfoque = 6 }) {
  const [mapa, setMapa] = useState(null);

  useEffect(() => {
    if (!largura || !alt) return;
    // Gerar o mapa é caro (o artigo avisa). Roda só quando o tamanho muda.
    setMapa(gerarMapa(largura, alt, raio, bisel));
  }, [largura, alt, raio, bisel]);

  if (!mapa) return null;

  return (
    <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
      <defs>
        {/* colorInterpolationFilters=sRGB: sem isto o Chrome interpola em linearRGB
            e o mapa (que é dado, não cor) sai distorcido. */}
        <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          {/* Ordem importa: borra PRIMEIRO, refrata DEPOIS.
              Ao contrário, o blur passa por cima do deslocamento e apaga a
              refração — foi o que aconteceu na primeira versão: o efeito existia
              mas era invisível, porque um blur de 6px sobre um ícone de 52px
              destrói exatamente o detalhe que a refração acabou de criar. */}
          <feGaussianBlur in="SourceGraphic" stdDeviation={desfoque} result="borrado" />
          <feImage href={mapa} x="0" y="0" width={largura} height={alt} result="mapa" preserveAspectRatio="none" />
          <feDisplacementMap in="borrado" in2="mapa" scale={escala} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/** Mede um elemento. Os cards da grade têm largura variável — o filtro precisa
 *  do tamanho real, senão o mapa não casa com o elemento (o artigo alerta). */
export function useTamanho() {
  const ref = useRef(null);
  const [tam, setTam] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      // Arredonda para evitar regerar o mapa a cada fração de pixel.
      setTam((a) => {
        const l = Math.round(width);
        const h = Math.round(height);
        return a && a.largura === l && a.altura === h ? a : { largura: l, altura: h };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, tam];
}
