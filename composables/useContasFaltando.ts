// composables/useContasFaltando.ts
//
// Varredura de contas faltando, usada pela notificação 📋 do topo (todas as
// páginas). Unidades L ou D devem ter um relatório de compensação para cada
// mês do ano, de janeiro até o último mês já importado. Cada mês sem
// relatório conta como uma conta faltando, agrupada por secretaria.
//
// Os dados ficam num cache de sessão (useState) e são recarregados quando
// ficam com mais de 5 minutos, para não refazer as requisições a cada página.

import { computed } from 'vue';
import { API_BASE_URL } from '~/base/link';

const SECRETARIAS: Record<string, string> = { E: 'Educação', S: 'Saúde', O: 'Outros', I: 'Iluminação', P: 'Praças' };
const VALIDADE_MS = 5 * 60 * 1000;

interface Base {
  unidades: any[] | null;
  relatorios: any[] | null;
  usinas: any[] | null;
  em: number;
  carregando: boolean;
}

export function useContasFaltando() {
  const base = useState<Base>('lx-base-dados', () => ({ unidades: null, relatorios: null, usinas: null, em: 0, carregando: false }));

  async function garantir(forcar = false) {
    const b = base.value;
    if (b.carregando) return;
    if (!forcar && b.unidades && Date.now() - b.em < VALIDADE_MS) return;
    b.carregando = true;
    try {
      const [unidades, relatorios, usinas] = await Promise.all([
        $fetch<any[]>(`${API_BASE_URL}/unidadecompensacao`),
        $fetch<any[]>(`${API_BASE_URL}/relatoriocompensacao/`),
        $fetch<any[]>(`${API_BASE_URL}/usina/`),
      ]);
      base.value = { unidades, relatorios, usinas, em: Date.now(), carregando: false };
    } catch {
      b.carregando = false;
    }
  }

  const num = (v: unknown) => Number(v) || 0;

  /** Último mês com fatura compensada registrada. */
  const refComp = computed(() => {
    let best: { ano: number; mes: number } | null = null;
    (base.value.relatorios ?? []).forEach((r: any) => {
      const tem = num(r.valorInjTUSD) + num(r.valorInjTE) + num(r.enerInjTUSD) + num(r.enerInjTE);
      if (!tem || !r.ano || !r.mes) return;
      const a = Number(r.ano), m = Number(r.mes);
      if (!best || a > best.ano || (a === best.ano && m > best.mes)) best = { ano: a, mes: m };
    });
    const hoje = new Date();
    return best ?? { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  });

  const contas = computed(() => {
    const { ano, mes } = refComp.value;
    const ativas = (base.value.unidades ?? []).filter((u: any) => u.status === 'L' || u.status === 'D');
    const tem = new Set(
      (base.value.relatorios ?? []).filter((r: any) => r.ano == ano).map((r: any) => `${r.idUnidadeCompensa}|${Number(r.mes)}`),
    );
    const porMes: { mes: number; total: number; sec: { nome: string; q: number }[] }[] = [];
    for (let m = mes; m >= 1; m--) {
      const sec: Record<string, number> = {};
      let total = 0;
      ativas.forEach((u: any) => {
        if (!tem.has(`${u.id}|${m}`)) { sec[u.secretaria] = (sec[u.secretaria] || 0) + 1; total++; }
      });
      if (total) {
        porMes.push({
          mes: m, total,
          sec: Object.entries(sec).map(([s, q]) => ({ nome: SECRETARIAS[s] ?? s, q })).sort((a, b) => b.q - a.q),
        });
      }
    }
    return {
      pronto: !!base.value.unidades,
      ano, ateMes: mes, ativas: ativas.length,
      total: porMes.reduce((s, x) => s + x.total, 0),
      porMes,
    };
  });

  const potenciaKwp = computed(() => (base.value.usinas ?? []).reduce((s: number, u: any) => s + (parseFloat(u.potencia) || 0), 0));

  return { garantir, contas, potenciaKwp };
}
