<script setup>
import { ref, computed, onMounted } from "vue";
import { useHead } from "@vueuse/head";
import { API_BASE_URL } from "~/base/link";

useHead({
  title: "Dados"
});

definePageMeta({
  middleware: "sidebase-auth"
});

import UiParentCard from "@/components/shared/UiParentCard.vue";

// -------------------------------
// STATE
// -------------------------------
const abaSelecionada = ref("geracao");

const tipos = [
  { label: "Geração", value: "geracao" },
  { label: "Usina Mensal", value: "usina" },
  { label: "Prédios Download", value: "predios" },
  { label: "Semanal", value: "semanal" }
];

const usinas = ref([]);
const unidades = ref([]);

// mês único por módulo
const mesGeracao = ref(null);
const anoGeracao = ref(null);
const mesUsina = ref(null);
const anoUsina = ref(null);

// -------------------------------
// FETCH
// -------------------------------
onMounted(async () => {
  const fetchedUsinas = await $fetch(`${API_BASE_URL}/usina/`);
  const fetchedUnidades = await $fetch(`${API_BASE_URL}/unidadecompensacao`);

  usinas.value = fetchedUsinas || [];
  unidades.value = fetchedUnidades || [];

  montarLinhas();
});

// -------------------------------
// LINHAS
// -------------------------------
const linhasGeracao = ref([]);
const linhasUsina = ref([]);

function montarLinhas() {
  linhasGeracao.value = usinas.value.map((u) => ({
    usina: u.id,
    nome: u.nome,
    valor: null
  }));

  linhasUsina.value = usinas.value.map((u) => ({
    usina: u.id,
    nome: u.nome,
    consumokWh: null,
    valorRS: null,
    injetadoPonta: null,
    injetadoFPonta: null
  }));
}

// -------------------------------
// FILTROS PRÉDIOS
// -------------------------------
const prediosFiltrados = computed(() => {
  return unidades.value.filter(
    (item) =>
      ["E", "S", "O"].includes(item.secretaria) &&
      ["L", "M"].includes(item.status)
  );
});

// -------------------------------
// AÇÕES
// -------------------------------
const loadingGeracao = ref(false);
const snackbar = ref(false);
const snackbarTexto = ref("");

async function enviarGeracao() {
  try {
    loadingGeracao.value = true;

    for (const item of linhasGeracao.value) {
      await $fetch(`${API_BASE_URL}/relatoriogeracao/`, {
        method: "POST",
        body: {
          idGeradora: item.usina,
          geracao: item.valor || 0,
          mes: mesGeracao.value,
          ano: anoGeracao.value
        }
      });
    }

    snackbarTexto.value = "Gerações enviadas com sucesso!";
    snackbar.value = true;

  } catch (error) {
    console.error(error);

    snackbarTexto.value = "Erro ao enviar gerações.";
    snackbar.value = true;

  } finally {
    loadingGeracao.value = false;
  }
}

const loadingUsina = ref(false);
async function enviarUsinaMensal() {
  try {
    loadingUsina.value = true;

    for (const item of linhasUsina.value) {
      await $fetch(`${API_BASE_URL}/relatoriousina/`, {
        method: "POST",
        body: {
          idGeradora: item.usina,
          injetadoPonta: item.injetadoPonta || 0,
          injetadoFPonta: item.injetadoFPonta || 0,
          consumoReais: item.valorRS || 0,
          consumoKWH: item.consumokWh || 0,
          mes: mesUsina.value,
          ano: anoUsina.value
        }
      });
    }

    snackbarTexto.value = "Dados das usinas enviados com sucesso!";
    snackbar.value = true;

  } catch (error) {
    console.error(error);

    snackbarTexto.value = "Erro ao enviar dados das usinas.";
    snackbar.value = true;

  } finally {
    loadingUsina.value = false;
  }
}

function marcarDownload(item) {
  item.download = !item.download;
}
</script>

