<script setup>
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';


// Defina o título da página
useHead ({
  title: 'Usinas'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from "vue";
import UiParentCard from "@/components/shared/UiParentCard.vue";
const dialog = ref(false);

const usinaId = ref("");
const ucUsina = ref("");
const nomeUsina = ref("");
const dataInicioUsina = ref("");
const potenciaUsina = ref("");
const enderecoUsina = ref("");
const statusUsina = ref("");

const showSuccessAlert = ref(false);
const showErrorAlert = ref(false);
const showErrorCampo = ref(false);

const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);

const getStatusLabel = (status) => {
  switch (status) {
    case "L":
      return "Ligado";
    case "D":
      return "Desligado";
    case "M":
      return "Manutenção";
    default:
      return "Desconhecido";
  }
};

const getStatusColorClass = (status) => {
  const colorMap = {
    L: "bg-success",
    D: "bg-error",
    M: "bg-warning",
  };

  return colorMap[status] || "bg-primary";
};

const openDialog = async (idUsina) => {
  const { data: usinaDetalhe } = await useFetch(
    `${API_BASE_URL}/usina/${idUsina}`
  );

  ucUsina.value = usinaDetalhe.value.uc;
  nomeUsina.value = usinaDetalhe.value.nome;
  dataInicioUsina.value = usinaDetalhe.value.dataInicio;
  potenciaUsina.value = usinaDetalhe.value.potencia;
  enderecoUsina.value = usinaDetalhe.value.endereco;
  statusUsina.value = usinaDetalhe.value.status;
  usinaId.value = idUsina;

  dialog.value = true;
};

const closeDialog = () => {
  showErrorAlert.value = false;
  showErrorCampo.value = false;
  showSuccessAlert.value = false;
  dialog.value = false;
};

const saveChanges = async () => {
  if (
    !ucUsina.value ||
    !nomeUsina.value ||
    !dataInicioUsina.value ||
    !potenciaUsina.value ||
    !enderecoUsina.value ||
    !statusUsina.value
  ) {
    showErrorCampo.value = true;
    return;
  }

  try {
    const response = await useFetch(
      `${API_BASE_URL}/usina/${usinaId.value}`,
      {
        method: "PUT",
        body: {
          uc: ucUsina,
          nome: nomeUsina,
          dataInicio: dataInicioUsina,
          potencia: potenciaUsina,
          endereco: enderecoUsina,
          status: statusUsina,
        },
        key: "usinaPut",
      }
    );

    if (response) {
      showSuccessAlert.value = true;
      showErrorCampo.value = false;
    } else {
      showErrorAlert.value = true;
      showErrorCampo.value = false;
    }
  } catch (error) {
    showErrorAlert.value = true;
    showErrorCampo.value = false;
  }

  const { data: updatedUsinas } = await useFetch(
    "${API_BASE_URL}/usina/"
  );
  usinas.value = updatedUsinas._value;
};

usinas.value.sort((a, b) => {
  if (a.status === "L" && b.status === "L") {
    return 0;
  }
  if (a.status === "L") {
    return -1;
  }
  if (b.status === "L") {
    return 1;
  }
  return 0;
});

const usinasLigadas = usinas.value.filter(item => item.status === 'L')
const usinasDesligadas = usinas.value.filter(item => item.status === 'D' || item.status === 'M')
const mudarVisu = ref(0)

</script>
<template>
  <!--BANNER-->
  <v-row>
    <div
      class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Usinas Fotovoltaicas</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Eficiência">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Eficiência
                    </h6></a
                  >
                </li>
                <li class="v-breadcrumbs-divider">
                  <div class="d-flex align-center text-h3 mt-n4">.</div>
                </li>
                <li
                  class="v-breadcrumbs-item v-breadcrumbs-item--disabled"
                  text="Usinas"
                >
                  <h6 class="text-medium-emphasis text-subtitle-1">Usinas</h6>
                </li>
                <!----><!---->
              </ul>
            </div>
          </div>
          <div class="d-none py-0 d-lg-block overflow-hidden">
            <div class="mb-n16 mt-3">
              <img src="https://i.imgur.com/wBFBoIm.png" height="200" alt="breadcrumbw" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-row>
 
  <!--CAIXAS DASHBOARD-->
  <div class="v-col v-col-12">
    <v-row justify="space-around">  
      <div class="v-col-sm-4 v-col-md-4 v-col-lg-4 v-col-12">
        <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess">
          <div class="bg-lightsuccess">
            <BoltIcon size="30" class="text-success" />
            <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success">
              Ligadas
            </div>
            <h4 class="text-h4 mt-1 text-success">
              {{ usinasLigadas.length }}
            </h4>
          </div>
        </div>
      </div> 

      <div class="v-col-sm-4 v-col-md-4 v-col-lg-4 v-col-12">
        <div class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lighterror">
          <div class="bg-lighterror">
            <XIcon size="30" class="text-error" />
            <div class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-error">
              Desligadas
            </div>
            <h4 class="text-h4 mt-1 text-error">
              {{ usinasDesligadas.length }}
          </h4>
          </div>
        </div>
      </div> 
    </v-row>
  </div>
  
  <v-divider></v-divider> 
  <br> 

  
  <!--LISTAR USINAS-->
  <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>Informações Individuais</v-expansion-panel-title>
          <v-expansion-panel-text>
            <!--ADICIONAR USINA-->
            <div class="text-center mt-3 mb-3"> 
              <v-btn class="bg-primary" href="criar/">
                Adicionar Usina
              </v-btn>
              <v-btn @click="mudarVisu === 0 ? mudarVisu = 1 : mudarVisu = 0" size="40" icon class="bg-primary mt-2 ml-5 mr-5 mb-2">
                    <v-avatar size="30" class="text-white">
                        <ExchangeIcon size="20" />
                    </v-avatar>
                    <v-tooltip activator="parent" location="bottom">Trocar visualização</v-tooltip>
                </v-btn>
            </div>
            <!--LISTA USINAS-->
            <v-row v-if="mudarVisu === 1" class="mt-5">
              <v-table style="width: 100vw;">
                <thead>
                  <tr>
                    <th class="text-center">ID</th>
                    <th class="text-center">UC</th>
                    <th class="text-center">Nome</th>
                    <th class="text-center">kWp</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="usina in usinas" :key="usina.id"> 
                    <td>{{ usina.id }}</td>
                    <td class="text-center">{{ usina.uc }}</td>
                    <td>{{ usina.nome.toUpperCase() }}</td>
                    <td class="text-center">{{ usina.potencia}}</td>
                    <td class="text-center">
                      <v-chip class="text-body-1" :class="getStatusColorClass(usina.status)" color="white" size="small" style="margin-left: ">
                        {{ getStatusLabel(usina.status) }}</v-chip>
                    </td>
                    <td class="text-center">
                      <NuxtLink :to="`/usinas/${usina.id}`">
                        <v-btn size="40" icon class="bg-primary mr-5">
                          <v-avatar size="30" class="text-white">
                            <EyeIcon size="20" />
                          </v-avatar>
                          <v-tooltip activator="parent" location="bottom"
                            >Ver Usina
                          </v-tooltip>
                        </v-btn>
                      </NuxtLink>
                      <v-btn @click="openDialog(usina.id)" size="40" icon class="bg-secondary">
                        <v-avatar size="30" class="text-white">
                          <PencilIcon size="20" />
                        </v-avatar>
                        <v-tooltip activator="parent" location="bottom"
                          >Editar Usina
                        </v-tooltip>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-row>

            <!-- LAYOUT EM CARD -->
            <v-row v-if="mudarVisu === 0" class="mt-5">
              <v-col
                cols="12"
                lg="4"
                sm="4"
                v-for="usina in usinas"
                :key="usina.id"
                style="margin-bottom: 15px"
              >
                <v-card elevation="5" class="withbg" rounded="md">
                  <NuxtLink>
                    <v-img height="100%" class="rounded-t-md"></v-img>
                  </NuxtLink>
                  <div class="d-flex justify-end mr-3 mt-n5">
                    <NuxtLink :to="`/usinas/${usina.id}`">
                      <v-btn size="40" icon class="bg-primary d-flex">
                        <v-avatar size="30" class="text-white">
                          <EyeIcon size="20" />
                        </v-avatar>
                        <v-tooltip activator="parent" location="bottom"
                          >Ver Usina
                        </v-tooltip>
                      </v-btn>
                    </NuxtLink>
                  </div>

                  <div class="d-flex justify-end mr-15 mt-n10">
                    <v-btn
                      @click="openDialog(usina.id)"
                      size="40"
                      icon
                      class="bg-secondary d-flex"
                    >
                      <v-avatar size="30" class="text-white">
                        <PencilIcon size="20" />
                      </v-avatar>
                      <v-tooltip activator="parent" location="bottom"
                        >Editar Usina
                      </v-tooltip>
                    </v-btn>
                  </div>

                  <v-card-item class="pt-0">
                    <h6 class="text-h6">{{ usina.nome.toUpperCase() }}</h6>
                      <div style="margin: 10px">
                          <v-divider></v-divider>
                      </div>
                    <div class="d-flex align-center justify-space-between mt-1">
                      <div>
                        <span class="text-h6">UC: </span>
                        <span>{{ usina.uc }}</span>
                        <br />
                        <span class="text-h6">kWp: </span>
                        <span>{{ usina.potencia }}</span
                        >kWp
                      </div>
                      <v-chip
                        class="text-body-1"
                        :class="getStatusColorClass(usina.status)"
                        color="white"
                        size="small"
                        style="margin-left: "
                        >{{ getStatusLabel(usina.status) }}</v-chip
                      >
                    </div>
                  </v-card-item>
                </v-card>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

  <!--EDITANDO USINA-->
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Editando Usina</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col v-if="showErrorCampo" cols="12">
                <v-alert type="error"> Preencha todos os campos! </v-alert>
              </v-col>
              <v-col v-if="showSuccessAlert" cols="12">
                <v-alert type="success"> Usina EDITADA com sucesso! </v-alert>
              </v-col>
              <v-col cols="6">
                <v-label class="font-weight-bold mb-1">UC</v-label>
                <v-text-field
                  v-model="ucUsina"
                  type="number"
                  variant="outlined"
                  hide-details
                  color="primary"
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="6">
                <v-label class="font-weight-bold mb-1">Nome</v-label>
                <v-text-field
                  v-model="nomeUsina"
                  variant="outlined"
                  hide-details
                  color="primary"
                ></v-text-field>
              </v-col>

              <v-col cols="6">
                <v-label class="font-weight-bold mb-1">Início</v-label>
                <v-text-field
                  v-model="dataInicioUsina"
                  variant="outlined"
                  type="date"
                  hide-details
                  color="primary"
                ></v-text-field>
              </v-col>

              <v-col cols="6">
                <v-label class="font-weight-bold mb-1">Potência (kW)</v-label>
                <v-text-field
                  v-model="potenciaUsina"
                  variant="outlined"
                  type="number"
                  hide-details
                  color="primary"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-label class="font-weight-bold mb-1">Endereço</v-label>
                <v-text-field
                  v-model="enderecoUsina"
                  variant="outlined"
                  hide-details
                  color="primary"
                ></v-text-field>
              </v-col>

              <v-col cols="6">
                <v-label class="font-weight-bold mb-1">Status</v-label>
                <v-radio-group v-model="statusUsina" inline>
                  <v-radio label="Ligado" value="L"></v-radio>
                  <v-radio label="Desligado" value="D"></v-radio>
                  <v-radio label="Manutenção" value="M"></v-radio>
                </v-radio-group>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="closeDialog">
            Fechar
          </v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="saveChanges">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
