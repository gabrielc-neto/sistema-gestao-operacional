---
name: project-tms-mapa-completo
description: "Documento-mapa do TMS no Desktop: arquitetura (camadas), 15 módulos, integrações com API, dados sem API, capacidades possíveis e roadmap — tudo com o que cada peça faz"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 6724ac89-4074-45e1-a2c6-093d41392374
---

Documento de referência completo do sistema/TMS salvo em `C:\Users\Logistica01\Desktop\TMS-estrutura-e-ferramentas.md` (criado 2026-05-22 a pedido do Wesley).

**Why:** Wesley quis um único documento na área de trabalho com TODO o desenho da estrutura e o que cada parte faz — consolida as conversas sobre ferramentas/APIs/possibilidades.

**How to apply:** é o mapa-mestre. Quando Wesley perguntar "o que dá pra fazer", "como integra X", "qual a arquitetura" — este doc já responde. Atualizar quando módulo/integração novo entrar.

Conteúdo (8 seções): (1) o que é o sistema; (2) diagrama de 4 camadas Frontend→Backend→Dados→Integrações, hoje Firebase vs alvo Supabase; (3) os 15 módulos e o que cada faz; (4) integrações com API REST agrupadas (negócio: BrasilAPI/ViaCEP/FIPE; fiscal: CT-e/MDF-e via **Focus NFe** (Solo R$89,90 ou Start R$113,90/mês +R$0,10/doc além de 100 — https://focusnfe.com.br/precos/, docs doc.focusnfe.com.br; 30 dias grátis). ⚠️ **Nuvem Fiscal NÃO usar — desativada 31/07/2026**. Alternativas vivas: PlugNotas, NFe.io, IntegraNotas; mapas: ORS/Google Routes/HERE; comunicação: Z-API/Resend/FCM; IA/OCR: Claude/OpenAI/Document AI; pagamento: Asaas/Iugu/Stripe; telemetria: SASCAR/VDO); (5) dados sem API limpa (pedágio/restrição/piso ANTT/diesel ANP — ver [[project_scraping_tms]]); (6) capacidades possíveis por bloco (dado atual/APIs/compliance perigosa/IA/portais); (7) roadmap por fase; (8) honestidade/dependências.

Insight novo registrado: **CT-e + MDF-e** são o coração fiscal de um TMS BR e o maior diferencial de venda. **Roteirização hazmat** (ORS/HERE) importa porque transportam combustível (carga perigosa). Pedágio com "só APIs" vem do Google Routes (não scraping).

Dependência crítica em aberto: confirmar com SASCAR se a API expõe **hodômetro/nível de combustível** — destrava consumo km/l, anomalia de combustível e manutenção preventiva por km. Doc da API SASCAR salva no projeto ([[reference_sascar_api]]).

Doc do Desktop ampliado 2026-05-22 com 3 seções novas:
- **Seção 9 — Ferramentas de construção (funcional)**: roteirização (OR-Tools/VROOM/ORS), PDF server (Puppeteer/pdfmake/signature_pad), BI (Metabase no Postgres), gráficos/planilha (Recharts/SheetJS), motor (pg_cron + pg-boss/BullMQ pra poller/snapshot/fila), app motorista (PWA+Workbox), mapa (Leaflet+markercluster). Quase tudo open source.
- **Seção 10 — Devops essencial**: **Backup + Gestão de segredos + Sentry = GATE da Fase 6** (não abrir pra clientes antes). + CI/CD, hosting auto-deploy, testes, uptime, PostHog. Supabase+Vercel+GitHub já consolidam a maioria.
- **Seção 11 — Compliance de frete**: ver decisão abaixo.

**DECISÃO (Wesley 2026-05-22): Pontual roda SÓ FROTA PRÓPRIA + motorista da casa** — NÃO usa autônomo/agregado/TAC. Consequência: **CIOT e vale-pedágio obrigatório NÃO se aplicam** ao TMS. Integrações de frete que valem: **combustível = começar por esse** — ⚠️ NÃO usam cartão de abastecimento (Ticket Log/Edenred). Fonte real do diesel: **interno = CTA Smart** (`ctasmart.com.br:8443/SvAdmIndex`, controla bomba interna) + **externo = "liberado em posto"** (sem cartão, provável nota/planilha do posto). Integrar CTA Smart por: API oficial > exportação CSV > ler banco direto > scraping (último caso). A confirmar com Wesley: on-premise ou nuvem? tem API/export? qual banco? como recebe o externo? Depois: **TAG de pedágio** (gasto da própria frota = custo); **ERP contábil (Omie/Bling)** na fase 5. Condicional: **gerenciadora de risco + averbação** só se a apólice exigir (averbação pode vir junto do CT-e). Combina com [[feedback_solides_so_adm]] (motorista é da casa, controle via SASCAR).

**IDENTIDADE PONTUAL + DECISÃO FISCAL (Wesley 2026-05-22):** Pontual é **base de petróleo**. Opera com **frota própria** (carga própria, só entrega) E também contrata **transportadoras terceiras** pra parte das cargas — confirmado 2, ambas EMPRESA/CNPJ: **E C STANYTCHYL TRANSPORTES** e **LODI E SCHUSARZ TRANSPORTADORA LTDA**. Fiscal por cenário: (a) frota própria → **Pontual emite MDF-e**, sem CT-e (carga própria); (b) terceiro empresa → **o terceiro emite CT-e + MDF-e**, Pontual é tomador e **recebe o CT-e**. **Pontual NUNCA emite CT-e. CIOT = NUNCA** (só contratam transportadora empresa, jamais autônomo pessoa física; CIOT só vale pra TAC autônomo). Vale-pedágio obrigatório: não. A NF-e da venda sai do sistema fiscal atual. MDF-e via **Focus NFe plano Solo (~R$90) sobra**. ⚠️ MDF-e de produto perigoso (combustível) leva infos extras (ONU/classe). Necessidade nova no TMS: **gestão de transportadoras terceiras** (cadastro CNPJ/RNTRC/frota, marcar OC terceiro × própria, frete contratado, receber CT-e deles). **No PRODUTO SaaS, manter CT-e completo** — outras transportadoras vendem frete; Focus NFe faz os dois.

**COTAÇÃO mensal (estimativa, varia):** Início só Pontual ~**R$250–550/mês** (Supabase Pro R$135 + MDF-e Focus Solo R$90 + WhatsApp + uso IA; resto free tier). Produto 3–10 clientes ~**R$600–1.300/mês**. Substitui Cobli/Buonny (R$3–4k/mês). 10 clientes × R$500–1k = R$5–10k receita → margem confortável. CTA Smart e SASCAR não são custo novo.

**PERFORMANCE — regra de ouro (não fica pesado SE):** integração externa NUNCA roda no clique do usuário — roda em background e grava no banco; a tela só LÊ do banco. É como o rastreamento já faz (poller grava posição, mapa lê). Por isso agendador+fila (pg_cron+pg-boss) são ESSENCIAIS. Postgres aguenta milhões de linhas com índice por empresa_id + paginação. 3 erros a evitar: API síncrona no request, não cachear, trazer tudo sem paginar. Veredito: arquitetura atual escala pra tudo; pesa só se mal feita.

**Regra pra decidir integração futura:** só integra se (1) lei obriga, (2) cliente paga mais, ou (3) economiza tempo/erro toda semana. Senão, backlog. O gargalo é executar o núcleo (custo/margem + MDF-e), não falta de ferramenta.

Relacionado: [[project_migracao_postgresql_tms]] (plano técnico doc 12), [[project_valorizacao_monetizacao]] (one-page de valor), [[project_logistica_rastreamento_levantamento]], [[project_scraping_tms]].

---

## Relacionado por tema

- **sascar**: [[feedback_colocar_no_ar_completo]] · [[feedback_falar_inviavel_cedo]] · [[feedback_projeto]]
- **cta**: [[feedback-windows-file-watcher]] · [[project_estado_atual]] · [[project_levantamento_logistica]]
- **manutencao**: [[feedback-windows-file-watcher]] · [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]]
- **firebase**: [[feedback_auditoria_estatica_nao_basta]] · [[feedback_bash_forward_slashes]] · [[feedback_colocar_no_ar_completo]]
