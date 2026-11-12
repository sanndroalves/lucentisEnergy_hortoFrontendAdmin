// composables/useAlertasUsinas.ts
//
// Monitoramento de usinas: uma usina entra em alerta quando a geração real
// ficou abaixo da projeção em 3 ou mais meses, numa janela de 12 meses que
// termina no mês de referência (último mês com geração real registrada).
// A etiqueta de cada alerta vem do Checklist de vistoria do mês corrente.
//
// Usado pela tela Início e pela tela Manutenções. Recebe as listas como Ref,
// então funciona tanto com useFetch (await) quanto com useLazyFetch: enquanto
// os dados não chegam, as listas valem [] e "alertas" fica vazio.

import { computed, type Ref } from 'vue';
import { useReferenciaAtual } from './useReferenciaAtual';

type Lista = Ref<any[] | null | undefined>;

const STATUS_CHECK: Record<string, string> = { O: 'Ótimo', B: 'Bom', R: 'Ruim', Q: 'Quebrado', M: 'Manutenção' };

export interface StatusChecklist { txt: string; cor: string }

// Regra antiga do sistema: 3 ótimos (ou 2 ótimos + 1 bom) = Ótimo;
// 3 bons (ou 2 bons + 1 ótimo) = Bom; qualquer outra combinação = Verificar.
export function statusChecklistDe(checklists: any[], idUsina: number | string): StatusChecklist {
  const hoje = new Date();
  const doMes = checklists.filter((c) => {
    if (c.idUsina != idUsina) return false;
    const d = new Date(c.data);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  if (!doMes[0]) return { txt: 'Sem checklist', cor: 'var(--mut)' };
  const cont: Record<string, number> = { 'Ótimo': 0, 'Bom': 0 };
  [doMes[0].sitPlaca, doMes[0].sitInversor, doMes[0].sitRoteador].forEach((s) => {
    const d = STATUS_CHECK[s];
    if (d in cont) cont[d]++;
  });
  if (cont['Ótimo'] === 3 || (cont['Ótimo'] === 2 && cont['Bom'] === 1)) return { txt: 'Ótimo', cor: 'var(--green)' };
  if (cont['Bom'] === 3 || (cont['Bom'] === 2 && cont['Ótimo'] === 1)) return { txt: 'Bom', cor: 'var(--teal)' };
  return { txt: 'Verificar', cor: 'var(--orange)' };
}

export function useAlertasUsinas(fontes: { usinas: Lista; geracoes: Lista; projecoes: Lista; checklists: Lista }) {
  const lUsinas = computed(() => fontes.usinas.value ?? []);
  const lGeracoes = computed(() => fontes.geracoes.value ?? []);
  const lProjecoes = computed(() => fontes.projecoes.value ?? []);
  const lChecklists = computed(() => fontes.checklists.value ?? []);

  const { referencia } = useReferenciaAtual(fontes.geracoes as any);

  const usinaPorId = computed(() => new Map(lUsinas.value.map((u) => [String(u.id), u])));
  const nomeUsina = (id: number | string) => usinaPorId.value.get(String(id))?.nome ?? `Usina #${id}`;

  // projeção somada por usina/ano/mês
  const projPorUsinaMes = computed(() => {
    const m: Record<string, number> = {};
    lProjecoes.value.forEach((p) => {
      const k = `${p.idGeradora}-${p.ano}-${p.mes}`;
      m[k] = (m[k] || 0) + (parseInt(p.projecao) || 0);
    });
    return m;
  });

  const statusChecklist = (idUsina: number | string) => statusChecklistDe(lChecklists.value, idUsina);

  const alertas = computed(() => {
    const chave = (a: number, m: number) => Number(a) * 12 + (Number(m) - 1);
    const fim = chave(referencia.value.ano, referencia.value.mes);
    const ini = fim - 11;
    const abaixo: Record<string, number> = {};
    lGeracoes.value.forEach((g) => {
      const k = chave(g.ano, g.mes);
      if (k < ini || k > fim) return;
      const p = projPorUsinaMes.value[`${g.idGeradora}-${g.ano}-${g.mes}`];
      if (p && (parseInt(g.geracao) || 0) < p) abaixo[g.idGeradora] = (abaixo[g.idGeradora] || 0) + 1;
    });
    return Object.entries(abaixo)
      .filter(([, qtd]) => qtd >= 3)
      .map(([id, qtd]) => ({ id, nome: nomeUsina(id), usina: usinaPorId.value.get(id) ?? null, qtd, status: statusChecklist(id) }))
      .sort((a, b) => b.qtd - a.qtd);
  });

  return { alertas, referencia, projPorUsinaMes, statusChecklist, nomeUsina };
}
