---
name: project-gabriel-parceiro-sistemas-coexistem
description: "Rosilda e Gabriel são PARCEIROS de trabalho na Pontual. Ambos têm sistemas rodando no mesmo VPS (srv1464919). Gabriel tem sistema PHP+PostgreSQL (gestão de compras, glpi, intranet, etc). Rosilda tem sistema React+Firebase de LOGÍSTICA. Os sistemas COEXISTEM, não se substituem. Rosilda + Claude só mexem na parte de LOGÍSTICA."
metadata:
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato confirmado 2026-07-22

**Rosilda e Gabriel são parceiros de trabalho na Pontual Petróleo.**

Trabalham juntos, cada um responsável por um sistema diferente:

| Pessoa | Sistema | Stack |
|---|---|---|
| **Gabriel** | Gestão administrativa/compras/GLPI/intranet | PHP + PostgreSQL |
| **Rosilda** | **Sistema de LOGÍSTICA** (frota, motoristas, jornada, SASCAR, CTA, manutenção) | React + Vite + Firebase (migrando pra Node + PostgreSQL) |

**Os sistemas COEXISTEM** no mesmo VPS srv1464919.hstgr.cloud (KVM 8, IP 72.60.8.135). Não substituem um ao outro.

## Sistemas do Gabriel (não mexer)

Rodando em `/var/www/homol/`:
- `gestao-compras`
- `gestao-espaco`
- `glpi` (helpdesk open source)
- `integridade` (guard interno)
- `intranet-api` (API PHP + banco `intranet` no PostgreSQL)
- `sistemas-externos`
- `web-homol.pontualpetroleo.com.br` (SPA principal do sistema dele)

Servidor web: Apache2 (já configurado com SSL Let's Encrypt pro subdomínio dele).

## Sistema da Rosilda (nosso escopo)

**Isolamento total do sistema do Gabriel:**
- Diretório próprio: `/var/pontual/`
- Subdomínio próprio: `logistica.pontualpetroleo.com.br` (a criar no DNS)
- Banco PostgreSQL próprio: `pontual` (usuário `pontual_app`)
- Backend Node porta interna 3000 (proxy via Apache VirtualHost novo)
- PM2 process manager próprio

## Regras pra qualquer Claude futuro

1. **Rosilda + Claude só mexem na parte de LOGÍSTICA** — não tocar em `/var/www/homol/*`, banco `intranet`, VirtualHosts existentes do Gabriel
2. **Gabriel é PARCEIRO**, não empregado/subordinado — tratar como igual em decisões técnicas compartilhadas (mas cada um decide no próprio sistema)
3. **Se algo do Gabriel quebrar** por erro nosso, Rosilda perde credibilidade com ele — cuidado extra em qualquer coisa que envolva Apache global, PostgreSQL global, portas 80/443
4. **Sistema Pontual (logística) tem escopo próprio** — não precisa integrar com sistemas do Gabriel, mas pode compartilhar recursos (PostgreSQL server, Apache server, Redis)

## Ver também

- [[project-rosilda-eh-dona-do-sistema-vps-pontual]] — Rosilda dona do sistema DELA
- [[project-migracao-hostinger-plano-05-08]] — cronograma
- [[project-hostinger-vps-setup-decisoes]] — decisões prévias
