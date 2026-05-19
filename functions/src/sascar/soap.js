// Cliente SOAP minimalista pro WebService SasIntegra (SASCAR)
// Doc: docs/sascar/WebService_SasIntegra_v2.05_Portugues.pdf

const ENDPOINT = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';
const NS = 'http://webservice.web.integracao.sascar.com.br/';

function envelope(method, paramsXml, alias = 'web') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:${alias}="${NS}">
<soapenv:Header/>
<soapenv:Body>
<${alias}:${method}>
${paramsXml}
</${alias}:${method}>
</soapenv:Body>
</soapenv:Envelope>`;
}

async function soapCall(method, paramsXml, alias) {
  const body = envelope(method, paramsXml, alias);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SASCAR HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const fault = text.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1];
  if (fault) throw new Error(`SASCAR fault: ${fault.trim()}`);
  return text;
}

// Parse genérico de blocos <return>...</return>
function parseReturns(xml) {
  return [...xml.matchAll(/<return>([\s\S]*?)<\/return>/g)].map(m => m[1]);
}

function fieldString(block, tag) {
  return block.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`))?.[1] ?? null;
}

function fieldNumber(block, tag) {
  const v = fieldString(block, tag);
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function obterVeiculos({ usuario, senha, quantidade = 1000, idVeiculo = 0 }) {
  const params = `<usuario>${usuario}</usuario><senha>${senha}</senha><quantidade>${quantidade}</quantidade><idVeiculo>${idVeiculo}</idVeiculo>`;
  const xml = await soapCall('obterVeiculos', params, 'web');
  return parseReturns(xml).map(b => ({
    idVeiculo: fieldNumber(b, 'idVeiculo'),
    placa: fieldString(b, 'placa'),
    idCliente: fieldNumber(b, 'idCliente'),
    descricao: fieldString(b, 'descricao'),
    idEquipamento: fieldString(b, 'idEquipamento'),
    idEquipamentoDesc: fieldString(b, 'idEquipamentoDesc'),
    satelital: fieldString(b, 'satelital') === 'true',
  }));
}

export async function obterClientes({ usuario, senha, quantidade = 1000, idCliente = 0 }) {
  const params = `<usuario>${usuario}</usuario><senha>${senha}</senha><quantidade>${quantidade}</quantidade><idCliente>${idCliente}</idCliente>`;
  const xml = await soapCall('obterClientes', params, 'web');
  return parseReturns(xml).map(b => ({
    idCliente: fieldNumber(b, 'idCliente'),
    nome: fieldString(b, 'nome'),
    cnpj: fieldString(b, 'cnpj'),
    cpf: fieldString(b, 'cpf'),
  }));
}

function parsePosicao(b) {
  return {
    idVeiculo: fieldNumber(b, 'idVeiculo'),
    idPacote: fieldNumber(b, 'idPacote'),
    dataPosicao: fieldString(b, 'dataPosicao'),
    dataPacote: fieldString(b, 'dataPacote'),
    latitude: fieldNumber(b, 'latitude'),
    longitude: fieldNumber(b, 'longitude'),
    direcao: fieldNumber(b, 'direcao'),
    velocidade: fieldNumber(b, 'velocidade'),
    ignicao: fieldNumber(b, 'ignicao'),
    bloqueio: fieldNumber(b, 'bloqueio'),
    gps: fieldNumber(b, 'gps'),
    odometro: fieldNumber(b, 'odometro'),
    horimetro: fieldNumber(b, 'horimetro'),
    tensao: fieldNumber(b, 'tensao'),
    uf: fieldString(b, 'uf'),
    cidade: fieldString(b, 'cidade'),
    rua: fieldString(b, 'rua'),
    pontoReferencia: fieldString(b, 'pontoReferencia'),
    idMotorista: fieldNumber(b, 'idMotorista'),
    nomeMotorista: fieldString(b, 'nomeMotorista'),
  };
}

export async function obterPacotePosicoes({ usuario, senha, quantidade = 200 }) {
  const params = `<usuario>${usuario}</usuario><senha>${senha}</senha><quantidade>${quantidade}</quantidade>`;
  const xml = await soapCall('obterPacotePosicoes', params, 'ws');
  return parseReturns(xml).map(parsePosicao);
}

// Mesma assinatura, mas inclui idMotorista + nomeMotorista (iButton logado)
export async function obterPacotePosicoesMotorista({ usuario, senha, quantidade = 200 }) {
  const params = `<usuario>${usuario}</usuario><senha>${senha}</senha><quantidade>${quantidade}</quantidade>`;
  const xml = await soapCall('obterPacotePosicoesMotorista', params, 'web');
  return parseReturns(xml).map(parsePosicao);
}

// Eventos de Tempo de Direção (Jornada/Refeição/Pausa/Encerrar) enviados pelo tablet SasMDT
// IDs evento: 1=Jornada, 2=Dirigindo, 3=Pausa, 4=Parada, 5=Refeição, 6=Esperar, 7=Encerrar, 8=Trocar
// dataInicio/dataFim no formato 'YYYY-MM-DD HH:MM:SS'
export async function obterEventosTempoDirecao({ usuario, senha, dataInicio, dataFim, quantidade = 3000, idMotorista = 0 }) {
  const optMot = idMotorista ? `<idMotorista>${idMotorista}</idMotorista>` : '';
  const params = `<usuario>${usuario}</usuario><senha>${senha}</senha><quantidade>${quantidade}</quantidade>${optMot}<dataInicio>${dataInicio}</dataInicio><dataFim>${dataFim}</dataFim>`;
  const xml = await soapCall('obterEventosTempoDirecao', params, 'web');
  return parseReturns(xml).map(b => ({
    dataInicio: fieldString(b, 'dataInicio'),
    eventoTempoDirecao: fieldNumber(b, 'eventoTempoDirecao'),
    eventoTempoDirecaoAnterior: fieldNumber(b, 'eventoTempoDirecaoAnterior'),
    descricaoEventoTempoDirecao: fieldString(b, 'descricaoEventoTempoDirecao'),
    descricaoEventoTempoDirecaoAnterior: fieldString(b, 'descricaoEventoTempoDirecaoAnterior'),
    idMotorista: fieldNumber(b, 'idMotorista'),
    nomeMotorista: fieldString(b, 'nomeMotorista'),
    idMotoristaReserva: fieldNumber(b, 'idMotoristaReserva'),
    nomeMotoristaReserva: fieldString(b, 'nomeMotoristaReserva'),
    idVeiculo: fieldNumber(b, 'idVeiculo'),
    placa: fieldString(b, 'placa'),
    idCliente: fieldNumber(b, 'idCliente'),
    nomeCliente: fieldString(b, 'nomeCliente'),
    latitude: fieldNumber(b, 'latitude'),
    longitude: fieldNumber(b, 'longitude'),
    odometro: fieldNumber(b, 'odometro'),
    cidade: fieldString(b, 'cidade'),
    uf: fieldString(b, 'uf'),
    rua: fieldString(b, 'rua'),
  }));
}

// Reduz lista de pacotes para "última posição por veículo"
export function ultimaPorVeiculo(pacotes) {
  const map = new Map();
  for (const p of pacotes) {
    if (!p.idVeiculo) continue;
    const cur = map.get(p.idVeiculo);
    if (!cur || (p.dataPosicao ?? '') > (cur.dataPosicao ?? '')) {
      map.set(p.idVeiculo, p);
    }
  }
  return [...map.values()];
}
