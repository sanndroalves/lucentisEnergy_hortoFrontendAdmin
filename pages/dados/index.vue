<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useHead } from "@vueuse/head";
import { API_BASE_URL } from "~/base/link";

useHead({ title: "Dados" });
definePageMeta({ middleware: "sidebase-auth" });

import UiParentCard from "@/components/shared/UiParentCard.vue";

const abaSelecionada = ref("geracao");
const tipos = [
  { label: "Geração",          value: "geracao"  },
  { label: "Usina Mensal",     value: "usina"    },
  { label: "Prédios Download", value: "predios"  },
  { label: "Semanal",          value: "semanal"  }
];

const usinas   = ref([]);
const unidades = ref([]);

const mesGeracao = ref(null);
const anoGeracao = ref(null);
const mesUsina   = ref(null);
const anoUsina   = ref(null);

onMounted(async () => {
  const fetchedUsinas   = await $fetch(`${API_BASE_URL}/usina/`);
  const fetchedUnidades = await $fetch(`${API_BASE_URL}/unidadecompensacao`);
  usinas.value   = fetchedUsinas   || [];
  unidades.value = fetchedUnidades || [];
  montarLinhas();
});

const linhasGeracao = ref([]);
const linhasUsina   = ref([]);

function montarLinhas() {
  linhasGeracao.value = usinas.value.map(u => ({ uc: u.uc, usina: u.id, nome: u.nome, valor: null }));
  linhasUsina.value   = usinas.value.map(u => ({ uc: u.uc, usina: u.id, nome: u.nome, consumokWh: null, valorRS: null, injetadoPonta: null, injetadoFPonta: null }));
  montarLinhasSemanal();
}

const prediosFiltrados = computed(() =>
  unidades.value.filter(i => ["E","S","O"].includes(i.secretaria) && ["L","M"].includes(i.status))
);

const loadingGeracao = ref(false);
const loadingUsina   = ref(false);
const snackbar       = ref(false);
const snackbarTexto  = ref("");

async function enviarGeracao() {
  try {
    loadingGeracao.value = true;
    for (const item of linhasGeracao.value) {
      await $fetch(`${API_BASE_URL}/relatoriogeracao/`, {
        method: "POST",
        body: { idGeradora: item.usina, geracao: item.valor || 0, mes: mesGeracao.value, ano: anoGeracao.value }
      });
    }
    snackbarTexto.value = "Gerações enviadas com sucesso!"; snackbar.value = true;
  } catch (e) {
    snackbarTexto.value = "Erro ao enviar gerações."; snackbar.value = true;
  } finally { loadingGeracao.value = false; }
}

async function enviarUsinaMensal() {
  try {
    loadingUsina.value = true;
    for (const item of linhasUsina.value) {
      await $fetch(`${API_BASE_URL}/relatoriousina/`, {
        method: "POST",
        body: { idGeradora: item.usina, injetadoPonta: item.injetadoPonta || 0, injetadoFPonta: item.injetadoFPonta || 0, consumoReais: item.valorRS || 0, consumoKWH: item.consumokWh || 0, mes: mesUsina.value, ano: anoUsina.value }
      });
    }
    snackbarTexto.value = "Dados das usinas enviados com sucesso!"; snackbar.value = true;
  } catch (e) {
    snackbarTexto.value = "Erro ao enviar dados das usinas."; snackbar.value = true;
  } finally { loadingUsina.value = false; }
}

function marcarDownload(item) { item.download = !item.download; }

const ANOS  = [2023,2024,2025,2026,2027,2028];
const MESES = [
  { v:1,l:'Janeiro'  },{ v:2,l:'Fevereiro'},{ v:3,l:'Março'    },{ v:4,l:'Abril'    },
  { v:5,l:'Maio'     },{ v:6,l:'Junho'    },{ v:7,l:'Julho'    },{ v:8,l:'Agosto'   },
  { v:9,l:'Setembro' },{ v:10,l:'Outubro' },{ v:11,l:'Novembro'},{ v:12,l:'Dezembro'}
];

// ── SEMANAL ───────────────────────────────────────────────────
const semanaInicio = ref('');
const semanaFim    = ref('');

// linhas da tabela semanal — uma por usina
const linhasSemanal = ref([]);

// monta as linhas quando usinas já estiverem carregadas
// (chamado de dentro do onMounted após montarLinhas)
function montarLinhasSemanal() {
  linhasSemanal.value = usinas.value.map(u => ({
    uc:    u.uc,
    nome:  u.nome,
    expr:  '',      // texto digitado pelo usuário, ex: "=100+152+250"
    valor: 0,       // resultado calculado
    erro:  false,
  }));
}

// avalia a expressão tipo "=100+152+250" ou "350"
function avaliarExpr(item) {
  let raw = item.expr.trim();
  if (!raw) { item.valor = 0; item.erro = false; return; }
  if (raw.startsWith('=')) raw = raw.slice(1);
  // permite apenas dígitos, pontos, vírgulas, operadores e espaços
  const sanitized = raw.replace(/,/g, '.').replace(/[^0-9+\-*/().\s]/g, '');
  try {
    // eslint-disable-next-line no-new-func
    const resultado = Function('"use strict"; return (' + sanitized + ')')();
    if (typeof resultado === 'number' && isFinite(resultado)) {
      item.valor = parseFloat(resultado.toFixed(2));
      item.erro  = false;
    } else {
      item.valor = 0; item.erro = true;
    }
  } catch {
    item.valor = 0; item.erro = true;
  }
}

const totalSemanal = computed(() =>
  linhasSemanal.value.reduce((a, i) => a + (i.valor || 0), 0)
);

