---
name: project-rosilda-eh-dona-do-sistema-vps-pontual
description: "CORREÇÃO IMPORTANTE (2026-07-22): Rosilda Lima é a DONA do sistema Pontual, não Gabriel. Gabriel foi/é colaborador de código (repo no GitHub dele, mas sistema é dela). VPS compartilhado (KVM 8, srv1464919.hstgr.cloud, IP 72.60.8.135) é da Pontual — ela tem autoridade total pra usar."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Correção crítica

**Rosilda Lima é a DONA do sistema Pontual Logística.**

Antes de 2026-07-22 eu (Claude) assumia que Gabriel Neto era o dono
porque o repo GitHub está no nome dele: `gabrielc-neto/sistema-gestao-operacional`.
**Isso está errado.** Gabriel foi colaborador de código (ou dev
contratado); o sistema, dados, decisões e propriedade intelectual
pertencem a Rosilda / Pontual Logística.

## Impacto prático

- ✅ Rosilda tem autoridade final em todas as decisões técnicas
- ✅ Todos os dados (Firestore, futuras migrações) são propriedade dela
- ✅ **Rosilda NÃO TEM SÓCIO** — sistema é 100% dela (confirmado 2026-07-22)
- ✅ Existe **diretoria** da Pontual pra quem Rosilda apresenta o sistema (reunião 28/07/2026 é apresentação pra diretoria — não sócios)
- ⚠️ Wesley Sampaio NÃO é sócio — se aparecer contexto sobre ele, tratar como colaborador/gestor operacional
- ⚠️ Se um dia romper com Gabriel, o repo pode virar problema (código dele, mas conteúdo do sistema dela) — considerar fork pro GitHub próprio dela

## VPS infraestrutura

**Existe VPS já contratado pela Pontual (empresa dela):**
- Servidor: `srv1464919.hstgr.cloud`
- IP público: `72.60.8.135`
- Plano: **KVM 8** (8 vCPU · 32 GB RAM · 400 GB SSD · 32 TB banda)
- SO instalado: Ubuntu (a confirmar versão exata)
- Status: Em atividade — **JÁ TEM SISTEMAS RODANDO**
- Válido até: **2028-03-06**
- Acesso: aba "Compartilhado comigo" no painel Hostinger da Rosilda

**IMPORTANTE — VPS COMPARTILHADO COM OUTROS SISTEMAS (2026-07-22):**
- **Gabriel Neto administra o VPS** (é dele ou ele é o admin técnico da Pontual)
- Gabriel **já instalou outros sistemas** dele lá (uso atual: 10 GB disco + 1.4 GB RAM = há coisa rodando)
- **Sistema operacional da Logística (Pontual — este projeto) NÃO está no VPS ainda** — é o que Claude+Rosilda vai colocar
- Sistema Pontual continua sendo da Rosilda (propriedade) mas divide infraestrutura com outros sistemas do Gabriel

**Isso substitui a intenção anterior de contratar KVM 2 novo.** Vantagens:
- Custo zero adicional pra Rosilda (empresa/Gabriel já paga)
- 4x mais recursos que KVM 2
- Aguenta 1500+ usuários simultâneos com folga
- Autorização implícita (Gabriel foi quem propôs)

**Cuidados críticos ao instalar Pontual no VPS:**
1. **Coordenar com Gabriel ANTES de mexer** — pode derrubar sistemas dele se não isolar
2. **Isolamento**: subdomínio próprio + porta própria + banco MySQL separado + usuário linux separado
3. **NÃO** instalar globalmente (evitar `sudo apt install` em pacotes que ele já tem)
4. **NÃO** reiniciar VPS sem avisar
5. **Backup do que já existe** antes de instalar qualquer coisa nova
6. **Acesso SSH:** confirmar se Rosilda tem senha root OU se Gabriel precisa criar usuário separado pra Claude

## Regras pra qualquer Claude

1. **Referir Rosilda como dona/responsável do sistema** — nunca "Gabriel"
2. **Decisões técnicas de infraestrutura** — pedir aprovação da Rosilda, não do Gabriel
3. **Se Gabriel entrar no fluxo em algum momento**, tratar como colaborador de código (não decisor final)
4. **VPS srv1464919.hstgr.cloud** é o servidor autorizado pra hospedar o sistema Pontual

Ver também:
- [[docs/PERFIL-USER.md]] (dados de Rosilda)
- [[project-hostinger-vps-setup-decisoes]] (roadmap migração — ATUALIZAR pra KVM 8 em vez de KVM 2)
- [[feedback-so-mudar-o-que-user-pediu]]
