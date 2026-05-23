---
name: reference-sascar-api
description: "SASCAR SasIntegra Web Service — endpoint, autenticação, métodos principais e exemplos SOAP para integração de rastreamento veicular"
metadata: 
  node_type: memory
  type: reference
  originSessionId: bdcfcba3-82cf-4e31-b119-80741c712de4
---

API SASCAR (Michelin Connected Fleet) — Web Service SasIntegra v2.05

**Documentação oficial:** https://connectedfleet.michelin.com/hubfs/WebService_SasIntegra_v2.05_Portugues.pdf
**PDF local:** `C:/Users/Logistica01/projetos/logistica-ia/docs/sascar/WebService_SasIntegra_v2.05_Portugues.pdf`
**Texto extraído:** `C:/Users/Logistica01/projetos/logistica-ia/docs/sascar/sascar_api.txt` (283 páginas)

## Conexão

- **WSDL:** `https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService?wsdl`
- **Protocolo:** SOAP sobre HTTPS com **TLS 1.2 obrigatório** (HTTP descontinuado)
- **Namespace XML:** `http://webservice.web.integracao.sascar.com.br/`
- **SOAP envelope ns:** `http://schemas.xmlsoap.org/soap/envelope/`

## Fuso horário dos timestamps (IMPORTANTE)

⚠ **`obterEventosTempoDirecao` retorna timestamps em BRT (horário local Brasília), NÃO em UTC.**

Confirmado em 2026-05-19: motorista ADAM logou às 07:05:07 BRT no tablet SasMDT e a API retornou exatamente `"2026-05-19 07:05:07"`. A doc oficial v2.05 menciona UTC, mas a prática real desse método é BRT.

Implicações no código (`functions/src/sascar/jornada.js`):
- `rangeUtcParaDiaLocal()` agora pede `00:00:00 → 23:59:59` do dia em BRT direto (não +3h)
- Não converter timestamps de retorno (já em BRT)
- `formatBR()` no frontend formata direto sem subtrair fuso

Pra outros métodos SASCAR (`obterPacotePosicoes`, etc), confirmar fuso ANTES de usar — pode ser UTC mesmo. Não generalizar.

## Autenticação

Não usa SOAP Header. **Usuário e senha vão como parâmetros em cada método.**

```xml
<web:obterVeiculos>
  <usuario>PONTUALPONTUAL</usuario>
  <senha>***</senha>
  <quantidade>10</quantidade>
  <idVeiculo>0</idVeiculo>
</web:obterVeiculos>
```

## Limites

- **1 requisição simultânea por integradora** (excedente é recusado)
- Até **3.000 pacotes por consulta** de posição
- `obterVeiculos`: máximo 1.000 registros por página (paginar via `idVeiculo` da última página)

## Métodos com restrição de concorrência (rate limit)

- `obterPacotePosicoes` / `obterPacotePosicoesRestricao` / `obterPacotePosicoesRFNacional`
- `obterPacotePosicoesJSON` / `obterPacotePosicaoPorRangeJSON` / `obterPacotePosicaoPorRange`
- `obterPacotePosicaoHistorico`
- `obterPacotePosicoesMotorista` / `obterPacotePosicoesMotoristaRestricao` / `obterPacotePosicoesMotoristaJSON`
- `obterPacotePosicaoMotoristaPorRangeJSON` / `obterPacotePosicaoMotoristaPorRange`
- `obterPacotePosicaoMotoristaHistorico`
- versões em inglês: `getPositionsPacketJSON`, `getDriverPositionPacketJSON`, etc.

## Métodos principais (para fase 2 do TMS Pontual)

| Método | Função |
|---|---|
| `obterVeiculos(usuario, senha, quantidade, idVeiculo)` | Lista frota — usar como ping/teste de credencial |
| `obterClientes(usuario, senha, quantidade, idCliente)` | Lista clientes da integradora |
| `obterMotoristas(usuario, senha, ...)` | Lista motoristas |
| `obterMotoristasVeiculos(...)` | Vínculo motorista×veículo |
| `obterPacotePosicoes(...)` | Posições GPS recentes (mapa ao vivo) |
| `obterPacotePosicaoHistorico(...)` | Histórico de posições |
| `obterStatusComando(usuario, senha, ticket)` | Verifica status de comando enviado |
| `obterTipoComando(...)` | Lista comandos disponíveis (incluindo bloqueio) |
| `obterGrupoAtuadores(...)` | Atuadores instalados nos veículos |
| `atualizarSenha(usuario, senhaAtual, novaSenha)` | Troca senha do integrador |

## Retorno do obterVeiculos (campos principais)

- `idVeiculo` (Integer)
- `placa` (String)
- `idCliente` (Integer)
- `descricao` (String) — ex: "GSM/GPS"
- `idEquipamento` (String) — ex: 75807
- `idEquipamentoDesc` (String) — ex: "MTC400"
- `idSensor1-8`, `idAtuador1-8` (Integer)
- `portaBloqueio`, `portaPanico` (Integer)
- `satelital` (Boolean)

## Headers HTTP necessários

```
Content-Type: text/xml; charset=utf-8
SOAPAction: ""
```

## Credenciais Pontual

Armazenadas em `C:/Users/Logistica01/projetos/logistica-ia/.env` (não comitado):
```
SASCAR_USUARIO=PONTUALPONTUAL
SASCAR_SENHA=sascar
```

**Why:** Transportadora Pontual contratou SASCAR pra rastrear os 38 cavalos de combustível. Doc é necessária pra implementar Fase 2 do TMS (mapa ao vivo, cerca, telemetria, bloqueio remoto).

**How to apply:** Consultar antes de qualquer integração com SASCAR. Sempre lembrar do TLS 1.2 e do limite de 1 chamada simultânea. Para teste inicial de credencial usar `obterVeiculos` (não tem rate limit). Ver [[project_logistica_rastreamento_levantamento]] para escopo completo da Fase 2.