const fmtData = (iso) => {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const periodoLabel = computed(() => {
  if (!semanaInicio.value && !semanaFim.value) return 'Período não selecionado';
  return `${fmtData(semanaInicio.value)} até ${fmtData(semanaFim.value)}`;
});

// PDF
import html2pdf from 'html2pdf.js';
const gerandoPDF = ref(false);
const gerarPDFSemanal = async () => {
  try {
    gerandoPDF.value = true;

    await nextTick();

    await document.fonts.ready;

    await new Promise(resolve => setTimeout(resolve, 1000));

    const element = document.getElementById('pdf-semanal');

    if (!element) {
      console.error('Elemento não encontrado');
      return;
    }

    const opt = {
      margin: 0,
      filename: `relatorio-semanal.pdf`,
      image: {
        type: 'jpeg',
        quality: 1
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'px',
        format: [794, 1123],
        orientation: 'portrait'
      }
    };

    const worker = html2pdf().set(opt).from(element);

    const pdf = await worker.toPdf().get('pdf');

    pdf.save(`relatorio-semanal.pdf`);

  } catch (err) {
    console.error(err);
  } finally {
    gerandoPDF.value = false;
  }
};

</script>

<template>
  <div class="dd-root">

    <!-- ══════════════════════════════
         HEADER DA PÁGINA
    ══════════════════════════════ -->
    <div class="dd-header">
      <div class="dd-header-left">
        <div class="dd-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <div>
          <nav class="dd-breadcrumb">
            <a href="/">Início</a><span>›</span>
            <a href="/">Gerenciamento</a><span>›</span>
            <span>Dados</span>
          </nav>
          <h1 class="dd-title">Dados</h1>
          <p class="dd-sub">Gerenciamento de lançamentos e inserção de dados no sistema</p>
        </div>
      </div>
      <img src="https://i.imgur.com/vpEwz5j.png" class="dd-header-img" alt="">
    </div>

    <div class="dd-body">

      <!-- ══════════════════════════════
           TABS
      ══════════════════════════════ -->
      <p class="dd-tabs-lbl">Selecione o módulo</p>
      <div class="dd-tabs">
        <button
          v-for="t in tipos" :key="t.value"
          class="dd-tab"
          :class="{ 'dd-tab-active': abaSelecionada===t.value }"
          :style="abaSelecionada===t.value ? {
            background: ({geracao:'#EEF2FF',usina:'#ECFDF5',predios:'#FFFBEB',semanal:'#F5F3FF'})[t.value],
            borderColor: ({geracao:'#4F46E5',usina:'#059669',predios:'#D97706',semanal:'#7C3AED'})[t.value],
            color: ({geracao:'#4F46E5',usina:'#059669',predios:'#D97706',semanal:'#7C3AED'})[t.value]
          } : {}"
          @click="abaSelecionada=t.value"
        >
          <!-- ícone por aba -->
          <div class="dd-tab-icon"
            :style="abaSelecionada===t.value
              ? { background: ({geracao:'#4F46E5',usina:'#059669',predios:'#D97706',semanal:'#7C3AED'})[t.value], color:'#fff' }
              : { background:'#F8FAFC', color:'#94A3B8' }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path v-if="t.value==='geracao'"  d="M13 10V3L4 14h7v7l9-11h-7z"/>
              <path v-if="t.value==='usina'"    d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              <path v-if="t.value==='predios'"  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <path v-if="t.value==='semanal'"  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
            </svg>
          </div>
          <span class="dd-tab-name">{{ t.label }}</span>
        </button>
      </div>

      <!-- ══════════════════════════════
           PAINEL — GERAÇÃO
      ══════════════════════════════ -->
      <transition name="dd-fade">
      <div v-if="abaSelecionada==='geracao'" class="dd-panel">

        <div class="dd-panel-hd" style="border-left-color:#4F46E5">
          <div class="dd-ph-num" style="background:#4F46E5">01</div>
          <div>
            <h3 class="dd-ph-title">Inserir Geração</h3>
            <p class="dd-ph-sub">Informe o kWh gerado por cada usina no período selecionado</p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="dd-filters">
          <div class="dd-fg">
            <span class="dd-flbl">Mês</span>
            <div class="dd-chip-row">
              <button v-for="m in MESES" :key="m.v"
                class="dd-chip" :class="mesGeracao===m.v ? 'dd-chip-indigo' : ''"
                @click="mesGeracao=m.v">{{ m.l.slice(0,3) }}</button>
            </div>
          </div>
          <div class="dd-fg">
            <span class="dd-flbl">Ano</span>
            <div class="dd-chip-row">
              <button v-for="a in ANOS" :key="a"
                class="dd-chip dd-chip-year" :class="anoGeracao===a ? 'dd-chip-indigo' : ''"
                @click="anoGeracao=a">{{ a }}</button>
            </div>
          </div>
        </div>

        <!-- Tabela -->
        <div class="dd-tbl-scroll">
          <table class="dd-table">
            <thead class="dd-thead-indigo">
              <tr>
                <th class="dd-th">UC</th>
                <th class="dd-th">Usina</th>
                <th class="dd-th" style="min-width:180px">Geração (kWh)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item,i) in linhasGeracao" :key="item.usina" class="dd-tr" :class="{'dd-tr-alt':i%2===1}">
                <td class="dd-td dd-mono">{{ item.uc }}</td>
                <td class="dd-td" style="font-weight:700">{{ item.nome }}</td>
                <td class="dd-td">
                  <input v-model="item.valor" type="number" class="dd-input" placeholder="0,00"/>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dd-panel-actions">
          <button class="dd-btn-send dd-btn-indigo" :disabled="loadingGeracao" @click="enviarGeracao">
            <span v-if="loadingGeracao" class="dd-spinner"></span>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {{ loadingGeracao ? 'Enviando...' : 'Enviar Geração' }}
          </button>
        </div>

      </div>
      </transition>

      <!-- ══════════════════════════════
           PAINEL — USINA MENSAL
      ══════════════════════════════ -->
      <transition name="dd-fade">
      <div v-if="abaSelecionada==='usina'" class="dd-panel">

        <div class="dd-panel-hd" style="border-left-color:#059669">
          <div class="dd-ph-num" style="background:#059669">02</div>
          <div>
            <h3 class="dd-ph-title">Usina Mensal</h3>
            <p class="dd-ph-sub">Consumo, fatura e injeções mensais de cada usina</p>
          </div>
        </div>

        <div class="dd-filters">
          <div class="dd-fg">
            <span class="dd-flbl">Mês</span>
            <div class="dd-chip-row">
              <button v-for="m in MESES" :key="m.v"
                class="dd-chip" :class="mesUsina===m.v ? 'dd-chip-green' : ''"
                @click="mesUsina=m.v">{{ m.l.slice(0,3) }}</button>
            </div>
          </div>
          <div class="dd-fg">
            <span class="dd-flbl">Ano</span>
            <div class="dd-chip-row">
              <button v-for="a in ANOS" :key="a"
                class="dd-chip dd-chip-year" :class="anoUsina===a ? 'dd-chip-green' : ''"
                @click="anoUsina=a">{{ a }}</button>
            </div>
          </div>
        </div>

        <div class="dd-tbl-scroll">
          <table class="dd-table">
            <thead class="dd-thead-green">
              <tr>
                <th class="dd-th">UC</th>
                <th class="dd-th">Usina</th>
                <th class="dd-th" style="min-width:150px">Consumo kWh</th>
                <th class="dd-th" style="min-width:150px">R$</th>
                <th class="dd-th" style="min-width:150px">Injet. Ponta</th>
                <th class="dd-th" style="min-width:150px">Injet. F.Ponta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item,i) in linhasUsina" :key="item.usina" class="dd-tr" :class="{'dd-tr-alt':i%2===1}">
                <td class="dd-td dd-mono">{{ item.uc }}</td>
                <td class="dd-td" style="font-weight:700">{{ item.nome }}</td>
                <td class="dd-td"><input v-model="item.consumokWh"    type="number" step="0.01" class="dd-input" placeholder="0,00"/></td>
                <td class="dd-td"><input v-model="item.valorRS"       type="number" step="0.01" class="dd-input" placeholder="0,00"/></td>
                <td class="dd-td"><input v-model="item.injetadoPonta" type="number" step="0.01" class="dd-input" placeholder="0,00"/></td>
                <td class="dd-td"><input v-model="item.injetadoFPonta"type="number" step="0.01" class="dd-input" placeholder="0,00"/></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dd-panel-actions">
          <button class="dd-btn-send dd-btn-green" :disabled="loadingUsina" @click="enviarUsinaMensal">
            <span v-if="loadingUsina" class="dd-spinner dd-spinner-green"></span>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {{ loadingUsina ? 'Enviando...' : 'Enviar Dados das Usinas' }}
          </button>
        </div>

      </div>
      </transition>

      <!-- ══════════════════════════════
           PAINEL — PRÉDIOS
      ══════════════════════════════ -->
      <transition name="dd-fade">
      <div v-if="abaSelecionada==='predios'" class="dd-panel">

        <div class="dd-panel-hd" style="border-left-color:#D97706">
          <div class="dd-ph-num" style="background:#D97706">03</div>
          <div>
            <h3 class="dd-ph-title">Prédios Download</h3>
            <p class="dd-ph-sub">Marque as unidades que terão arquivo gerado para download</p>
          </div>
        </div>

        <div class="dd-tbl-scroll">
          <table class="dd-table">
            <thead class="dd-thead-amber">
              <tr>
                <th class="dd-th">UC</th>
                <th class="dd-th">Prédio</th>
                <th class="dd-th" style="text-align:center;width:90px">Download</th>
                <th class="dd-th" style="text-align:center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item,i) in prediosFiltrados" :key="item.id" class="dd-tr" :class="{'dd-tr-alt':i%2===1}">
                <td class="dd-td dd-mono">{{ item.uc }}</td>
                <td class="dd-td" style="font-weight:600">{{ item.nome }}</td>
                <td class="dd-td" style="text-align:center">
                  <button class="dd-check-btn" :class="{'dd-check-on': item.download}" @click="marcarDownload(item)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                </td>
                <td class="dd-td" style="text-align:center">
                  <span v-if="item.download" class="dd-pill-green">
                    <span class="dd-pill-dot"></span>Download
                  </span>
                  <span v-else class="dd-pill-slate">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
      </transition>

      <!-- ══════════════════════════════
           PAINEL — SEMANAL
      ══════════════════════════════ -->
      <transition name="dd-fade">
      <div v-if="abaSelecionada==='semanal'" class="dd-panel">

        <div class="dd-panel-hd" style="border-left-color:#7C3AED">
          <div class="dd-ph-num" style="background:#7C3AED">04</div>
          <div>
            <h3 class="dd-ph-title">Relatório Semanal</h3>
            <p class="dd-ph-sub">Insira os dados de geração por usina e exporte o relatório PDF</p>
          </div>
        </div>

        <!-- Seleção de período -->
        <div class="dd-filters">
          <div class="dd-sem-periodo">
            <div class="dd-fg">
              <span class="dd-flbl">De</span>
              <input type="date" v-model="semanaInicio" class="dd-date-input" />
            </div>
            <div class="dd-sem-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
            <div class="dd-fg">
              <span class="dd-flbl">Até</span>
              <input type="date" v-model="semanaFim" class="dd-date-input" />
            </div>
            <div class="dd-sem-badge" v-if="semanaInicio && semanaFim">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ periodoLabel }}
            </div>
          </div>
          <p class="dd-sem-hint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Digite a geração diretamente ou use fórmulas como <code>=100+152+250</code> — o resultado é calculado automaticamente.
          </p>
        </div>

        <!-- Tabela de entrada tipo Excel -->
        <div class="dd-tbl-scroll">
          <table class="dd-table dd-tbl-excel">
            <thead class="dd-thead-violet">
              <tr>
                <th class="dd-th dd-th-uc">UC</th>
                <th class="dd-th">Usina</th>
                <th class="dd-th dd-th-expr">Fórmula / Valor</th>
                <th class="dd-th dd-th-result">Resultado (kWh)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in linhasSemanal" :key="item.uc"
                class="dd-tr" :class="{'dd-tr-alt': i%2===1, 'dd-tr-erro': item.erro}">
                <td class="dd-td dd-mono">{{ item.uc }}</td>
                <td class="dd-td" style="font-weight:600;min-width:180px">{{ item.nome }}</td>
                <!-- input tipo célula excel -->
                <td class="dd-td dd-td-excel">
                  <input
                    v-model="item.expr"
                    class="dd-excel-input"
                    :class="{ 'dd-excel-input-err': item.erro }"
                    placeholder="ex: =150+200+175"
                    @input="avaliarExpr(item)"
                    @blur="avaliarExpr(item)"
                    spellcheck="false"
                  />
                </td>
                <!-- resultado calculado -->
                <td class="dd-td dd-td-result">
                  <span v-if="item.erro" class="dd-result-err">Erro</span>
                  <span v-else-if="item.valor > 0" class="dd-result-val">
                    {{ item.valor.toLocaleString('pt-BR', {minimumFractionDigits:2}) }}
                  </span>
                  <span v-else class="dd-result-zero">—</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="dd-tfoot-row">
                <td colspan="3" class="dd-tfoot-lbl">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Total gerado no período
                </td>
                <td class="dd-tfoot-val">
                  {{ totalSemanal.toLocaleString('pt-BR', {minimumFractionDigits:2}) }} kWh
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="dd-panel-actions">
          <button class="dd-btn-send dd-btn-violet"
            :disabled="gerandoPDF || !semanaInicio || !semanaFim"
            @click="gerarPDFSemanal">
            <span v-if="gerandoPDF" class="dd-spinner"></span>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M8 13h8M8 17h5"/>
            </svg>
            {{ gerandoPDF ? 'Gerando PDF...' : 'Gerar PDF do Relatório' }}
          </button>
        </div>

      </div>
      </transition>

      <!-- ══════════════════════════════
           DOCUMENTO PDF SEMANAL (oculto, só para renderização)
      ══════════════════════════════ -->
      <div id="pdf-semanal" class="sem-pdf-doc">

        <!-- CAPA -->
        <div class="sem-pdf-cover">
          <div class="sem-pdf-cover-bg"></div>
          <div class="sem-pdf-cover-inner">
            <div class="sem-pdf-cover-logos">
              <img src="https://i.imgur.com/gHxwN0V.png" class="sem-pdf-logo" alt="Lucentis" />
              <div class="sem-pdf-cover-div-v"></div>
              <div>
                <p class="sem-pdf-cover-brand">Sistema LUCENTIS – Hortolândia</p>
                <p class="sem-pdf-cover-brand-sub">Monitoramento Energético Municipal</p>
              </div>
            </div>
            <div class="sem-pdf-cover-body">
              <p class="sem-pdf-cover-eyebrow">Documento Oficial · Geração Fotovoltaica</p>
              <h1 class="sem-pdf-cover-title">Relatório Semanal de<br>Geração de Energia</h1>
              <div class="sem-pdf-cover-periodo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ periodoLabel }}
              </div>
              <div class="sem-pdf-cover-stats">
                <div class="sem-pdf-cover-stat">
                  <span class="sem-pdf-stat-val">{{ linhasSemanal.filter(i=>i.valor>0).length }}</span>
                  <span class="sem-pdf-stat-lbl">Usinas com dados</span>
                </div>
                <div class="sem-pdf-stat-div"></div>
                <div class="sem-pdf-cover-stat">
                  <span class="sem-pdf-stat-val">{{ totalSemanal.toLocaleString('pt-BR',{minimumFractionDigits:2}) }}</span>
                  <span class="sem-pdf-stat-lbl">kWh gerados</span>
                </div>
              </div>
            </div>
            <div class="sem-pdf-cover-footer">
              <span>hortolandia.energy.lucentis.com.br</span>
              <span>Gerado em {{ new Date().toLocaleDateString('pt-BR') }}</span>
            </div>
          </div>
        </div>

        <!-- TABELA DE DADOS -->
        <div class="sem-pdf-section">
          <div class="sem-pdf-sec-hd">
            <div class="sem-pdf-sec-num">01</div>
            <div>
              <h2 class="sem-pdf-sec-title">Geração por Usina</h2>
              <p class="sem-pdf-sec-sub">Valores de geração fotovoltaica no período · {{ periodoLabel }}</p>
            </div>
          </div>

          <table class="sem-pdf-table">
            <thead>
              <tr>
                <th class="sem-pdf-th sem-pdf-th-uc">UC</th>
                <th class="sem-pdf-th">Usina</th>
                <th class="sem-pdf-th sem-pdf-th-r">Geração (kWh)</th>
                <th class="sem-pdf-th sem-pdf-th-r">% do Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in linhasSemanal.filter(r => r.valor > 0)" :key="item.uc"
                class="sem-pdf-tr" :class="{'sem-pdf-tr-alt': i%2===1}">
                <td class="sem-pdf-td sem-pdf-mono">{{ item.uc }}</td>
                <td class="sem-pdf-td sem-pdf-td-nome">{{ item.nome }}</td>
                <td class="sem-pdf-td sem-pdf-td-r sem-pdf-td-green">
                  {{ item.valor.toLocaleString('pt-BR', {minimumFractionDigits:2}) }}
                </td>
                <td class="sem-pdf-td sem-pdf-td-r">
                  <span class="sem-pdf-pct-pill">
                    {{ totalSemanal > 0 ? ((item.valor/totalSemanal)*100).toFixed(1) : '0' }}%
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="sem-pdf-tfoot">
                <td colspan="2" class="sem-pdf-tfoot-lbl">Total Geral do Período</td>
                <td class="sem-pdf-tfoot-val">{{ totalSemanal.toLocaleString('pt-BR',{minimumFractionDigits:2}) }} kWh</td>
                <td class="sem-pdf-tfoot-val">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- RODAPÉ DO DOCUMENTO -->
        <div class="sem-pdf-footer">
          <div class="sem-pdf-footer-left">
            <img src="https://i.imgur.com/gHxwN0V.png" class="sem-pdf-footer-logo" alt="Lucentis" />
            <div>
              <p class="sem-pdf-footer-brand">LUCENTIS ENERGY</p>
              <p class="sem-pdf-footer-sub">Sistema LUCENTIS – Hortolândia · Monitoramento Energético Municipal</p>
            </div>
          </div>
          <div class="sem-pdf-footer-right">
            <p>Relatório gerado em {{ new Date().toLocaleDateString('pt-BR') }}</p>
            <p>hortolandia.energy.lucentis.com.br</p>
          </div>
        </div>

      </div>

    </div>

    <!-- ══════════════════════════════
         SNACKBAR
    ══════════════════════════════ -->
    <transition name="dd-snack">
      <div v-if="snackbar" class="dd-snackbar" @click="snackbar=false">
        <div class="dd-snack-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        {{ snackbarTexto }}
      </div>
    </transition>

  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

