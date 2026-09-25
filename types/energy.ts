// types/energy.ts
// Modelos tipados do domínio energético do LUCENTIS.
// Objetivo: eliminar `any` e centralizar o formato dos dados vindos da API
// (usina, unidade, geração, injeção, compensação) num único lugar.

export type Secretaria = 'E' | 'S' | 'O' | 'P' | 'I';

export interface Usina {
  id: number;
  nome: string;
  secretaria: Secretaria;
  endereco?: string;
  uc?: string;
  potencia?: number;
  qtdPlaca?: number;
  tensao?: 'BT' | 'MT' | string;
  latitude?: number;
  longitude?: number;
}

export interface UnidadeCompensacao {
  id: number;
  uc?: string;
  nome?: string;
  nomeUnidade?: string;
  secretaria: Secretaria;
  endereco?: string;
  logradouro?: string;
  mediaConsumo?: number;
  latitude?: number;
  longitude?: number;
}

export interface RegistroGeracao {
  idGeradora: number;
  uc?: string;
  mes: number;
  ano: number;
  geracao: number | string;
}

export interface RegistroInjecao {
  idGeradora: number;
  mes: number;
  ano: number;
  injetadoPonta: number | string;
  injetadoFPonta: number | string;
}

export interface RegistroCompensacao {
  idUnidadeCompensa: number;
  mes: number;
  ano: number;
  consumokWh: number | string;
  enerInjTUSD: number | string;
  valorInjTUSD: number | string;
  valorInjTE: number | string;
  saldoEnergia: number | string;
}

export interface ReferenciaMes {
  mes: number;
  ano: number;
}

/** Indicadores agregados que alimentam o painel do mapa (modo público/admin). */
export interface IndicadoresMapa {
  totalGerado: number;
  totalInjetado: number;
  totalCompensaSoma: number;
  totalPlacas: number;
  totalInvestido: number;
  totalCarbono: number;
  totalCarbonoTon: number;
  totalArvorePlantadas: number;
  geracaoMes: number;
  custoEvitadoTotal: number;
  saldoMes: number;
  taxaAutossuficiencia: number;
  consumoPorSecretaria: Record<'educacao' | 'saude' | 'outros', number>;
  consumoTotal: number;
}