<template>
  <!-- BANNER -->
  <v-row>
    <div
      class="v-card v-theme--BLUE_THEME elevation-10 rounded-md bg-lightprimary elevation-0 rounded-md mb-8 w-100"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Dados</h3>
              <h6 class="text-subtitle-1 text-medium-emphasis">
                Gerenciamento de lançamentos
              </h6>
            </div>
          </div>

          <div class="d-none d-lg-block">
            <img
              src="https://i.imgur.com/vpEwz5j.png"
              height="180"
            />
          </div>
        </div>
      </div>
    </div>
  </v-row>

  <UiParentCard title="Inserir Dados">
    <!-- SELECT -->
    <v-select
      v-model="abaSelecionada"
      :items="tipos"
      item-title="label"
      item-value="value"
      label="Selecione o módulo"
      variant="outlined"
      class="mb-6"
    />

    <!-- ================================= -->
    <!-- GERAÇÃO -->
    <!-- ================================= -->
    <div v-if="abaSelecionada === 'geracao'">
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-select
            v-model="mesGeracao"
            :items="[1,2,3,4,5,6,7,8,9,10,11,12]"
            label="Mês"
            variant="outlined"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-select
            v-model="anoGeracao"
            :items="[2023,2024,2025,2026,2027,2028]"
            label="Ano"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <v-table>
        <thead>
          <tr>
            <th>Usina</th>
            <th>Geração (kWh)</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in linhasGeracao" :key="item.usina">
            <td>{{ item.nome }}</td>

            <td width="250">
              <v-text-field
                v-model="item.valor"
                type="number"
                density="compact"
                hide-details
                variant="outlined"
              />
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-btn
        color="primary"
        class="mt-4"
        :loading="loadingGeracao"
        :disabled="loadingGeracao"
        @click="enviarGeracao"
      >
        Enviar Dados
      </v-btn>
    </div>

    <!-- ================================= -->
    <!-- USINA MENSAL -->
    <!-- ================================= -->
    <div v-if="abaSelecionada === 'usina'">
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-select
            v-model="mesUsina"
            :items="[1,2,3,4,5,6,7,8,9,10,11,12]"
            label="Mês"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="anoUsina"
            :items="[2023,2024,2025,2026,2027,2028]"
            label="Ano"
            variant="outlined"
          />
        </v-col>

      </v-row>

      <v-table>
        <thead>
          <tr>
            <th>Usina</th>
            <th>Consumo kWh</th>
            <th>R$</th>
            <th>Injetado Ponta</th>
            <th>Injetado Fora Ponta</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in linhasUsina" :key="item.usina">
            <td>{{ item.nome }}</td>

            <td>
              <v-text-field
                v-model="item.consumokWh"
                type="number"
                step="0.01"
                density="compact"
                hide-details
                variant="outlined"
              />
            </td>

            <td>
              <v-text-field
                v-model="item.valorRS"
                type="number"
                step="0.01"
                density="compact"
                hide-details
                variant="outlined"
              />
            </td>

            <td>
              <v-text-field
                v-model="item.injetadoPonta"
                type="number"
                step="0.01"
                density="compact"
                hide-details
                variant="outlined"
              />
            </td>

            <td>
              <v-text-field
                v-model="item.injetadoFPonta"
                type="number"
                step="0.01"
                density="compact"
                hide-details
                variant="outlined"
              />
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-btn
        color="primary"
        class="mt-4"
        :loading="loadingUsina"
        :disabled="loadingUsina"
        @click="enviarUsinaMensal"
      >
        Enviar Dados
      </v-btn>
    </div>

    <!-- ================================= -->
    <!-- PRÉDIOS -->
    <!-- ================================= -->
    <div v-if="abaSelecionada === 'predios'">
      <v-table>
        <thead>
          <tr>
            <th>UC</th>
            <th>Prédio</th>
            <th>Marcar</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="item in prediosFiltrados" :key="item.id">
            <td>{{ item.uc }}</td>
            <td>{{ item.nome }}</td>

            <td>
              <v-checkbox
                v-model="item.download"
                hide-details
                @change="marcarDownload(item)"
              />
            </td>

            <td>
              <v-chip
                v-if="item.download"
                color="green"
                text-color="white"
              >
                DOWNLOAD
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- ================================= -->
    <!-- SEMANAL -->
    <!-- ================================= -->
    <div v-if="abaSelecionada === 'semanal'">
      <v-alert type="info" variant="tonal">
        Área semanal pronta para desenvolvimento.
      </v-alert>
    </div>
  </UiParentCard>

  <v-snackbar
    v-model="snackbar"
    color="success"
    timeout="3000"
  >
    {{ snackbarTexto }}
  </v-snackbar>
 
</template>

<style scoped>
.w-100 {
  width: 100%;
}
</style>