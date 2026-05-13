<script setup>
    import { API_BASE_URL } from '~/base/link';
    
    const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);

    const usinasAbaixo  = ref([])
    const segurarUsinas = ref([])

    for (let i=0; i<usinas.value.length; i++){
        const individual = usinas.value[i]
        const { data: proIndi }  = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${individual.id}&ano=2024`);
        const { data: geraIndi } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${individual.id}&ano=2024`);
        for (let a=0; a < geraIndi.value.length; a++){
            const projetado = proIndi.value[a]
            const gerado    = geraIndi.value[a]
            if(parseInt(gerado.geracao) < parseInt(projetado.projecao)){
                segurarUsinas.value.push(individual.id)
            }
        }
    }

    const encontrarIdRepetido = (array) => {
        const frequencia = {};
        array.forEach(id => { frequencia[id] = (frequencia[id] || 0) + 1; });
        Object.keys(frequencia).forEach(id => {
            if (frequencia[id] >= 3) usinasAbaixo.value.push({ usina: id, qtd: frequencia[id] });
        });
    };
    encontrarIdRepetido(segurarUsinas.value);

    const usinasProcuradas = ref([])

    const procurarUsina = async () => {
        for (let i=0; i < usinasAbaixo._rawValue.length; i++) {
          const { data: irregular } = await useFetch(`${API_BASE_URL}/irregular?idGeradora=${usinasAbaixo._rawValue[i].usina}`);
          if(irregular.value.length == 0){
              const response = await useFetch(`${API_BASE_URL}/irregular/`, { method:'POST', body:{ idGeradora:usinasAbaixo._rawValue[i].usina, qtdIrregular:1, qtdConhecimento:0, ultMes:usinasAbaixo._rawValue[i].qtd }, key:'GeradoraPost' });
              if(response){ console.log("DEU CERTO POST") } else { console.log("ERRO1 POST") }
              const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
              usinasProcuradas.value.push(individual.value);
          } else {
              if(Math.abs(irregular._rawValue[0].qtdIrregular - irregular._rawValue[0].qtdConhecimento) === 1){
                  if(irregular._rawValue[0].ultMes !== usinasAbaixo._rawValue[i].qtd){
                      const response = await useFetch(`${API_BASE_URL}/irregular/${irregular._rawValue[0].id}`, { method:'PUT', body:{ idGeradora:usinasAbaixo._rawValue[i].usina, qtdIrregular:irregular._rawValue[0].qtdIrregular, qtdConhecimento:irregular._rawValue[0].qtdConhecimento, ultMes:usinasAbaixo._rawValue[i].qtd }, key:'unidadePut' });
                      if(response){ console.log("DEU CERTO PUT") } else { console.log("ERRO1 PUT") }
                  }
                  const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
                  usinasProcuradas.value.push(individual.value);
              } else {
                  if(irregular._rawValue[0].ultMes !== usinasAbaixo._rawValue[i].qtd){
                      const response = await useFetch(`${API_BASE_URL}/irregular/${irregular._rawValue[0].id}`, { method:'PUT', body:{ idGeradora:usinasAbaixo._rawValue[i].usina, qtdIrregular:irregular._rawValue[0].qtdIrregular+1, qtdConhecimento:irregular._rawValue[0].qtdConhecimento, ultMes:irregular._rawValue[0].ultMes }, key:'unidadePut' });
                      if(response){ console.log("DEU CERTO PUT2") } else { console.log("ERRO1 PUT2") }
                      const { data: individual } = await useFetch(`${API_BASE_URL}/usina/${usinasAbaixo._rawValue[i].usina}`);
                      usinasProcuradas.value.push(individual.value);
                  }
              }
          }
        }
    }
    procurarUsina(usinasAbaixo)

    const aberto = ref(false)

    const removerIndica = async(idGeradora) => {
        const { data: irregular } = await useFetch(`${API_BASE_URL}/irregular?idGeradora=${idGeradora}`);
        let filtroUsina = null;
        for (const item of usinasAbaixo._rawValue) {
            if (item.usina == idGeradora) { filtroUsina = item.qtd; break; }
        }
        const response = await useFetch(`${API_BASE_URL}/irregular/${irregular._rawValue[0].id}`, { method:'PUT', body:{ qtdIrregular:irregular._rawValue[0].qtdIrregular, qtdConhecimento:irregular._rawValue[0].qtdConhecimento+1, ultMes:filtroUsina }, key:'unidadePut' });
        if(response){
            const idx = usinasProcuradas.value.findIndex(i => i.id === idGeradora);
            if (idx !== -1) usinasProcuradas.value.splice(idx, 1);
        } else { console.log("ERRO1") }
    }
</script>

