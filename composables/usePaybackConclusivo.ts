// composables/usePaybackConclusivo.ts
//
// Payback acumulado com a MESMA regra do relatório Conclusivo
// (components/relatorios/conclusivo.vue):
//   custo evitado do mês = economia injetada (valorInjTUSD + valorInjTE)
//                        + autoconsumo das usinas × tarifa (BT ou MT)
//   autoconsumo = max(0, geração − injeção); usinas 19 e 20 usam a geração toda
//   payback = soma dos meses até o mês de referência ÷ total investido
// Usado pela tela Início e pela tela Gráficos.

import { computed, type Ref } from 'vue';
import { useTarifas, tarifaKwh } from '~/composables/useTarifas';

type Lista = Ref<any[] | null | undefined>;

export const TOTAL_INVESTIDO = 8_854_468.32 + 8_005_328.88 + 7_021_350.76;
const num = (v: any) => Number(v) || 0;
// tarifa do mês (Gerenciamento › Parâmetros; sem período cadastrado → tarifa padrão)
const tarifaUsina = (u: any, ano: number, mes: number) => tarifaKwh(u.tensao, ano, mes);

export function usePaybackConclusivo(fontes: {
  usinas: Lista; geracoes: Lista; injecoes: Lista; relatorios: Lista;
  referencia: Ref<{ ano: number; mes: number }>;
}) {
  const { lista: tarifas } = useTarifas();
  const economiaAteRef = computed(() => {
    void tarifas.value; // recalcula quando as tarifas carregarem
    const usinas = fontes.usinas.value ?? [];
    const geracoes = fontes.geracoes.value ?? [];
    const injecoes = fontes.injecoes.value ?? [];
    const relatorios = fontes.relatorios.value ?? [];
    const refAno = Number(fontes.referencia.value.ano), refMes = Number(fontes.referencia.value.mes);

    const gera = new Map<string, number>();
    geracoes.forEach((g) => { const k = `${g.idGeradora}|${g.ano}|${g.mes}`; if (!gera.has(k)) gera.set(k, num(g.geracao)); });
    const inje = new Map<string, number>();
    injecoes.forEach((r) => { const k = `${r.idGeradora}|${r.ano}|${r.mes}`; inje.set(k, (inje.get(k) || 0) + num(r.injetadoFPonta) + num(r.injetadoPonta)); });
    const eco = new Map<string, number>();
    relatorios.forEach((r) => { const k = `${r.ano}|${r.mes}`; eco.set(k, (eco.get(k) || 0) + num(r.valorInjTUSD) + num(r.valorInjTE)); });

    const normais = usinas.filter((u) => u.id !== 19 && u.id !== 20);
    const excecao = usinas.filter((u) => u.id === 19 || u.id === 20);
    const chaves = new Set([...geracoes.map((g) => `${g.ano}|${g.mes}`), ...injecoes.map((r) => `${r.ano}|${r.mes}`)]);
    let total = 0;
    chaves.forEach((ch) => {
      const [ano, mes] = ch.split('|').map(Number);
      if (!(ano < refAno || (ano === refAno && mes <= refMes))) return;
      let auto = 0;
      normais.forEach((u) => {
        const k = `${u.id}|${ano}|${mes}`;
        auto += Math.max(0, (gera.get(k) || 0) - (inje.get(k) || 0)) * tarifaUsina(u, ano, mes);
      });
      excecao.forEach((u) => { auto += Math.max(0, gera.get(`${u.id}|${ano}|${mes}`) || 0) * tarifaUsina(u, ano, mes); });
      total += Number((auto + (eco.get(ch) || 0)).toFixed(2));
    });
    return total;
  });

  const paybackPct = computed(() => (TOTAL_INVESTIDO > 0 ? (economiaAteRef.value / TOTAL_INVESTIDO) * 100 : null));

  return { economiaAteRef, paybackPct, totalInvestido: TOTAL_INVESTIDO };
}
