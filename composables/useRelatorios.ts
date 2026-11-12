// composables/useRelatorios.ts
//
// Constantes e utilitários compartilhados pelos blocos de components/relatorios
// (Consumo, Injetado, Geral, Compensação).

import { ref } from 'vue';

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const ANOS_REL = [2023, 2024, 2025, 2026, 2027, 2028];
export const DOZE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const SECRETARIAS = [
  { v: 'E', txt: 'Educação', desc: 'Escolas e CEIs', c: 'var(--green)' },
  { v: 'S', txt: 'Saúde', desc: 'UBS e postos', c: 'var(--teal)' },
  { v: 'O', txt: 'Outros', desc: 'Órgãos municipais', c: 'var(--orange)' },
  { v: 'P', txt: 'Praças', desc: 'Espaços públicos', c: 'var(--purple)' },
  { v: 'I', txt: 'Iluminação', desc: 'Iluminação pública', c: 'var(--red)' },
];
export const secretariaTxt = (v: string) => SECRETARIAS.find((s) => s.v === v)?.txt ?? 'Desconhecida';

// número no formato brasileiro
export const nf = (v: any, casas = 0) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// mês anterior (janeiro → dezembro do ano anterior)
export const mesAnterior = (ano: number, mes: number) => (mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 });

// Deixa o navegador pintar o estado de "carregando" antes de um trabalho pesado.
export const esperarPintura = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// ── Exportação em PDF ─────────────────────────────────────────────────────
// Usa html2canvas + jsPDF direto (sem o html2pdf). Motivo: o html2canvas 1.4
// não entende as cores modernas que o navegador devolve para color-mix()
// (ex.: "color(srgb …)") e lança erro; o html2pdf então deixava a camada
// dele (.html2pdf__overlay) presa na tela, bloqueando os cliques até recarregar.
// Aqui a captura é feita num clone: o clone recebe o tema claro (.lx-pdf) e
// todas as cores são convertidas para rgba antes de desenhar. A tela não muda.

export const gerandoPDF = ref(false);

const FUNC_COR = /\b(color-mix|color|oklab|oklch|lab|lch)\(/i;
const PROPS_COR = [
  'color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color',
  'border-left-color', 'outline-color', 'text-decoration-color', 'box-shadow', 'text-shadow', 'fill', 'stroke', 'stop-color',
  'caret-color', 'column-rule-color',
];

// converte qualquer cor que o navegador entenda para rgba(), pintando 1 pixel
function criaConversor() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  const cache = new Map<string, string>();
  return (cor: string) => {
    let r = cache.get(cor);
    if (r) return r;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, 1, 1);
    const [R, G, B, A] = ctx.getImageData(0, 0, 1, 1).data;
    r = `rgba(${R}, ${G}, ${B}, ${+(A / 255).toFixed(3)})`;
    cache.set(cor, r);
    return r;
  };
}

// troca cada função de cor moderna dentro de um valor (respeitando parênteses aninhados)
function trocaCores(valor: string, conv: (c: string) => string) {
  let out = '';
  let i = 0;
  while (i < valor.length) {
    const m = FUNC_COR.exec(valor.slice(i));
    if (!m) { out += valor.slice(i); break; }
    const ini = i + m.index;
    let j = ini + m[0].length, nivel = 1;
    while (j < valor.length && nivel) { if (valor[j] === '(') nivel++; else if (valor[j] === ')') nivel--; j++; }
    out += valor.slice(i, ini) + conv(valor.slice(ini, j));
    i = j;
  }
  return out;
}

function limpaCores(raiz: HTMLElement, win: Window) {
  const conv = criaConversor();
  const nos = [raiz, ...Array.from(raiz.querySelectorAll<HTMLElement>('*'))];
  for (const no of nos) {
    const cs = win.getComputedStyle(no);
    for (const p of PROPS_COR) {
      const v = cs.getPropertyValue(p);
      if (v && FUNC_COR.test(v)) no.style.setProperty(p, trocaCores(v, conv), 'important');
    }
    // efeitos que o html2canvas desenha mal
    if (cs.backdropFilter && cs.backdropFilter !== 'none') no.style.setProperty('backdrop-filter', 'none', 'important');
  }
}

export async function exportarPDF(el: HTMLElement | null, nome: string, opcoes: { formato?: string; orientacao?: 'landscape' | 'portrait' } = {}) {
  if (!el || gerandoPDF.value) return;
  gerandoPDF.value = true;
  await esperarPintura();
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: Math.max(el.scrollWidth, 1200),
      onclone: (doc: Document, clone: HTMLElement) => {
        clone.classList.add('lx-pdf');
        limpaCores(clone, doc.defaultView ?? window);
      },
    });

    const pdf = new jsPDF({ unit: 'mm', format: opcoes.formato ?? 'a3', orientation: opcoes.orientacao ?? 'landscape' });
    const margem = 8;
    const largPag = pdf.internal.pageSize.getWidth() - margem * 2;
    const altPag = pdf.internal.pageSize.getHeight() - margem * 2;
    const pxPorMm = canvas.width / largPag;
    const fatiaPx = Math.floor(altPag * pxPorMm);

    // fatia a imagem em páginas
    const pedaco = document.createElement('canvas');
    pedaco.width = canvas.width;
    const ctx = pedaco.getContext('2d')!;
    for (let y = 0, pag = 0; y < canvas.height; y += fatiaPx, pag++) {
      const h = Math.min(fatiaPx, canvas.height - y);
      pedaco.height = h;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, pedaco.width, h);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (pag) pdf.addPage();
      pdf.addImage(pedaco.toDataURL('image/jpeg', 0.95), 'JPEG', margem, margem, largPag, h / pxPorMm);
    }
    pdf.save(`relatorio-${nome}.pdf`.replace(/[\/:*?"<>|]+/g, '-'));
  } catch (e) {
    console.error('[exportarPDF]', e);
    alert('Não foi possível gerar o PDF. Tente novamente.');
  } finally {
    // segurança: remove qualquer camada que alguma biblioteca tenha deixado presa
    document.querySelectorAll('.html2pdf__overlay, .html2canvas-container').forEach((n) => n.remove());
    gerandoPDF.value = false;
  }
}