<template>
  <div class="ir-root">

    <!-- Cabeçalho colapsável -->
    <div class="ir-header" @click="aberto = !aberto">
      <div class="ir-header-left">
        <div class="ir-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <p class="ir-eyebrow">Monitoramento · Usinas</p>
          <div class="ir-title-row">
            <h3 class="ir-title">Déficit de Gerações</h3>
            <span class="ir-count-badge">{{ usinasProcuradas.length }}</span>
          </div>
          <p class="ir-sub">Gerações irregulares há mais de 3 meses</p>
        </div>
      </div>
      <div class="ir-chevron" :class="{ 'ir-chevron-open': aberto }">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>

    <!-- Conteúdo -->
    <transition name="ir-expand">
      <div v-if="aberto" class="ir-body">

        <!-- Empty state -->
        <div v-if="usinasProcuradas.length === 0" class="ir-empty">
          <div class="ir-empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span class="ir-empty-txt">Todas as usinas operando normalmente</span>
        </div>

        <!-- Lista de usinas irregulares -->
        <div v-for="usina in usinasProcuradas" :key="usina.id" class="ir-item">
          <div class="ir-item-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="ir-item-info">
            <span class="ir-item-uc">{{ usina.uc }}</span>
            <span class="ir-item-nome">{{ usina.nome }}</span>
          </div>
          <button class="ir-remove-btn" @click.stop="removerIndica(usina.id)" title="Remover indicação">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

      </div>
    </transition>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

/* ══════ ROOT ══════ */
.ir-root {
  background: #ffffff !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  border: 1px solid #FDE68A !important;
}

/* ══════ HEADER ══════ */
.ir-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 16px 18px !important;
  cursor: pointer !important;
  background: linear-gradient(135deg, #FFFBEB, #FFF7ED) !important;
  border-bottom: 1px solid #FDE68A !important;
  transition: background .15s !important;
  user-select: none !important;
}
.ir-header:hover { background: linear-gradient(135deg, #FEF3C7, #FFEDD5) !important; }
.ir-header-left { display: flex !important; align-items: center !important; gap: 12px !important; flex: 1 !important; }

.ir-icon {
  width: 36px !important; height: 36px !important; border-radius: 10px !important;
  background: #D97706 !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-shadow: 0 3px 10px rgba(217,119,6,.3) !important; flex-shrink: 0 !important;
}
.ir-eyebrow {
  font-size: 9px !important; font-weight: 700 !important; letter-spacing: .12em !important;
  text-transform: uppercase !important; color: #D97706 !important; margin: 0 0 2px !important;
}
.ir-title-row { display: flex !important; align-items: center !important; gap: 8px !important; margin-bottom: 2px !important; }
.ir-title { font-size: 14px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 !important; }
.ir-count-badge {
  background: #D97706 !important; color: #ffffff !important;
  font-size: 10px !important; font-weight: 800 !important;
  padding: 1px 8px !important; border-radius: 20px !important;
  min-width: 22px !important; text-align: center !important;
}
.ir-sub { font-size: 11px !important; color: #92400E !important; margin: 0 !important; opacity: .7 !important; }

/* Chevron */
.ir-chevron { color: #D97706 !important; transition: transform .22s ease !important; flex-shrink: 0 !important; }
.ir-chevron-open { transform: rotate(180deg) !important; }

/* ══════ BODY ══════ */
.ir-body { padding: 8px 0 !important; }

/* Empty state */
.ir-empty {
  display: flex !important; align-items: center !important; gap: 10px !important;
  padding: 16px 18px !important;
  background: #ECFDF5 !important; border-radius: 10px !important;
  margin: 8px 12px !important; border: 1px solid #A7F3D0 !important;
}
.ir-empty-icon {
  width: 30px !important; height: 30px !important; border-radius: 8px !important;
  background: #D1FAE5 !important; display: flex !important;
  align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
}
.ir-empty-txt { font-size: 12px !important; font-weight: 700 !important; color: #047857 !important; }

/* Itens de usina */
.ir-item {
  display: flex !important; align-items: center !important; gap: 12px !important;
  padding: 11px 18px !important; transition: background .13s !important;
  border-bottom: 1px solid #FEF3C7 !important;
}
.ir-item:last-child { border-bottom: none !important; }
.ir-item:hover { background: #FFFBEB !important; }

.ir-item-icon {
  width: 32px !important; height: 32px !important; border-radius: 9px !important;
  background: #FFFBEB !important; border: 1px solid #FDE68A !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  flex-shrink: 0 !important;
}
.ir-item-info { display: flex !important; flex-direction: column !important; gap: 2px !important; flex: 1 !important; min-width: 0 !important; }
.ir-item-uc   { font-family: 'DM Mono', monospace !important; font-size: 11px !important; color: #64748b !important; }
.ir-item-nome { font-size: 13px !important; font-weight: 700 !important; color: #0f172a !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

/* Botão remover */
.ir-remove-btn {
  width: 26px !important; height: 26px !important; border-radius: 7px !important;
  border: 1px solid #FDE68A !important; background: #FFFBEB !important;
  color: #D97706 !important; cursor: pointer !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  flex-shrink: 0 !important; transition: all .13s !important;
}
.ir-remove-btn:hover { background: #D97706 !important; color: #fff !important; border-color: #D97706 !important; }
.ir-remove-btn svg { stroke: currentColor !important; }

/* ══════ TRANSIÇÃO ══════ */
.ir-expand-enter-active { transition: all .24s ease !important; overflow: hidden !important; }
.ir-expand-leave-active { transition: all .18s ease !important; overflow: hidden !important; }
.ir-expand-enter-from, .ir-expand-leave-to { opacity: 0 !important; transform: translateY(-6px) !important; }
</style>