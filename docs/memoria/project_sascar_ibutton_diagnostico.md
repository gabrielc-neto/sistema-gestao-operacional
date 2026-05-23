---
name: project-sascar-ibutton-diagnostico
description: "Diagnóstico iButton da frota Pontual (2026-05-18) + perguntas pra fazer pro suporte SASCAR. Hardware presente em 100%, mas só 6 motoristas usam."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ecc1bc2-6fdb-465e-bcfc-312ac32cd458
---

# Diagnóstico iButton Pontual — pendente com suporte SASCAR

Status: **Wesley vai falar com suporte SASCAR.** Diagnóstico rodado em 2026-05-18.

## 📊 Estado atual (rodado via scripts/verificar-ibutton.mjs + verificar-ibutton-completo.mjs)

### Hardware
- **38 veículos cadastrados** — 100% têm rastreador compatível com iButton
  - 36x CalAmp LMU4230 (porta 1-Wire nativa)
  - 2x CalAmp MSC830 (AKD5A88-1, SEF1H32)

### Cadastro de motoristas na SASCAR
- **66 motoristas cadastrados**
- Campo `ibutton` retorna VAZIO em todos via `obterMotoristas` (mas a identificação funciona — provavelmente vincula por outro campo no portal SASCAR)

### Uso real (24h em 2026-05-18, domingo)
- **6 motoristas se identificaram** nos pacotes (9% dos cadastrados)
- **7 caminhões receberam log** (18% da frota)
- 23 caminhões sem pacotes nas 24h (domingo + frota parada)

## ⚠️ INFO CRÍTICA (Wesley 2026-05-18)

**Maior parte dos motoristas loga direto no TABLET (MDT)**, não na pastilha iButton física.
Os 6 que aparecem identificados via API podem ser só os que usam pastilha física.
**Hipótese:** `obterPacotePosicoesMotorista` retorna só ID via iButton — login via tablet pode estar em outro método/campo.
Investigar: ver se SASCAR tem método tipo `obterMotoristaTablet`, `obterIdentificacaoMDT`, ou similar.

## ✅ INVESTIGAÇÃO CONCLUÍDA (2026-05-18)

Método correto pra TABLET: **`obterEventosTempoDirecao`** (SasIntegra 4.34).
Teste rodado: 483 eventos em 24h, **34 motoristas únicos** (não 6).
Detalhado em [[project_jornada_motorista_plano]] — NÃO precisa de iButton físico nem de gravar histórico.
Outros achados: `obterMotoristasVeiculos` bloqueado (pedir liberação à SASCAR), `obterEventoTelemetriaIntegracao` ok pra futuro.

### Os 6 motoristas que aparecem identificados na API (provavelmente via pastilha física)
| ID SASCAR | Nome | Caminhão habitual |
|---|---|---|
| 3920728 | HAROLDO MACHADO DE OLIVEIRA JUNIOR | AKD5988 |
| 3903724 | COSME DA SILVA | BBE9588-2 (logou em SEF1H28 quando BBE foi pra serviço) |
| 3922453 | EZEQUIEL RIBEIRO DE OLIVEIRA | SEF1H25 |
| 3741286 | LORINALDO SILVA | SES9I57-2 |
| 3708532 | VALDEREI ALELUIA | SFL4G38-1 |
| 3569173 | VALDINEI DO CARMO ANDRADE | SFL4G80-1 |

## 🎯 Perguntas pra fazer pro suporte SASCAR

1. **Quantas pastilhas iButton foram emitidas pra Pontual?** (Total físico de pastilhas)
2. **Tem motorista cadastrado SEM pastilha vinculada?** (Lista quem falta)
3. **Como vejo no portal quais motoristas têm pastilha ativa?** (URL/menu específico)
4. **Por que o campo `ibutton` retorna vazio na API `obterMotoristas`?** (Existe outro método pra ver vínculo?)
5. **Confirmar instalação do leitor 1-Wire em todos os 38 caminhões.** Tem caminhão com leitor desativado/quebrado?
6. **Custo pra emitir pastilhas adicionais** (se faltam pra 60 motoristas)
7. **Treinamento — eles fornecem material/vídeo** pra ensinar motorista a logar?
8. **TABLET/MDT** — Pontual usa tablet pra motorista logar. Em qual método/campo da API SasIntegra vem a identificação feita via tablet? `obterPacotePosicoesMotorista` retorna só pastilha física?
9. **Existe método tipo `obterMotoristaTablet`, `obterIdentificacaoMDT`, `obterEventosMotorista`** que devolva quem está logado no tablet de cada caminhão?
10. **Como casar log de tablet com posição GPS?** (Pra calcular jornada precisamos saber QUEM dirigia QUANDO, mesmo identificado via tablet)

## 🚀 Decisões/observações chave

- **Hardware OK em 100%** → não precisa instalar nada novo, só ATIVAR uso
- **Pode codar jornada agora** com os 6 motoristas atuais (piloto)
- **Conforme mais motoristas começam a usar**, a jornada cobre mais gente automaticamente — código não muda
- **Iniciativa é organizacional**: cobrar/treinar os motoristas a encostar a pastilha quando ligar o caminhão

## 📋 Próximas ações Wesley
1. Ligar SASCAR comercial/suporte com as 7 perguntas acima
2. Rodar `node scripts/verificar-ibutton.mjs` segunda-feira de manhã (dia útil cheio) pra ver o número real
3. Decidir A/B/C do plano de jornada após retorno SASCAR

## Como retomar
Wesley diz "voltei da SASCAR" → revisar respostas, atualizar este doc, decidir caminho A/B/C de [[project_jornada_motorista_plano]].

Relacionado: [[project_jornada_motorista_plano]], [[project_motorista_caminhao_pontual]], [[reference_sascar_api]]
