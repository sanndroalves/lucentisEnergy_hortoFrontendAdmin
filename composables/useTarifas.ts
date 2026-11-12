// composables/useTarifas.ts
//
// Parâmetros: tarifa da concessionária (R$/kWh) por período, cadastrada em
// Gerenciamento › Parâmetros (endpoint /tarifa/ do backend).
//
//   BT → um valor por período.
//   MT → quatro componentes por período (TUSD/TE ponta e fora ponta);
//        a tarifa usada nos cálculos é a média
//        ((TUSD_fp + TE_fp) + (TUSD_p + TE_p)) / 2  — mesma regra do Conclusivo.
//
// Mês sem período cadastrado (ou backend sem o endpoint) → usa TARIFA_PADRAO,
// que são os valores que ficavam fixos no código antes desta tela existir.
//
// Usado por: Conclusivo, payback (Início/Gráficos) e useMapaEnergia.

import { ref } from 'vue';
import { API_BASE_URL } from '~/base/link';

export type Tensao = 'BT' | 'MT';
export interface ComponentesMT { tusdPonta: number; tePonta: number; tusdForaPonta: number; teForaPonta: number }
export interface Tarifa {
  id: number; tensao: Tensao; inicio: string; fim: string | null;
  valor: string | null; tusdPonta: string | null; tePonta: string | null; tusdForaPonta: string | null; teForaPonta: string | null;
  observacao?: string;
}

export const TARIFA_PADRAO = {
  BT: 0.88,
  MT: { tusdPonta: 1.66642019, tePonta: 0.5722216, tusdForaPonta: 0.14734841, teForaPonta: 0.34908095 } as ComponentesMT,
};

export const mediaMT = (c: ComponentesMT) => ((c.tusdForaPonta + c.teForaPonta) + (c.tusdPonta + c.tePonta)) / 2;

const TARIFA_URL = `${String(API_BASE_URL).replace(/\/+$/, '')}/tarifa/`;

// estado compartilhado por todo o app (carrega uma vez)
const lista = ref<Tarifa[]>([]);
const status = ref<'idle' | 'carregando' | 'ok' | 'erro'>('idle');
const erro = ref<string | null>(null);
let promessa: Promise<void> | null = null;

export function carregarTarifas(forcar = false): Promise<void> {
  if (promessa && !forcar) return promessa;
  status.value = 'carregando';
  promessa = $fetch<Tarifa[]>(TARIFA_URL)
    .then((r) => { lista.value = Array.isArray(r) ? r : []; status.value = 'ok'; erro.value = null; })
    .catch((e: any) => {
      // sem o endpoint (backend antigo) ou fora do ar: os cálculos usam a tarifa padrão
      console.warn('[tarifas] usando tarifa padrão:', e?.message ?? e);
      lista.value = []; status.value = 'erro';
      erro.value = e?.statusCode === 404 ? 'O backend ainda não tem a tabela de parâmetros (rode a migração 0034_tarifa).' : (e?.data?.error || e?.message || 'Falha ao carregar');
    });
  return promessa;
}

// mês como número contínuo (ano*12 + mês-1) para comparar períodos
export const chaveMes = (ano: number, mes: number) => ano * 12 + (mes - 1);
export const chaveData = (iso: string | null | undefined) => {
  if (!iso) return null;
  const [y, m] = String(iso).split('-').map(Number);
  return chaveMes(y, m);
};
const n = (v: any) => Number(v) || 0;
const normTensao = (t: any): Tensao => (String(t || '').toUpperCase() === 'BT' ? 'BT' : 'MT');

export function periodoTarifa(tensao: any, ano: number, mes: number): Tarifa | null {
  const t = normTensao(tensao), k = chaveMes(Number(ano), Number(mes));
  return lista.value.find((p) => p.tensao === t && chaveData(p.inicio)! <= k && (p.fim == null || k <= chaveData(p.fim)!)) ?? null;
}

export function componentesMT(ano: number, mes: number): ComponentesMT {
  const p = periodoTarifa('MT', ano, mes);
  if (!p) return TARIFA_PADRAO.MT;
  return { tusdPonta: n(p.tusdPonta), tePonta: n(p.tePonta), tusdForaPonta: n(p.tusdForaPonta), teForaPonta: n(p.teForaPonta) };
}

// tarifa em R$/kWh usada nos cálculos para uma usina/unidade dessa tensão naquele mês
export function tarifaKwh(tensao: any, ano: number, mes: number): number {
  if (normTensao(tensao) === 'BT') {
    const p = periodoTarifa('BT', ano, mes);
    return p ? n(p.valor) : TARIFA_PADRAO.BT;
  }
  return mediaMT(componentesMT(ano, mes));
}

export function useTarifas() {
  if (status.value === 'idle') carregarTarifas();
  return { lista, status, erro, carregarTarifas, periodoTarifa, componentesMT, tarifaKwh, TARIFA_PADRAO, mediaMT, TARIFA_URL };
}
