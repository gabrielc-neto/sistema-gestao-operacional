---
name: project-vps-http-puro-sem-ssl
description: "Sistema Pontual no VPS Hostinger roda em HTTP puro (sem SSL/HTTPS) por decisão da Rosilda 2026-07-23. Uso interno da empresa, sem exposição pública crítica. HTTPS pode ser ativado depois se DNS logistica.pontualpetroleo.com.br for criado."
metadata:
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Decisão 2026-07-23

Sistema roda em HTTP puro no VPS: **http://srv1464919.hstgr.cloud/**

Rosilda: *"se não der problemas, podemos seguir sem o http"* (queria dizer sem HTTPS).

## Por quê essa decisão

- Uso interno da empresa (não público)
- Sem carrossel de anúncios/pagamentos externos
- SSL Let's Encrypt exigiria criar subdomínio no DNS `logistica.pontualpetroleo.com.br`
- Rosilda não quer adicionar trabalho agora

## Configuração Apache atual

Existem 2 VirtualHosts pro nosso sistema:
1. **HTTP :80** → `pontual-logistica.conf` (funciona 100%)
2. **HTTPS :443** → `pontual-logistica-ssl.conf` (self-signed snakeoil — funciona mas browser avisa)

Ambos ativos. Rosilda usa HTTP. HTTPS fica de reserva.

## Riscos residuais aceitos

1. **Login Firebase Auth**: pode exigir domínio autorizado. Se der problema, ela adiciona `srv1464919.hstgr.cloud` em Firebase Console → Authentication → Settings → Authorized Domains
2. **PWA instalável**: não vai funcionar sem HTTPS. Se ela quiser botão "Instalar app", precisa HTTPS
3. **Câmera direta do browser**: bloqueada em HTTP. Anexar arquivo normal funciona
4. **Aviso "não seguro" no Chrome/Edge**: cosmético — não bloqueia acesso

## Como ativar HTTPS de verdade (se um dia quiser)

1. Rosilda cria subdomínio no Hostinger DNS: `logistica.pontualpetroleo.com.br → 72.60.8.135`
2. Aguarda propagação DNS (~10 min)
3. No VPS: `certbot --apache -d logistica.pontualpetroleo.com.br`
4. Certbot instala cert Let's Encrypt automaticamente
5. HTTPS válido sem aviso

## Regra pra qualquer Claude futuro

- **NÃO tentar redirect HTTP→HTTPS forçado** — vai quebrar acesso da Rosilda
- **NÃO recomendar HTTPS obrigatório** sem ela pedir explicitamente
- Se algum feature exigir HTTPS (PWA, câmera), documentar mas não forçar

Ver também: [[project-migracao-hostinger-plano-05-08]] · [[project-gabriel-parceiro-sistemas-coexistem]]
