<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useHead } from "@vueuse/head";
import { API_BASE_URL } from "~/base/link";

useHead({ title: "Dados" });
definePageMeta({ middleware: "sidebase-auth" });

import UiParentCard from "@/components/shared/UiParentCard.vue";

// "predios" não tem card: abre pelo botão discreto do cabeçalho
const abaSelecionada = ref("geracao");
const ABAS = [
  { v: "geracao", txt: "Geração",      sub: "kWh gerado por usina no mês",    c: "--teal",   c2: "--purple", d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { v: "usina",   txt: "Usina mensal", sub: "Consumo, fatura e injeções",     c: "--green",  c2: "--teal",   d: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { v: "semanal", txt: "Semanal",      sub: "Relatório da semana em PDF",     c: "--purple", c2: "--orange", d: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
];
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

const carregandoUsinas = ref(true);

onMounted(async () => {
  try {
    const [fetchedUsinas, fetchedUnidades] = await Promise.all([
      $fetch(`${API_BASE_URL}/usina/`),
      $fetch(`${API_BASE_URL}/unidadecompensacao`),
    ]);
    usinas.value   = fetchedUsinas   || [];
    unidades.value = fetchedUnidades || [];
    montarLinhas();
  } finally {
    carregandoUsinas.value = false;
  }
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
const snackbarErro   = ref(false);
let snackTimer = 0;
function avisar(texto, erro = false) {
  snackbarTexto.value = texto; snackbarErro.value = erro; snackbar.value = true;
  clearTimeout(snackTimer); snackTimer = setTimeout(() => { snackbar.value = false; }, 4000);
}

async function enviarGeracao() {
  try {
    loadingGeracao.value = true;
    for (const item of linhasGeracao.value) {
      await $fetch(`${API_BASE_URL}/relatoriogeracao/`, {
        method: "POST",
        body: { idGeradora: item.usina, geracao: item.valor || 0, mes: mesGeracao.value, ano: anoGeracao.value }
      });
    }
    avisar("Gerações enviadas com sucesso!");
  } catch (e) {
    avisar("Erro ao enviar gerações.", true);
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
    avisar("Dados das usinas enviados com sucesso!");
  } catch (e) {
    avisar("Erro ao enviar dados das usinas.", true);
  } finally { loadingUsina.value = false; }
}

function marcarDownload(item) { item.download = !item.download; }

const ANOS  = [2023,2024,2025,2026,2027,2028];
const MESES = [
  { v:1,l:'Janeiro'  },{ v:2,l:'Fevereiro'},{ v:3,l:'Março'    },{ v:4,l:'Abril'    },
  { v:5,l:'Maio'     },{ v:6,l:'Junho'    },{ v:7,l:'Julho'    },{ v:8,l:'Agosto'   },
  { v:9,l:'Setembro' },{ v:10,l:'Outubro' },{ v:11,l:'Novembro'},{ v:12,l:'Dezembro'}
];
const periodoTxt = (m, a) => (m && a ? `${MESES[m - 1].l} de ${a}` : "Selecione mês e ano");

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
    avisar("Não foi possível gerar o PDF.", true);
  } finally {
    // segurança: se o html2pdf falhar, a camada dele não pode ficar presa na tela
    document.querySelectorAll('.html2pdf__overlay').forEach(n => n.remove());
    gerandoPDF.value = false;
  }
};

</script>

<template>
  <div class="lx-page">
    <!-- Cabeçalho -->
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span><span>Gerenciamento</span><span class="sep">›</span><b>Dados</b>
          <template v-if="abaSelecionada === 'predios'"><span class="sep">›</span><b>Prédios download</b></template>
        </nav>
        <h1 class="lx-title">Lançamento de <span class="grad">dados</span></h1>
        <p class="lx-sub">Inserção de geração, dados mensais das usinas e relatório semanal</p>
      </div>
      <div class="lx-head-actions">
        <button class="dd-escondido" :class="{ on: abaSelecionada === 'predios' }" :aria-pressed="abaSelecionada === 'predios'"
          title="Marcar prédios para download" @click="abaSelecionada = 'predios'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          Prédios download
        </button>
      </div>
    </header>

    <!-- Abas -->
    <nav class="dd-abas" aria-label="Tipo de lançamento">
      <button v-for="a in ABAS" :key="a.v" class="dd-aba" :class="{ on: abaSelecionada === a.v }" :aria-current="abaSelecionada === a.v ? 'page' : undefined"
        :style="{ '--c': `var(${a.c})`, '--c2': `var(${a.c2})` }" @click="abaSelecionada = a.v">
        <span class="dd-aba-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="a.d"/></svg>
        </span>
        <span class="dd-aba-tx"><b>{{ a.txt }}</b><small>{{ a.sub }}</small></span>
      </button>
    </nav>

    <div v-if="carregandoUsinas" class="lx-panel">
      <div class="lx-loading"><span class="lx-spin"></span><b>Carregando usinas…</b><span>Montando as tabelas de lançamento</span></div>
    </div>

    <template v-else>
      <!-- ── GERAÇÃO ── -->
      <Transition name="lx-fade" mode="out-in">
        <section v-if="abaSelecionada === 'geracao'" key="geracao" class="lx-panel accent" style="--c:var(--teal)">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--teal)">⚡</span>Inserir geração</h3>
              <p>kWh gerado por cada usina no mês selecionado</p>
            </div>
            <span class="lx-pill" :style="{ '--c': mesGeracao && anoGeracao ? 'var(--teal)' : 'var(--orange)' }"><i></i>{{ periodoTxt(mesGeracao, anoGeracao) }}</span>
          </div>

          <div class="dd-filtros">
            <div class="lx-field"><label>Mês</label>
              <div class="lx-anos"><button v-for="m in MESES" :key="m.v" class="lx-ano" :class="{ on: mesGeracao === m.v }" style="--c:var(--teal)" @click="mesGeracao = m.v">{{ m.l.slice(0, 3) }}</button></div>
            </div>
            <div class="lx-field"><label>Ano</label>
              <div class="lx-anos"><button v-for="a in ANOS" :key="a" class="lx-ano" :class="{ on: anoGeracao === a }" style="--c:var(--teal)" @click="anoGeracao = a">{{ a }}</button></div>
            </div>
          </div>

          <div class="lx-tbl-wrap">
            <table class="lx-tbl dd-tbl">
              <thead><tr><th>UC</th><th>Usina</th><th class="dd-col-in">Geração (kWh)</th></tr></thead>
              <tbody>
                <tr v-for="item in linhasGeracao" :key="item.usina">
                  <td class="lx-mono">{{ item.uc }}</td>
                  <td class="dd-nome">{{ item.nome }}</td>
                  <td><input v-model="item.valor" type="number" class="lx-input dd-in" placeholder="0,00" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="dd-acoes">
            <small v-if="!mesGeracao || !anoGeracao" class="dd-aviso">Selecione o mês e o ano antes de enviar.</small>
            <button class="lx-btn" style="--c1:var(--teal);--c2:var(--purple)" :disabled="loadingGeracao || !mesGeracao || !anoGeracao" @click="enviarGeracao">
              <span v-if="loadingGeracao" class="lx-spin"></span>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              {{ loadingGeracao ? 'Enviando…' : 'Enviar geração' }}
            </button>
          </div>
        </section>

        <!-- ── USINA MENSAL ── -->
        <section v-else-if="abaSelecionada === 'usina'" key="usina" class="lx-panel accent" style="--c:var(--green)">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--green)">☀</span>Usina mensal</h3>
              <p>Consumo, fatura e injeções mensais de cada usina</p>
            </div>
            <span class="lx-pill" :style="{ '--c': mesUsina && anoUsina ? 'var(--green)' : 'var(--orange)' }"><i></i>{{ periodoTxt(mesUsina, anoUsina) }}</span>
          </div>

          <div class="dd-filtros">
            <div class="lx-field"><label>Mês</label>
              <div class="lx-anos"><button v-for="m in MESES" :key="m.v" class="lx-ano" :class="{ on: mesUsina === m.v }" style="--c:var(--green)" @click="mesUsina = m.v">{{ m.l.slice(0, 3) }}</button></div>
            </div>
            <div class="lx-field"><label>Ano</label>
              <div class="lx-anos"><button v-for="a in ANOS" :key="a" class="lx-ano" :class="{ on: anoUsina === a }" style="--c:var(--green)" @click="anoUsina = a">{{ a }}</button></div>
            </div>
          </div>

          <div class="lx-tbl-wrap">
            <table class="lx-tbl dd-tbl">
              <thead><tr><th>UC</th><th>Usina</th><th class="dd-col-in">Consumo kWh</th><th class="dd-col-in">R$</th><th class="dd-col-in">Injet. ponta</th><th class="dd-col-in">Injet. f. ponta</th></tr></thead>
              <tbody>
                <tr v-for="item in linhasUsina" :key="item.usina">
                  <td class="lx-mono">{{ item.uc }}</td>
                  <td class="dd-nome">{{ item.nome }}</td>
                  <td><input v-model="item.consumokWh" type="number" step="0.01" class="lx-input dd-in" placeholder="0,00" /></td>
                  <td><input v-model="item.valorRS" type="number" step="0.01" class="lx-input dd-in" placeholder="0,00" /></td>
                  <td><input v-model="item.injetadoPonta" type="number" step="0.01" class="lx-input dd-in" placeholder="0,00" /></td>
                  <td><input v-model="item.injetadoFPonta" type="number" step="0.01" class="lx-input dd-in" placeholder="0,00" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="dd-acoes">
            <small v-if="!mesUsina || !anoUsina" class="dd-aviso">Selecione o mês e o ano antes de enviar.</small>
            <button class="lx-btn" style="--c1:var(--green);--c2:var(--teal)" :disabled="loadingUsina || !mesUsina || !anoUsina" @click="enviarUsinaMensal">
              <span v-if="loadingUsina" class="lx-spin"></span>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              {{ loadingUsina ? 'Enviando…' : 'Enviar dados das usinas' }}
            </button>
          </div>
        </section>

        <!-- ── SEMANAL ── -->
        <section v-else-if="abaSelecionada === 'semanal'" key="semanal" class="lx-panel accent" style="--c:var(--purple)">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--purple)">▤</span>Relatório semanal</h3>
              <p>Geração por usina no período e exportação do relatório em PDF</p>
            </div>
            <span class="lx-pill" :style="{ '--c': semanaInicio && semanaFim ? 'var(--purple)' : 'var(--orange)' }"><i></i>{{ periodoLabel }}</span>
          </div>

          <div class="dd-filtros">
            <div class="dd-periodo">
              <div class="lx-field"><label for="dd-de">De</label><input id="dd-de" v-model="semanaInicio" type="date" class="lx-input" /></div>
              <span class="dd-seta">→</span>
              <div class="lx-field"><label for="dd-ate">Até</label><input id="dd-ate" v-model="semanaFim" type="date" class="lx-input" /></div>
            </div>
            <p class="dd-dica">Digite a geração direto ou use fórmulas como <code>=100+152+250</code>; o resultado é calculado na hora.</p>
          </div>

          <div class="lx-tbl-wrap">
            <table class="lx-tbl dd-tbl">
              <thead><tr><th>UC</th><th>Usina</th><th class="dd-col-expr">Fórmula / valor</th><th class="r">Resultado (kWh)</th></tr></thead>
              <tbody>
                <tr v-for="item in linhasSemanal" :key="item.uc" :class="{ 'dd-erro': item.erro }">
                  <td class="lx-mono">{{ item.uc }}</td>
                  <td class="dd-nome">{{ item.nome }}</td>
                  <td>
                    <input v-model="item.expr" class="lx-input dd-in dd-expr" :class="{ err: item.erro }" placeholder="ex: =150+200+175" spellcheck="false"
                      @input="avaliarExpr(item)" @blur="avaliarExpr(item)" />
                  </td>
                  <td class="r dd-res">
                    <span v-if="item.erro" class="lx-pill" style="--c:var(--red)">Erro</span>
                    <b v-else-if="item.valor > 0">{{ item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</b>
                    <span v-else class="dd-zero">—</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3">Total gerado no período</td>
                  <td class="r dd-total">{{ totalSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }} kWh</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="dd-acoes">
            <small v-if="!semanaInicio || !semanaFim" class="dd-aviso">Selecione o período para gerar o PDF.</small>
            <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" :disabled="gerandoPDF || !semanaInicio || !semanaFim" @click="gerarPDFSemanal">
              <span v-if="gerandoPDF" class="lx-spin"></span>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/></svg>
              {{ gerandoPDF ? 'Gerando PDF…' : 'Gerar PDF do relatório' }}
            </button>
          </div>
        </section>

        <!-- ── PRÉDIOS DOWNLOAD (aba escondida) ── -->
        <section v-else-if="abaSelecionada === 'predios'" key="predios" class="lx-panel accent" style="--c:var(--orange)">
          <div class="lx-panel-hd">
            <div>
              <h3><span class="lx-ic" style="--c:var(--orange)">⌂</span>Prédios download</h3>
              <p>Marque as unidades que terão arquivo gerado para download</p>
            </div>
            <div class="dd-hd-r">
              <span class="lx-pill" style="--c:var(--orange)">{{ prediosFiltrados.filter(p => p.download).length }} de {{ prediosFiltrados.length }} marcados</span>
              <button class="lx-btn-ghost sm" @click="abaSelecionada = 'geracao'">Fechar</button>
            </div>
          </div>

          <div class="lx-tbl-wrap">
            <table class="lx-tbl dd-tbl">
              <thead><tr><th>UC</th><th>Prédio</th><th class="c">Download</th><th class="c">Status</th></tr></thead>
              <tbody>
                <tr v-for="item in prediosFiltrados" :key="item.id">
                  <td class="lx-mono">{{ item.uc }}</td>
                  <td class="dd-nome">{{ item.nome }}</td>
                  <td class="c">
                    <button class="dd-check" :class="{ on: item.download }" :aria-pressed="!!item.download" :aria-label="`Marcar ${item.nome} para download`" @click="marcarDownload(item)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </td>
                  <td class="c">
                    <span v-if="item.download" class="lx-pill" style="--c:var(--green)"><i></i>Download</span>
                    <span v-else class="dd-zero">—</span>
                  </td>
                </tr>
                <tr v-if="!prediosFiltrados.length"><td colspan="4" class="lx-empty">Nenhum prédio ativo encontrado.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </Transition>
    </template>

    <!-- Documento do PDF semanal: fica fora da tela, só é usado para gerar o arquivo -->
    <div class="dd-pdf-host" aria-hidden="true">
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

    <!-- Aviso -->
    <Transition name="dd-toast">
      <div v-if="snackbar" class="dd-toast" :class="{ err: snackbarErro }" role="status" @click="snackbar = false">
        <span class="dd-toast-ic">{{ snackbarErro ? '!' : '✓' }}</span>{{ snackbarTexto }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Abas ── */
.dd-abas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.dd-aba {
  all: unset; box-sizing: border-box; cursor: pointer; position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 18px;
  background: var(--card); border: 1px solid var(--line); backdrop-filter: blur(10px);
  transition: transform .2s, border-color .2s, box-shadow .2s;
}
.dd-aba::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, var(--c), var(--c2)); opacity: .5; transition: opacity .2s; }
.dd-aba:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.dd-aba.on { border-color: var(--c); box-shadow: 0 0 36px -14px var(--c); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 16%, transparent), var(--card) 70%); }
.dd-aba.on::before { opacity: 1; box-shadow: 0 0 14px var(--c); }
.dd-aba:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.dd-aba-ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none; color: #fff; background: linear-gradient(135deg, var(--c), var(--c2)); }
.dd-aba-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dd-aba-tx b { font-size: 14.5px; font-weight: 600; color: var(--tx); }
.dd-aba-tx small { font-size: 11.5px; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* botão discreto (Prédios download) */
.dd-escondido {
  all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  font: 500 12px var(--font); color: var(--mut); padding: 6px 10px; border-radius: 999px; opacity: .7;
  transition: opacity .2s, color .2s, background .2s;
}
.dd-escondido:hover, .dd-escondido.on { opacity: 1; color: var(--orange); background: rgba(255, 161, 46, .08); }
.dd-escondido:focus-visible { outline: 2px solid #fff; opacity: 1; }

/* ── Painel ── */
.dd-filtros { display: flex; flex-direction: column; gap: 14px; padding: 4px 0 16px; margin-bottom: 6px; border-bottom: 1px solid var(--line2); }
.dd-periodo { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.dd-periodo .lx-input { min-width: 170px; }
.dd-seta { color: var(--mut); padding-bottom: 10px; }
.dd-dica { margin: 0; font-size: 12px; color: var(--mut); }
.dd-dica code { font-family: var(--mono); color: var(--purple); background: rgba(168, 85, 247, .12); padding: 1px 6px; border-radius: 6px; }
.dd-hd-r { display: flex; align-items: center; gap: 10px; }

.dd-tbl td { padding-top: 6px; padding-bottom: 6px; }
.dd-nome { font-weight: 500; min-width: 180px; }
.dd-col-in { min-width: 150px; }
.dd-col-expr { min-width: 240px; }
.dd-in { padding: 7px 10px; border-radius: 10px; font-family: var(--mono); font-size: 12.5px; }
.dd-expr.err { border-color: var(--red); box-shadow: 0 0 0 3px rgba(255, 95, 109, .15); }
.dd-erro { background: rgba(255, 95, 109, .05); }
.dd-res b { font-family: var(--mono); color: var(--purple); font-weight: 600; }
.dd-zero { color: var(--mut); }
.dd-total { font-family: var(--mono); color: var(--purple); font-size: 14px; }

.dd-acoes { display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex-wrap: wrap; padding-top: 16px; }
.dd-aviso { font-size: 12px; color: var(--orange); }

.dd-check {
  all: unset; box-sizing: border-box; cursor: pointer; width: 28px; height: 28px; border-radius: 9px; display: inline-grid; place-items: center;
  border: 1px solid var(--line); color: transparent; background: rgba(255, 255, 255, .04); transition: background .2s, border-color .2s, color .2s;
}
.dd-check:hover { border-color: var(--orange); }
.dd-check.on { color: #06101a; background: var(--orange); border-color: transparent; box-shadow: 0 0 14px -3px var(--orange); }
.dd-check:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

/* documento do PDF semanal: renderizado fora da tela */
.dd-pdf-host { position: fixed; left: -10000px; top: 0; pointer-events: none; }

/* ── Aviso ── */
.dd-toast {
  position: fixed; left: 50%; bottom: 110px; transform: translateX(-50%); z-index: 2000; cursor: pointer;
  display: flex; align-items: center; gap: 10px; padding: 11px 18px 11px 12px; border-radius: 14px; font-size: 13px; font-weight: 500; color: var(--tx);
  background: var(--bg2); border: 1px solid rgba(52, 211, 122, .45); box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--green);
}
.dd-toast.err { border-color: rgba(255, 95, 109, .5); box-shadow: 0 10px 40px -10px rgba(0, 0, 0, .7), 0 0 30px -12px var(--red); }
.dd-toast-ic { width: 24px; height: 24px; border-radius: 8px; display: grid; place-items: center; font-weight: 700; font-size: 13px; color: #06101a; background: var(--green); }
.dd-toast.err .dd-toast-ic { background: var(--red); }
.dd-toast-enter-active, .dd-toast-leave-active { transition: opacity .25s, transform .25s; }
.dd-toast-enter-from, .dd-toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 760px) { .dd-abas { grid-template-columns: 1fr; } }
</style>

<style>
/* Documento do PDF semanal (tema claro fixo; não usa os tokens do tema escuro) */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
.sem-pdf-doc { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a; }
.sem-pdf-doc p, .sem-pdf-doc h1, .sem-pdf-doc h2 { margin: 0; }

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
