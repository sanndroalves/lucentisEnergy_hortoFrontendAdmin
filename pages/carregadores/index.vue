<script setup>
  import { API_BASE_URL } from '~/base/link';

    import Carregador from "~~/components/carregadores/carregador.vue";
    import Carro from "~~/components/carregadores/carro.vue";
    import Usuario from "~~/components/carregadores/usuario.vue";
    import Funcionario from "~~/components/carregadores/funcionario.vue";

    const { data: carregadores } = await useFetch(`${API_BASE_URL}/carregador/`);
    const { data: veiculos } = await useFetch(`${API_BASE_URL}/veiculo/`);
    const { data: municipes } = await useFetch(`${API_BASE_URL}/usuarios?cargo=MU`);
    const { data: servidor } = await useFetch(`${API_BASE_URL}/usuarios?cargo=SE`);
    const { data: funcionarios } = await useFetch(`${API_BASE_URL}/usuarios?cargo=FU`);

useHead ({
        title: 'Carregadores'
    });

definePageMeta({
  middleware: 'sidebase-auth'
})

    const categoriaSelecionada = ref()  

</script>

<template>
    <!--BANNER TITULO-->
    <v-row>
        <div
        class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
        >
        <div class="px-8 py-8 py-lg-0">
            <div class="d-flex justify-space-between">
            <div class="d-flex py-0 align-center">
                <div>
                <h3 class="text-h3 mb-2">Carregadores</h3>
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
                    text="Carregadores"
                    >
                    <h6 class="text-medium-emphasis text-subtitle-1">Carregadores</h6>
                    </li>
                    <!----><!---->
                </ul>
                </div>
            </div>
            <div class="d-none py-0 d-lg-block overflow-hidden">
                <div class="mb-n16 mt-3">
                <img src="https://i.imgur.com/DSfK6xm.png" height="200" alt="breadcrumbw" />
                </div>
            </div>
            </div>
        </div>
        </div>
    </v-row>

      <!--CAIXAS DASHBOARD-->
      <div class="v-col v-col-12">
            <div class="v-row">
              <div class="v-col-sm-6 v-col-md-6 v-col-lg-3 v-col-12">
                <div
                  class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightprimary"
                >
                  <div class="bg-lightprimary">
                    <PlugIcon size="30" class="text-primary" />
                    <div
                      class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-primary"
                    >
                      PCE
                    </div>
                    <h4 class="text-h4 mt-1 text-primary">
                      {{ carregadores.length }}
                  </h4>
                  </div>
                </div>
              </div>

              <div class="v-col-sm-6 v-col-md-6 v-col-lg-3 v-col-12">
                <div
                  class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsuccess"
                >
                  <div class="bg-lightsuccess">
                    <CarIcon size="30" class="text-success" />
                    <div
                      class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-success"
                    >
                      Carros Elétricos
                    </div>
                    <h4 class="text-h4 mt-1 text-success">
                      {{ veiculos.length }}
                    </h4>
                  </div>
                </div>
              </div>

              <div class="v-col-sm-6 v-col-md-6 v-col-lg-3 v-col-12">
                <div
                  class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightwarning"
                >
                  <div class="bg-lightwarning">
                    <UserIcon size="30" class="text-warning" />
                    <div
                      class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-warning"
                    >
                      Usuários
                    </div>
                    <h4 class="text-h4 mt-1 text-warning">
                      {{ Number(municipes.length) + Number(servidor.length)}}
                  </h4>
                  </div>
                </div>
              </div>

              <div class="v-col-sm-6 v-col-md-6 v-col-lg-3 v-col-12">
                <div
                  class="text-decoration-none d-flex align-center justify-center text-center rounded-md pa-6 bg-lightsecondary"
                >
                  <div class="bg-lightsecondary">
                    <PlugConnectedIcon size="30" class="text-secondary" />
                    <div
                      class="text-subtitle-1 text-capitalize font-weight-bold mt-3 text-secondary"
                    >
                    Funcionários 
                    </div>
                    <h4 class="text-h4 mt-1 text-secondary">
                      {{ funcionarios.length }}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
      </div>

    <v-divider></v-divider>
    <br>
    
    <!--LISTAR INFORMAÇÕES -->
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>Informações Individuais</v-expansion-panel-title>
        <v-expansion-panel-text>
          
            <!--SELECIONAR CATEGORIAS-->
                <v-row justify="space-around">
                    <v-col cols="auto">
                        <v-chip-group mandatory v-model="categoriaSelecionada" selected-class="text-primary">
                            <v-chip value="CS">Carregadores</v-chip>
                            <v-chip value="CA">Carros</v-chip>
                            <v-chip value="US">Usuários</v-chip>
                            <v-chip value="FU">Funcionários</v-chip>
                        </v-chip-group>
                    </v-col>
                </v-row>
                <br>

                <!--LISTAR CARREGADORES-->
                <v-row v-if="categoriaSelecionada === 'CS'">
                    <Carregador />
                </v-row>

                <!--LISTAR CARROS -->
                <v-row v-if="categoriaSelecionada === 'CA'">
                  <Carro />
                </v-row>

                <!--LISTAR USUÁRIOS-->
                <v-row v-if="categoriaSelecionada === 'US'">
                    <Usuario />
                </v-row>

                <!--LISTAR USUÁRIOS-->
                <v-row v-if="categoriaSelecionada === 'FU'">
                    <Funcionario />
                </v-row>

        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
</template>