/* ══════ ROOT ══════ */
.dd-root {
  min-height: 100vh !important;
  background: #F0FDF9 !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  color: #0f172a !important;
  padding-bottom: 48px !important;
}

/* ══════ HEADER ══════ */
.dd-header {
  background: linear-gradient(135deg, #ECFDF5 0%, #EEF2FF 100%) !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 24px 28px 20px !important;
  margin-bottom: 28px !important;
  display: flex !important; align-items: center !important;
  justify-content: space-between !important; overflow: hidden !important;
}
.dd-header-left  { display: flex !important; align-items: center !important; gap: 16px !important; }
.dd-header-icon  {
  width: 48px !important; height: 48px !important; border-radius: 13px !important;
  background: #059669 !important; display: flex !important;
  align-items: center !important; justify-content: center !important;
  box-shadow: 0 4px 14px rgba(5,150,105,.3) !important; flex-shrink: 0 !important;
}
.dd-breadcrumb   { display: flex !important; align-items: center !important; gap: 5px !important; font-size: 11px !important; color: #94A3B8 !important; margin-bottom: 3px !important; }
.dd-breadcrumb a { color: #059669 !important; text-decoration: none !important; font-weight: 600 !important; }
.dd-title        { font-size: 26px !important; font-weight: 900 !important; letter-spacing: -.03em !important; color: #0f172a !important; margin: 0 0 3px !important; line-height: 1 !important; }
.dd-sub          { font-size: 13px !important; color: #64748b !important; margin: 0 !important; }
.dd-header-img   { height: 100px !important; opacity: .85 !important; }

/* ══════ BODY ══════ */
.dd-body { padding: 0 28px !important; }

/* ══════ TABS ══════ */
.dd-tabs-lbl { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .14em !important; text-transform: uppercase !important; color: #94A3B8 !important; margin-bottom: 10px !important; display: block !important; }
.dd-tabs {
  display: flex !important; background: #ffffff !important;
  border: 1px solid #E2E8F0 !important; border-radius: 14px !important;
  padding: 5px !important; gap: 4px !important; margin-bottom: 24px !important;
  flex-wrap: wrap !important; box-shadow: 0 1px 4px rgba(0,0,0,.04) !important;
}
.dd-tab {
  flex: 1 !important; min-width: 120px !important;
  display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important;
  padding: 10px 14px !important; border-radius: 10px !important;
  border: 1.5px solid transparent !important; background: transparent !important;
  cursor: pointer !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  transition: all .15s !important; color: #64748b !important;
}
.dd-tab:hover { background: #F8FAFC !important; color: #0f172a !important; }
.dd-tab-icon {
  width: 28px !important; height: 28px !important; border-radius: 8px !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  flex-shrink: 0 !important; transition: all .15s !important;
}
.dd-tab-icon svg { stroke: currentColor !important; }
.dd-tab-name { font-size: 13px !important; font-weight: 700 !important; }

/* ══════ PANEL ══════ */
.dd-panel {
  background: #ffffff !important; border: 1px solid #E2E8F0 !important;
  border-radius: 16px !important; overflow: hidden !important;
  box-shadow: 0 1px 6px rgba(0,0,0,.05) !important;
}
.dd-panel-hd {
  display: flex !important; align-items: center !important; gap: 14px !important;
  padding: 18px 22px !important; border-bottom: 1px solid #F1F5F9 !important;
  background: #FAFBFF !important; border-left: 4px solid #059669 !important;
}
.dd-ph-num {
  width: 32px !important; height: 32px !important; border-radius: 9px !important;
  color: #fff !important; display: flex !important; align-items: center !important;
  justify-content: center !important; font-size: 13px !important; font-weight: 900 !important; flex-shrink: 0 !important;
}
.dd-ph-title { font-size: 16px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 0 2px !important; display: block !important; }
.dd-ph-sub   { font-size: 12px !important; color: #64748b !important; margin: 0 !important; }

/* ══════ FILTROS ══════ */
.dd-filters {
  padding: 18px 22px 14px !important;
  display: flex !important; flex-direction: column !important; gap: 14px !important;
  border-bottom: 1px solid #F1F5F9 !important;
}
.dd-fg    { display: flex !important; flex-direction: column !important; gap: 8px !important; }
.dd-flbl  { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .1em !important; text-transform: uppercase !important; color: #94A3B8 !important; }
.dd-chip-row { display: flex !important; gap: 5px !important; flex-wrap: wrap !important; }
.dd-chip {
  padding: 5px 12px !important; border-radius: 20px !important;
  border: 1.5px solid #E2E8F0 !important; background: #F8FAFC !important;
  color: #64748b !important; font-size: 12px !important; font-weight: 700 !important;
  cursor: pointer !important; transition: all .13s !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
}
.dd-chip:hover    { border-color: #94A3B8 !important; color: #0f172a !important; }
.dd-chip-year     { min-width: 56px !important; text-align: center !important; }
.dd-chip-indigo   { background: #4F46E5 !important; border-color: #4F46E5 !important; color: #ffffff !important; }
.dd-chip-green    { background: #059669 !important; border-color: #059669 !important; color: #ffffff !important; }

/* ══════ TABELA ══════ */
.dd-tbl-scroll { overflow-x: auto !important; }
.dd-table { width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important; background: #fff !important; }
.dd-thead-indigo th { background: #4F46E5 !important; color: #ffffff !important; }
.dd-thead-green  th { background: #059669 !important; color: #ffffff !important; }
.dd-thead-amber  th { background: #D97706 !important; color: #ffffff !important; }
.dd-th  { font-size: 10px !important; font-weight: 700 !important; letter-spacing: .07em !important; text-transform: uppercase !important; padding: 11px 14px !important; text-align: left !important; white-space: nowrap !important; border: none !important; }
.dd-tr:hover td { background: #F0FDF9 !important; }
.dd-tr-alt td   { background: #FAFBFF !important; }
.dd-td   { padding: 9px 14px !important; border-bottom: 1px solid #F1F5F9 !important; color: #0f172a !important; vertical-align: middle !important; }
.dd-mono { font-family: 'DM Mono', monospace !important; font-size: 11px !important; color: #64748b !important; }

/* Input inline */
.dd-input {
  width: 100% !important; min-width: 130px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 600 !important; color: #0f172a !important;
  background: #F8FAFC !important; border: 1.5px solid #E2E8F0 !important;
  border-radius: 9px !important; padding: 7px 12px !important;
  outline: none !important; transition: border-color .14s, box-shadow .14s !important;
}
.dd-input:focus { border-color: #059669 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(5,150,105,.1) !important; }
.dd-input::placeholder { color: #CBD5E1 !important; }
/* Remove arrows from number inputs */
.dd-input::-webkit-inner-spin-button,
.dd-input::-webkit-outer-spin-button { -webkit-appearance: none !important; }

/* ══════ AÇÃO ENVIAR ══════ */
.dd-panel-actions { padding: 16px 22px !important; border-top: 1px solid #F1F5F9 !important; display: flex !important; }
.dd-btn-send {
  display: flex !important; align-items: center !important; gap: 8px !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 800 !important; color: #fff !important;
  border: none !important; border-radius: 11px !important; padding: 11px 24px !important;
  cursor: pointer !important; transition: all .15s !important;
}
.dd-btn-send:disabled { opacity: .55 !important; cursor: not-allowed !important; }
.dd-btn-send svg { stroke: #fff !important; }
.dd-btn-indigo { background: #4F46E5 !important; box-shadow: 0 3px 12px rgba(79,70,229,.3) !important; }
.dd-btn-indigo:hover:not(:disabled) { background: #4338CA !important; transform: translateY(-1px) !important; }
.dd-btn-green  { background: #059669 !important; box-shadow: 0 3px 12px rgba(5,150,105,.3) !important; }
.dd-btn-green:hover:not(:disabled)  { background: #047857 !important; transform: translateY(-1px) !important; }
.dd-spinner {
  width: 14px !important; height: 14px !important; border-radius: 50% !important;
  border: 2px solid rgba(255,255,255,.3) !important; border-top-color: #fff !important;
  animation: ddSpin .7s linear infinite !important; flex-shrink: 0 !important;
}
@keyframes ddSpin { to { transform: rotate(360deg); } }

/* ══════ CHECKBOX customizado ══════ */
.dd-check-btn {
  width: 28px !important; height: 28px !important; border-radius: 7px !important;
  border: 1.5px solid #E2E8F0 !important; background: #F8FAFC !important;
  cursor: pointer !important; display: flex !important; align-items: center !important;
  justify-content: center !important; transition: all .13s !important; color: transparent !important;
  margin: 0 auto !important;
}
.dd-check-btn:hover { border-color: #059669 !important; background: #ECFDF5 !important; color: #059669 !important; }
.dd-check-on { background: #059669 !important; border-color: #059669 !important; color: #ffffff !important; }
.dd-check-btn svg { stroke: currentColor !important; }

/* ══════ PILLS ══════ */
.dd-pill-green {
  display: inline-flex !important; align-items: center !important; gap: 5px !important;
  background: #ECFDF5 !important; color: #047857 !important; border: 1px solid #A7F3D0 !important;
  font-size: 11px !important; font-weight: 700 !important; padding: 3px 10px !important; border-radius: 20px !important;
}
.dd-pill-slate {
  display: inline-flex !important; background: #F8FAFC !important; color: #94A3B8 !important;
  border: 1px solid #E2E8F0 !important; font-size: 11px !important; font-weight: 600 !important;
  padding: 3px 10px !important; border-radius: 20px !important;
}
.dd-pill-dot { width: 6px !important; height: 6px !important; border-radius: 50% !important; background: #059669 !important; }

/* ══════ EMPTY STATE ══════ */
.dd-empty-state {
  display: flex !important; flex-direction: column !important;
  align-items: center !important; justify-content: center !important;
  gap: 10px !important; padding: 52px 24px !important;
}
.dd-empty-icon {
  width: 56px !important; height: 56px !important; border-radius: 14px !important;
  background: #F5F3FF !important; display: flex !important;
  align-items: center !important; justify-content: center !important;
}
.dd-empty-title { font-size: 15px !important; font-weight: 800 !important; color: #475569 !important; margin: 0 !important; }
.dd-empty-sub   { font-size: 12px !important; color: #94A3B8 !important; margin: 0 !important; }

/* ══════ SNACKBAR ══════ */
.dd-snackbar {
  position: fixed !important; bottom: 24px !important; left: 50% !important;
  transform: translateX(-50%) !important;
  background: #059669 !important; color: #fff !important;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 700 !important;
  padding: 11px 20px !important; border-radius: 20px !important;
  box-shadow: 0 8px 28px rgba(5,150,105,.4) !important;
  display: flex !important; align-items: center !important; gap: 10px !important;
  cursor: pointer !important; z-index: 9999 !important; white-space: nowrap !important;
}
.dd-snack-icon {
  width: 22px !important; height: 22px !important; border-radius: 50% !important;
  background: rgba(255,255,255,.2) !important;
  display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important;
}
.dd-snack-icon svg { stroke: #fff !important; }
.dd-snack-enter-active { transition: all .22s ease !important; }
.dd-snack-leave-active { transition: all .16s ease !important; }
.dd-snack-enter-from, .dd-snack-leave-to { opacity: 0 !important; transform: translateX(-50%) translateY(12px) !important; }

/* ══════ TRANSIÇÃO DE PAINEL ══════ */
.dd-fade-enter-active { transition: all .2s ease !important; }
.dd-fade-leave-active { transition: all .14s ease !important; }
.dd-fade-enter-from, .dd-fade-leave-to { opacity: 0 !important; transform: translateY(6px) !important; }

/* ══════ RESPONSIVO ══════ */
@media (max-width: 640px) {
  .dd-header     { padding: 16px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .dd-header-img { display: none !important; }
  .dd-title      { font-size: 22px !important; }
  .dd-body       { padding: 0 16px !important; }
  .dd-tab        { min-width: 90px !important; padding: 8px 10px !important; }
}

/* ════════════════════════════════════════
   SEMANAL — INTERFACE
════════════════════════════════════════ */
.dd-btn-violet {
  background: #7C3AED !important;
  box-shadow: 0 3px 12px rgba(124,58,237,.3) !important;
}
.dd-btn-violet:hover:not(:disabled) {
  background: #6D28D9 !important;
  transform: translateY(-1px) !important;
}

.dd-sem-periodo {
  display: flex !important; align-items: flex-end !important;
  gap: 12px !important; flex-wrap: wrap !important;
}
.dd-sem-arrow {
  padding-bottom: 10px !important;
  display: flex !important; align-items: center !important;
}
.dd-date-input {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: 13px !important; font-weight: 600 !important; color: #0f172a !important;
  background: #F8FAFC !important; border: 1.5px solid #E2E8F0 !important;
  border-radius: 10px !important; padding: 9px 14px !important;
  outline: none !important; transition: border-color .14s, box-shadow .14s !important;
  cursor: pointer !important;
}
.dd-date-input:focus {
  border-color: #7C3AED !important;
  box-shadow: 0 0 0 3px rgba(124,58,237,.1) !important;
  background: #fff !important;
}
.dd-sem-badge {
  display: flex !important; align-items: center !important; gap: 6px !important;
  background: #F5F3FF !important; border: 1px solid #DDD6FE !important;
  border-radius: 20px !important; padding: 7px 14px !important;
  font-size: 12px !important; font-weight: 700 !important; color: #7C3AED !important;
  margin-bottom: 2px !important;
}
.dd-sem-badge svg { stroke: #7C3AED !important; flex-shrink: 0 !important; }
.dd-sem-hint {
  display: flex !important; align-items: center !important; gap: 6px !important;
  font-size: 12px !important; color: #64748b !important; margin: 0 !important;
}
.dd-sem-hint code {
  background: #F5F3FF !important; color: #7C3AED !important;
  padding: 2px 6px !important; border-radius: 5px !important;
  font-size: 12px !important; font-weight: 700 !important;
}

/* Tabela excel */
.dd-tbl-excel .dd-td { padding: 2px 10px !important; }
.dd-thead-violet th  { background: #7C3AED !important; color: #ffffff !important; }
.dd-th-uc     { width: 120px !important; }
.dd-th-expr   { min-width: 260px !important; }
.dd-th-result { width: 160px !important; text-align: right !important; }

/* Input tipo célula excel */
.dd-td-excel { padding: 3px 6px !important; }
.dd-excel-input {
  width: 100% !important;
  font-family: 'DM Mono', monospace !important;
  font-size: 13px !important; font-weight: 500 !important; color: #0f172a !important;
  background: transparent !important; border: 1.5px solid transparent !important;
  border-radius: 6px !important; padding: 6px 10px !important;
  outline: none !important; transition: all .13s !important;
}
.dd-excel-input:hover {
  background: #F8FAFC !important; border-color: #E2E8F0 !important;
}
.dd-excel-input:focus {
  background: #fff !important; border-color: #7C3AED !important;
  box-shadow: 0 0 0 3px rgba(124,58,237,.12) !important;
}
.dd-excel-input-err { border-color: #FECDD3 !important; background: #FFF1F2 !important; }
.dd-excel-input::placeholder { color: #CBD5E1 !important; font-style: italic !important; }

.dd-tr-erro td { background: #FFF1F2 !important; }

/* Resultado */
.dd-td-result { text-align: right !important; padding: 3px 14px !important; }
.dd-result-val  { font-family: 'DM Mono', monospace !important; font-size: 14px !important; font-weight: 700 !important; color: #059669 !important; }
.dd-result-zero { color: #CBD5E1 !important; font-size: 13px !important; }
.dd-result-err  { color: #E11D48 !important; font-size: 11px !important; font-weight: 700 !important; background: #FFF1F2 !important; padding: 2px 8px !important; border-radius: 20px !important; }

/* Rodapé da tabela */
.dd-tfoot-row td { background: #F5F3FF !important; border-top: 2px solid #DDD6FE !important; }
.dd-tfoot-lbl {
  padding: 11px 14px !important; font-size: 12px !important; font-weight: 800 !important;
  color: #7C3AED !important; display: flex !important; align-items: center !important; gap: 6px !important;
}
.dd-tfoot-lbl svg { stroke: #7C3AED !important; }
.dd-tfoot-val {
  padding: 11px 14px !important; text-align: right !important;
  font-family: 'DM Mono', monospace !important; font-size: 15px !important;
  font-weight: 900 !important; color: #7C3AED !important;
}

/* ════════════════════════════════════════
   SEMANAL — DOCUMENTO PDF
════════════════════════════════════════ */
.sem-pdf-doc {
  background: white;
  width: 794px;
}

/* Capa */
.sem-pdf-cover {
  position: relative !important;
  min-height: 320px !important;
  background: linear-gradient(140deg, #0c1420 0%, #1a1060 55%, #0f2518 100%) !important;
  overflow: hidden !important;
  display: flex !important;
}
.sem-pdf-cover-bg {
  position: absolute !important; inset: 0 !important;
  background:
    radial-gradient(ellipse at 75% 25%, rgba(124,58,237,.35) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 80%, rgba(5,150,105,.25) 0%, transparent 50%) !important;
  pointer-events: none !important;
}
.sem-pdf-cover-inner {
  position: relative !important; width: 100% !important;
  display: flex !important; flex-direction: column !important;
  padding: 36px 48px !important; gap: 24px !important;
}
.sem-pdf-cover-logos {
  display: flex !important; align-items: center !important; gap: 16px !important;
}
.sem-pdf-logo {
  height: 40px !important; object-fit: contain !important;
  filter: brightness(0) invert(1) !important; opacity: .9 !important;
}
.sem-pdf-cover-div-v {
  width: 1px !important; height: 36px !important;
  background: rgba(255,255,255,.2) !important;
}
.sem-pdf-cover-brand     { font-size: 13px !important; font-weight: 800 !important; color: #ffffff !important; margin: 0 0 2px !important; }
.sem-pdf-cover-brand-sub { font-size: 10px !important; color: rgba(255,255,255,.45) !important; margin: 0 !important; }

.sem-pdf-cover-eyebrow {
  font-size: 10px !important; font-weight: 700 !important; letter-spacing: .16em !important;
  text-transform: uppercase !important; color: #34D399 !important; margin: 0 0 8px !important;
}
.sem-pdf-cover-title {
  font-size: 30px !important; font-weight: 900 !important; color: #ffffff !important;
  letter-spacing: -.03em !important; line-height: 1.15 !important; margin: 0 0 16px !important;
}
.sem-pdf-cover-periodo {
  display: inline-flex !important; align-items: center !important; gap: 7px !important;
  background: rgba(255,255,255,.1) !important; border: 1px solid rgba(255,255,255,.18) !important;
  border-radius: 20px !important; padding: 6px 16px !important;
  font-size: 13px !important; font-weight: 700 !important; color: #ffffff !important;
  margin-bottom: 20px !important; width: fit-content !important;
}

/* stats capa */
.sem-pdf-cover-stats {
  display: flex !important; align-items: center !important;
  background: rgba(255,255,255,.07) !important; border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 12px !important; width: fit-content !important;
}
.sem-pdf-cover-stat {
  padding: 12px 24px !important; display: flex !important; flex-direction: column !important; gap: 3px !important;
}
.sem-pdf-stat-div { width: 1px !important; height: 32px !important; background: rgba(255,255,255,.14) !important; align-self: center !important; }
.sem-pdf-stat-val { font-size: 18px !important; font-weight: 900 !important; color: #34D399 !important; letter-spacing: -.02em !important; line-height: 1 !important; }
.sem-pdf-stat-lbl { font-size: 9px !important; font-weight: 600 !important; color: rgba(255,255,255,.4) !important; text-transform: uppercase !important; letter-spacing: .08em !important; }

.sem-pdf-cover-footer {
  display: flex !important; justify-content: space-between !important;
  border-top: 1px solid rgba(255,255,255,.1) !important; padding-top: 12px !important;
  font-size: 10px !important; color: rgba(255,255,255,.25) !important;
}

/* Seção de dados */
.sem-pdf-section { padding: 32px 48px !important; }
.sem-pdf-sec-hd {
  display: flex !important; align-items: center !important; gap: 14px !important;
  background: #F5F3FF !important; border-left: 4px solid #7C3AED !important;
  border-radius: 0 10px 10px 0 !important; padding: 14px 18px !important;
  margin-bottom: 20px !important;
}
.sem-pdf-sec-num {
  width: 32px !important; height: 32px !important; border-radius: 9px !important;
  background: #7C3AED !important; color: #fff !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  font-size: 13px !important; font-weight: 900 !important; flex-shrink: 0 !important;
}
.sem-pdf-sec-title { font-size: 16px !important; font-weight: 900 !important; color: #0f172a !important; margin: 0 0 2px !important; }
.sem-pdf-sec-sub   { font-size: 11px !important; color: #64748b !important; margin: 0 !important; }

/* Tabela PDF */
.sem-pdf-table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; border-radius: 10px !important; overflow: hidden !important; box-shadow: 0 1px 6px rgba(0,0,0,.06) !important; }
.sem-pdf-th { background: #7C3AED !important; color: #ffffff !important; font-size: 9px !important; font-weight: 700 !important; letter-spacing: .08em !important; text-transform: uppercase !important; padding: 10px 14px !important; text-align: left !important; }
.sem-pdf-th-uc { width: 120px !important; }
.sem-pdf-th-r  { text-align: right !important; }
.sem-pdf-tr td { border-bottom: 1px solid #F1F5F9 !important; }
.sem-pdf-tr-alt td { background: #F9F7FF !important; }
.sem-pdf-td { padding: 9px 14px !important; color: #0f172a !important; }
.sem-pdf-td-nome  { font-weight: 600 !important; }
.sem-pdf-td-r     { text-align: right !important; font-weight: 700 !important; font-family: 'DM Mono', monospace !important; }
.sem-pdf-td-green { color: #059669 !important; }
.sem-pdf-mono     { font-family: 'DM Mono', monospace !important; font-size: 11px !important; color: #64748b !important; }
.sem-pdf-pct-pill { display: inline-block !important; background: #F5F3FF !important; color: #7C3AED !important; font-size: 10px !important; font-weight: 800 !important; padding: 2px 8px !important; border-radius: 20px !important; }

/* Tfoot PDF */
.sem-pdf-tfoot td { background: #7C3AED !important; border-top: 2px solid #6D28D9 !important; }
.sem-pdf-tfoot-lbl { padding: 11px 14px !important; font-size: 12px !important; font-weight: 800 !important; color: #ffffff !important; }
.sem-pdf-tfoot-val { padding: 11px 14px !important; text-align: right !important; font-family: 'DM Mono', monospace !important; font-size: 14px !important; font-weight: 900 !important; color: #ffffff !important; }

/* Rodapé PDF */
.sem-pdf-footer {
  background: #0f172a !important; padding: 18px 48px !important;
  display: flex !important; align-items: center !important; justify-content: space-between !important;
}
.sem-pdf-footer-left { display: flex !important; align-items: center !important; gap: 12px !important; }
.sem-pdf-footer-logo { height: 24px !important; object-fit: contain !important; filter: brightness(0) invert(1) !important; opacity: .7 !important; }
.sem-pdf-footer-brand { font-size: 11px !important; font-weight: 900 !important; letter-spacing: .1em !important; color: #ffffff !important; margin: 0 !important; }
.sem-pdf-footer-sub   { font-size: 9px !important; color: rgba(255,255,255,.35) !important; margin: 0 !important; }
.sem-pdf-footer-right { font-size: 9px !important; color: rgba(255,255,255,.3) !important; text-align: right !important; }
.sem-pdf-footer-right p { margin: 0 !important; }

</style>