// composables/useReferenciaAtual.ts
//
// Antes: "mês de referência" = mês anterior ao mês corrente do relógio do
// navegador. Isso quebra sempre que a importação de dados atrasa (ex: se
// hoje é dia 5 e a geração de outubro ainda não foi importada, o sistema
// mostrava "outubro" com tudo zerado em vez de mostrar setembro, que é o
// último mês com dado real).
//
// Agora: "mês de referência" = o mês/ano do registro de geração REAL mais
// recente que existe no banco. Usado por useMapaEnergia, Irregular e
// RelatorioGeracao/AnaliseGeracao para que todos concordem sobre "qual é o
// mês atual" a partir do mesmo critério.

import { computed, type Ref } from 'vue';
import type { RegistroGeracao, ReferenciaMes } from '~/types/energy';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function useReferenciaAtual(geracoes: Ref<RegistroGeracao[] | null>) {
  const referencia = computed<ReferenciaMes>(() => {
    const lista = (geracoes.value ?? []).filter(
      (g) => g && Number(g.geracao) > 0 && g.ano && g.mes,
    );
    if (!lista.length) {
      // Sem nenhum dado real ainda: cai para o mês corrente como último recurso.
      const hoje = new Date();
      return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
    }
    const maisRecente = lista.reduce((acc, item) => {
      if (item.ano > acc.ano) return item;
      if (item.ano === acc.ano && item.mes > acc.mes) return item;
      return acc;
    });
    return { mes: maisRecente.mes, ano: maisRecente.ano };
  });

  const mesReferenciaLabel = computed(() => `${MESES[referencia.value.mes - 1]} ${referencia.value.ano}`);

  return { referencia, mesReferenciaLabel };
}