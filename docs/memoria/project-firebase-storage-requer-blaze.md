---
name: project-firebase-storage-requer-blaze
description: "Firebase Storage no projeto pontual-logistica NÃO está ativado e ativar exige plano Blaze (pago). Descoberto 2026-07-22 quando tentando fazer upload de foto do motorista. Reativar upload de foto/anexos SÓ quando migrar pra Hostinger — VPS KVM 8 tem 400GB SSD grátis."
metadata:
  node_type: memory
  type: project
  originSessionId: 5acf3375-6d8a-41aa-ac74-6d46b9fd62ba
---

## Fato

Firebase Console → Storage no projeto `pontual-logistica` mostra:

> "Para usar Storage, faça upgrade do plano de preços do seu projeto"
> [Fazer upgrade do projeto]

Bucket `pontual-logistica.firebasestorage.app` retornou **HTTP 404** via Admin SDK.
Bucket antigo `pontual-logistica.appspot.com` também **404**.

Conclusão: **Firebase Storage exige plano Blaze** (pay-as-you-go) pra ser ativado.
Rosilda não quer pagar Firebase — ver [[feedback-rosilda-nao-ativar-firebase-blaze]].

## Impacto no sistema hoje

Toda feature que dependia de Storage está **broken silencioso**:

- Upload foto motorista → travava em "Enviando..." (removido em 2026-07-22)
- Fotos anexadas em OS (aba OS Concluir → botão camera) → não funciona
- Anexos de multas → não funciona
- Fotos de vistoria/DVIR → não funciona (aba desativada mas se reativar…)
- Anexos gerais de manutenção (CIV/CIPP/CRLV/etc) → não funciona
- Checklist mensal com fotos → não funciona
- Anexos de Lançamento de OS → não funciona

**Nenhuma foto sobe em produção hoje.** Frontend não avisa isso claramente
até tentar upload e dar timeout.

## Ação tomada 2026-07-22

Removido upload de foto do motorista (Motoristas.jsx):
- Imports removidos: `storage`, `uploadBytes`, `getDownloadURL`, `deleteObject`, `storageRef`, `Camera`, `UserIco`
- Handlers removidos: `uploadFotoMotorista`, `removerFotoMotorista`
- State removido: `uploadingFoto`
- UI de upload substituída por card só de preview do Avatar (iniciais coloridas)
- **Campo `foto` mantido** no EMPTY_FORM e no salvar — pra não perder dados antigos
  se algum motorista já tiver foto (embora improvável dado que Storage nunca funcionou)
- Componente Avatar reutilizável mantido — fallback pra iniciais coloridas é bonito

## Regra pra qualquer Claude futuro

**NÃO tentar consertar upload de foto/anexo em Firebase Storage** — bucket não existe,
ativar exige Blaze, Rosilda recusou.

**Reativar TODO upload de foto/anexo APENAS quando migrar pra Hostinger:**
- VPS KVM 8 já contratada (srv1464919.hstgr.cloud · IP 72.60.8.135)
- 400 GB SSD grátis (já incluso no plano)
- Substituir `firebase/storage` por endpoint próprio (multer + disco local)
- Path sugerido no VPS: `/var/pontual/uploads/{tipo}/{id}/`

## Alternativas descartadas

- **Cloudinary free tier** (25GB grátis) — descartado, código descartável, migração iminente
- **Base64 no Firestore** — descartado, quota já estoura, performance ruim
- **Firebase Blaze** — descartado, user recusou pagar

## Ver também

- [[feedback-rosilda-nao-ativar-firebase-blaze]] — regra permanente sobre não pagar
- [[project-hostinger-vps-setup-decisoes]] — VPS destino da migração
- [[feedback-so-mudar-o-que-user-pediu]] — não mexer em features não solicitadas
