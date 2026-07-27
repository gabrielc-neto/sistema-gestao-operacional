// Ícones disponíveis para os cards do portal.
//
// Os links vivem no Firestore, e Firestore não guarda JSX — por isso cada link
// guarda só o NOME do ícone (string) e este mapa resolve para o componente.
//
// O mapa é explícito de propósito. `import * as Lucide from "lucide-react"`
// resolveria o mesmo problema em uma linha, mas arrastaria a biblioteca inteira
// (~1500 ícones) para dentro do bundle, porque o bundler não consegue saber
// quais são usados. Aqui ele leva só estes.

import {
  Monitor, ShieldCheck, Truck, LifeBuoy, ClipboardList, LayoutGrid,
  Presentation, Grid2x2, ShoppingCart, ExternalLink, CircleHelp, Globe,
  Settings, FileText, Users, Calendar, Wrench, Package, MapPin, Link as LinkIcon,
  Award,
} from "lucide-react";

export const ICONES = {
  monitor: Monitor,
  escudo: ShieldCheck,
  caminhao: Truck,
  suporte: LifeBuoy,
  prancheta: ClipboardList,
  grade: LayoutGrid,
  apresentacao: Presentation,
  quadrantes: Grid2x2,
  carrinho: ShoppingCart,
  externo: ExternalLink,
  ajuda: CircleHelp,
  globo: Globe,
  engrenagem: Settings,
  documento: FileText,
  pessoas: Users,
  calendario: Calendar,
  ferramenta: Wrench,
  caixa: Package,
  local: MapPin,
  link: LinkIcon,
  certificado: Award,
};

// Nomes para o seletor do painel. Ordem estável para a lista não dançar.
export const NOMES_ICONES = Object.keys(ICONES);

// Resolve o nome guardado no banco. Cai em `link` se o nome não existir — um
// ícone renomeado no futuro não pode quebrar o portal inteiro.
export function iconePara(nome) {
  return ICONES[nome] || ICONES.link;
}
