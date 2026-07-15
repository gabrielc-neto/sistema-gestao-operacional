// Open-Meteo — https://open-meteo.com
// Previsão e histórico de tempo. 100% grátis, sem cadastro, sem key.

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE  = "https://archive-api.open-meteo.com/v1/archive";

const cache = new Map();

// Previsão horária para os próximos `dias` dias (max 16). Retorna:
//   { current: {...}, hourly: { time[], temperature_2m[], precipitation[], ... }, daily: {...} }
export async function previsao({ lat, lng, dias = 3 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("lat/lng inválidos");
  const key = `f:${lat.toFixed(3)}:${lng.toFixed(3)}:${dias}`;
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lng,
    current:   "temperature_2m,precipitation,wind_speed_10m,weather_code,relative_humidity_2m",
    hourly:    "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,visibility,weather_code",
    daily:     "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,wind_speed_10m_max,weather_code",
    timezone:  "America/Sao_Paulo",
    forecast_days: Math.min(Math.max(Number(dias) || 3, 1), 16),
  });
  const res = await fetch(`${FORECAST}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();
  cache.set(key, json);
  return json;
}

// Histórico diário (para justificativa de atraso). Datas ISO YYYY-MM-DD.
export async function historico({ lat, lng, dataInicio, dataFim } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("lat/lng inválidos");
  if (!dataInicio || !dataFim) throw new Error("dataInicio/dataFim obrigatórios (YYYY-MM-DD)");
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lng,
    start_date: dataInicio,
    end_date:   dataFim,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,wind_speed_10m_max",
    timezone: "America/Sao_Paulo",
  });
  const res = await fetch(`${ARCHIVE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo archive ${res.status}`);
  return res.json();
}

// Códigos WMO → texto humano. Só os mais comuns pra rota rodoviária.
const WMO = {
  0: "Céu limpo", 1: "Predominantemente limpo", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Névoa", 48: "Névoa com geada",
  51: "Garoa fraca", 53: "Garoa moderada", 55: "Garoa densa",
  61: "Chuva fraca", 63: "Chuva moderada", 65: "Chuva forte",
  71: "Neve fraca", 73: "Neve moderada", 75: "Neve forte",
  80: "Pancada de chuva fraca", 81: "Pancada de chuva moderada", 82: "Pancada de chuva forte",
  95: "Trovoada", 96: "Trovoada com granizo fraco", 99: "Trovoada com granizo forte",
};
export function descreverTempo(codigo) {
  return WMO[Number(codigo)] || `Código ${codigo}`;
}

// Regra simples: chuva > 5mm em 3h consecutivas ou vento > 60 km/h = alerta.
export function analisarRiscoRota(previsaoJson, horasFrente = 12) {
  const hourly = previsaoJson?.hourly;
  if (!hourly) return { risco: false, motivos: [] };
  const motivos = [];
  const n = Math.min(horasFrente, hourly.time?.length || 0);
  let chuva3h = 0;
  for (let i = 0; i < n; i++) {
    const p = Number(hourly.precipitation?.[i] || 0);
    const w = Number(hourly.wind_speed_10m?.[i] || 0);
    chuva3h = i >= 3 ? chuva3h - Number(hourly.precipitation?.[i - 3] || 0) + p : chuva3h + p;
    if (chuva3h >= 15) motivos.push(`Chuva acumulada ${chuva3h.toFixed(1)}mm em 3h (${hourly.time[i]})`);
    if (w >= 60)      motivos.push(`Vento ${w.toFixed(0)} km/h (${hourly.time[i]})`);
    if ([65, 75, 82, 95, 96, 99].includes(Number(hourly.weather_code?.[i]))) {
      motivos.push(`${descreverTempo(hourly.weather_code[i])} (${hourly.time[i]})`);
    }
  }
  return { risco: motivos.length > 0, motivos: [...new Set(motivos)].slice(0, 5) };
}
