
<script setup>
    import { calculosDados } from '~/components/dashboard/dadosVerificar/UsinaPaco.vue';
    import { calculosDadosUsinas } from '~/components/dashboard/dadosVerificar/Usinas.vue';

    const dadosStringsPaco = ref(await  calculosDados()); 
    const dadosStrings17Usinas = ref(await  calculosDadosUsinas()); 
 
    const dialogStringsPaco = ref(false)
    const dialogStrings17Usinas = ref(false)

    const openDialogStringsPaco = () =>{
        dialogStringsPaco.value = true
    }

    const openDialogStrings17Usinas = () =>{
        dialogStrings17Usinas.value = true
    }
</script>

<template>
    <div>
      <v-expansion-panels>
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex flex-column align-items-start">
              <div class="d-flex align-items-center">
                <v-avatar class="bg-lighterror text-error mb-1 mr-2" size="40">
                  <PlugConnectedXIcon size="30" />
                </v-avatar>
                <b style="font-size: 18px; margin: 10px;">Alerta Strings</b> 
                <v-chip color="error" style="font-size: 15px; padding: 6px; height: 24px; margin-top: 10px;">{{ Number(dadosStringsPaco.length) +  Number(dadosStrings17Usinas.length)}}</v-chip>
              </div>
              <div class="mt-1 text-subtitle-1 text-medium-emphasis">
                Níveis irregulares (diferentes)
              </div>
            </div>
          </v-expansion-panel-title>
  
  
          <v-expansion-panel-text>
            <v-row justify="center" align="center">
                <v-col class="text-center" cols="auto">
                    <v-btn class="bg-error mr-5" @click="openDialogStringsPaco">
                        Paço ({{ dadosStringsPaco.length }})
                    </v-btn>
                </v-col>
                
                <v-col class="text-center" cols="auto">
                    <v-btn class="bg-error" @click="openDialogStrings17Usinas">
                        17 usinas ({{ dadosStrings17Usinas.length }})
                    </v-btn>
                </v-col>
            </v-row>
        </v-expansion-panel-text>

        </v-expansion-panel>
      </v-expansion-panels>
    </div> 

    <!-- USINA PAÇO MUNICIPAL -->
    <v-row justify="center">
        <v-dialog v-model="dialogStringsPaco" width="1024">
        <v-card>
            <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">[Novo Paço Municipal] Verificar de Strings</span>
            </v-card-title>
            <v-card-text>
                <v-container>
                    <v-row>
                        <v-col cols="4" v-for="info in dadosStringsPaco" :key="info">
                            <v-card elevation="5">
                                <v-card-title class="text-h5 text-center">
                                    <v-chip color="error">STRINGs IRREGULAS</v-chip>
                                    <br>
                                    {{ info.nomeUsina }}
                                    <v-divider></v-divider>
                                </v-card-title>
                                    <v-card-text>
                                        <div class="text-center" style="margin-bottom: 7px;">
                                            <b>INVERSOR:</b> {{ info.deviceSn }}
                                        </div>
                                        <v-table>
                                            <thead>
                                                <th class="text-center">STRINGs</th>
                                                <th class="text-center">Produção</th>
                                            </thead>
                                            <tbody>
                                                <tr  v-for="string in info.dados.slice(0, 6)" :key="strings">
                                                    <td style="margin: 0px;" class="text-center">{{string.key}}</td>
                                                    <td style="margin: 0px;" class="text-center">{{string.value}}W</td>    
                                                </tr> 
                                            </tbody>
                                        </v-table>
                                    </v-card-text>
                            </v-card>
                        </v-col> 
                    </v-row>
                </v-container>
            </v-card-text> 
        </v-card>
        </v-dialog>
    </v-row>

    <!-- 17 USINAS -->
    <v-row justify="center">
        <v-dialog v-model="dialogStrings17Usinas" width="1024">
        <v-card>
            <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">[17 usinas] Verificar de Strings</span>
            </v-card-title>
            <v-card-text>
                <v-container>
                    <v-row>
                        <v-col cols="4" v-for="info in dadosStrings17Usinas" :key="info">
                            <v-card elevation="5">
                                <v-card-title class="text-h5 text-center">
                                    <v-chip color="error">STRINGs IRREGULAS</v-chip>
                                    <br>
                                    {{ info.nomeUsina }}
                                    <v-divider></v-divider>
                                </v-card-title>
                                    <v-card-text>
                                        <div class="text-center" style="margin-bottom: 7px;">
                                            <b>INVERSOR:</b> {{ info.deviceSn }}
                                        </div>
                                        <v-table>
                                            <thead>
                                                <th class="text-center">STRINGs</th>
                                                <th class="text-center">Produção</th>
                                            </thead>
                                            <tbody>
                                                <tr  v-for="string in info.dados.slice(0, 6)" :key="strings">
                                                    <td style="margin: 0px;" class="text-center">{{string.key}}</td>
                                                    <td style="margin: 0px;" class="text-center">{{string.value}}W</td>    
                                                </tr> 
                                            </tbody>
                                        </v-table>
                                    </v-card-text>
                            </v-card>
                        </v-col> 
                    </v-row>
                </v-container>
            </v-card-text> 
        </v-card>
        </v-dialog>
    </v-row>
  </template>
  
<style scoped> 
    .v-table th, .v-table td {
        padding: 1px 18px; /* Reduz o espaçamento nas células */
    }

    .v-table tbody tr {
        line-height: 0; /* Ajusta a altura das linhas */
    }

    .v-table tbody tr:nth-child(even) {
        background-color: #f7f9fc; /* Cor de fundo alternativa para linhas pares */
    }
</style>