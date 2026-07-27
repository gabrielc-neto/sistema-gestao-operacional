---
name: Projeto Logística IA — Pontual Logística
description: React+Firebase para Pontual Logística — sistema de gestão operacional completo
type: project
originSessionId: aa056d7a-4096-4359-8dfb-a0aba1233f5b
---
**How to apply:** Ler este arquivo ao retomar o projeto.

## Empresa (identidade — afeta fiscal/escopo)
Pontual é **base de petróleo**. Opera com **frota própria** (carga própria, só entrega) E contrata **transportadoras terceiras** (empresas CNPJ — ex: E C STANYTCHYL TRANSPORTES, LODI E SCHUSARZ TRANSPORTADORA LTDA) pra parte das cargas. Fiscal: frota própria → Pontual emite **MDF-e** (sem CT-e); terceiro empresa → o terceiro emite CT-e+MDF-e e Pontual é tomador (recebe CT-e). **Pontual NUNCA emite CT-e. CIOT = NUNCA** (só contrata empresa, nunca autônomo). Combustível = carga perigosa (MDF-e leva infos ONU/classe). No produto SaaS, CT-e existe pra outras transportadoras. Ver [[project_tms_mapa_completo]] e [[project_migracao_postgresql_tms]].

## Stack
- Frontend: React 18 + Vite — `C:\Users\Logistica01\projetos\logistica-ia\frontend`
- Auth/DB: Firebase (projeto: pontual-logistica), Firestore southamerica-east1
- Scripts Python: `scripts/` (firebase-admin + serviceAccountKey.json)
- Dev server: `! cd /c/Users/Logistica01/projetos/logistica-ia/frontend && npm run dev` → localhost:5173
- Celular na mesma rede: usar IP da rede (aparece no terminal ao subir com `host: true` no vite.config.js)
- ⚠️ Usar formato Unix de path no bash (não `C:\`, usar `/c/Users/...`)

## Usuários master
- Wesley: silvasampaiowesley03@gmail.com | senha: WeSlEy2005?
- Gabriel: gabrielneto327@gmail.com | senha: Pontual2026**
- Wesley e Gabriel = admin, enxergam tudo

## Módulos — todos em `frontend/src/pages/`
- Login.jsx
- Dashboard.jsx — KPIs, últimas OCs, módulos com stats embutidos, visibilitychange refetch
- Frota.jsx — CRUD veículos, busca motorista, bloqueio
- Motoristas.jsx — CRUD + vencimentos CNH/MOPP/NR-20/NR-35 + banner alertas
- Atrelamento.jsx — registro conjunto, sync veiculos doc, check vencimentos ao atrlar
- OC.jsx — formulário + auto-fill conjunto + responsável=usuário logado (readOnly) + impressão A4
- Manutencao.jsx — Por Veículo / Por Tipo (filtro status) / Alertas
- Historico.jsx — histórico unificado
- Permissoes.jsx — matriz de permissões por cargo (admin only)
- Ferias.jsx — controle férias motoristas, alerta 60 dias eSocial
- ImportAdmin.jsx — importação veículos com normPlaca + parseTara

## Rotas (App.jsx)
/dashboard, /frota, /motoristas, /atrelamento, /oc, /manutencao, /historico, /permissoes, /ferias

## Regras de negócio importantes
- Placa normalizada: `(p) => (p||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"")`
- CNH, MOPP, NR-20, NR-35 = documentos de MOTORISTA (não de veículo) — gerenciados em /motoristas
- Licença Paraná = só veículos 9 eixos
- Atrelamento CONCLUÍDO → updateDoc no veículo (c1, c2, t1, t2, motorista)
- OC bloqueada se veículo bloqueado OU motorista sem 11h de descanso (quando SASCAR/VDO integrar)
- Responsável na OC = usuário logado, readOnly

## Permissões
- ADMIN_ROLES: master, admin (acesso total)
- Outros cargos configurados em /permissoes
- Futuro: sub-cargos (ex: logistica_supervisor pode aprovar jornada)
- Aprovação de jornada: Gestão + quem Wesley permitir da Logística

## APIs aguardando
- SASCAR — posição GPS, ignição, eventos em tempo real
- VDO — tacógrafo, jornada, cartão motorista
- Sólides — RH, folha de ponto, jornada oficial

## Módulo Rastreamento (planejado — aguarda SASCAR/VDO)
- Mapa com todos caminhões em tempo real
- Status: em movimento / parado / ignição desligada
- Popup: cavalo, carreta, motorista, velocidade, última atualização
- Aba busca por placa ou motorista
- Filtro por base (PONTUAL/REPLAN)
- Jornada: contador regressivo, alerta a 1h do limite
- Bloqueio automático: 9h30 jornada diária (regra empresa) + 11h descanso entre jornadas (lei)
- Aprovação de extensão de jornada pelo gestor (registrada para auditoria ANTT)
- Macro embarcada: bloqueia OC se motorista não cumpriu 11h de descanso
- Integração com OC: vincula OC ativa ao conjunto em campo

## Deploy
- URL produção: https://pontual-logistica.web.app (Firebase Hosting, plano gratuito Spark)
- Script: `C:\Users\Logistica01\projetos\logistica-ia\deploy.bat` — duplo clique faz build + deploy automático
- Comando manual: `npm run build` no frontend → `firebase deploy --only hosting` na raiz do projeto
- ⚠️ Não subir para produção sem autorização do Wesley

## Firebase — status
- [x] Auth, Firestore, 38 veículos, motoristas seeded, 2 masters
- [x] Firebase Hosting configurado — pontual-logistica.web.app
- [ ] Firebase Storage — precisa plano Blaze (para upload CNH/MOPP/CRLV)
- [ ] Migração futura para outro banco (a definir — validar sistema antes)

## Pendente — O que falta para processo logístico completo

### 🔴 Crítico (impacta operação hoje)
- **OC completa**: ciclo de vida (Emitida → Carregamento → Em Trânsito → Entregue/Cancelada), cliente vinculado, valor do frete
- **Programação de viagens**: escala/agendamento de OCs por veículo/motorista
- **Jornada do motorista**: obrigação legal (Lei 13.103) — horas, descanso, escala — aguarda SASCAR/VDO/Sólides
  - Regra empresa: motorista que trabalhar 2 semanas consecutivas é obrigado a folgar (sistema bloqueia nova OC)
- **Custo por viagem**: combustível, pedágio, custo por OC

### 🟡 Importante (melhora gestão)
- **Rastreamento SASCAR**: posição GPS em tempo real — aguarda credencial WebService
- **Cadastro de clientes/rotas**: OC sem cliente vinculado, sem histórico por tomador
- **Faturamento por OC**: receita, margem, inadimplência
- **Escala de motoristas**: disponibilidade, férias, folgas integradas

### 🟢 Qualidade (profissionaliza)
- **Relatórios automáticos**: por veículo, motorista, rota, período
- **Alertas proativos**: e-mail/WhatsApp antes do vencimento de documentos
- **App mobile motorista**: confirmar entrega, registrar ocorrência
- **Integração abastecimento**: consumo por veículo

### Módulos existentes — status atual
- ✅ Frota, Atrelamento, Manutenção, Motoristas, Férias
- ⚠️ OC — incompleto (sem ciclo, sem cliente, sem valor)
- ❌ Jornada, Rastreamento, Faturamento, Relatórios, Alertas WhatsApp, App motorista

### Ordem de prioridade sugerida
1. OC completa (ciclo + cliente + valor frete)
2. Jornada básica (horas, escala) — urgente legal
3. **Gestão de Custos** — combustível, pedágio, custo por viagem/OC (planejado pelo Wesley)
4. Faturamento por OC — receita, margem
5. SASCAR rastreamento (aguarda credencial)
6. App motorista / alertas WhatsApp — fase 2

- Firebase Storage — precisa plano Blaze (upload CNH/MOPP/CRLV)
- Sub-cargos no sistema de permissões

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_levantamento_logistica]]
- **jornada**: [[feedback_projeto]] · [[feedback_solides_so_adm]] · [[feedback_vdo_nao_sascar]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
