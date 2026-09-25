// composables/useEnergyFormat.ts
// Formatação centralizada de números, moeda e unidades de energia.
// Antes, cada página repetia `.toLocaleString('pt-BR', {...})` com opções
// ligeiramente diferentes. Isso padroniza o resultado em toda a plataforma.

export function useEnergyFormat() {
  const numero = (valor: number | undefined | null, casas = 0): string =>
    (valor ?? 0).toLocaleString('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });

  const moeda = (valor: number | undefined | null): string =>
    `R$ ${(valor ?? 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const kwh = (valor: number | undefined | null): string => `${numero(valor)} kWh`;

  const mwh = (valorKwh: number | undefined | null): string =>
    `${numero((valorKwh ?? 0) / 1000, 1)} MWh`;

  const gwh = (valorKwh: number | undefined | null): string =>
    `${numero((valorKwh ?? 0) / 1_000_000, 2)} GWh`;

  const percentual = (valor: number | undefined | null, casas = 1): string =>
    `${(valor ?? 0).toFixed(casas)}%`;

  const co2 = (kg: number | undefined | null): string => `${numero(kg)} kgCO₂`;

  /** Escolhe a unidade (kWh/MWh/GWh) automaticamente pela magnitude do valor. */
  const energiaAuto = (valorKwh: number | undefined | null): string => {
    const v = valorKwh ?? 0;
    if (v >= 1_000_000) return gwh(v);
    if (v >= 1_000) return mwh(v);
    return kwh(v);
  };

  const atualizadoHa = (data: Date | string | undefined | null): string => {
    if (!data) return 'Sem dados de atualização';
    const then = new Date(data).getTime();
    const minutos = Math.round((Date.now() - then) / 60000);
    if (minutos < 1) return 'Atualizado agora';
    if (minutos < 60) return `Atualizado há ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `Atualizado há ${horas}h`;
    return `Sem atualização há ${Math.round(horas / 24)} dia(s)`;
  };

  return { numero, moeda, kwh, mwh, gwh, percentual, co2, energiaAuto, atualizadoHa };
}
