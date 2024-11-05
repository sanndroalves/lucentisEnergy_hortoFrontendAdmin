<script setup>
    import { API_BASE_URL } from '~/base/link';

    const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
    const usinasPesquisa = usinas.value.filter(item => item.id === 1) 
    const inversoresAlerta = ref([]);

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    } 
    const makeRequestsUsinas = async () => {  
      //17 USINAS 
      try {
        const response1 = await fetch('/api/token2', {
              method: 'POST',
              headers: {
              'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                appSecret: "b24abc748e0a90d1d6b17e15aba8106e",
                email: "admin@peehorto.cloud",
                password: "admin123"
              })
          })
      
          const data1 = await response1.json()
          const accessToken = data1.access_token
          
          usinas.value.forEach(async (usina) => {  
            if(usina.id != 1 && usina.id !=19 && usina.id !=20){
              try { 
                const response2 = await fetch('/api/device', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ 
                    accessToken: data1.access_token,
                    stationId: usina.idSolar,
                    deviceType: "INVERTER",
                    page: 1,
                    size: 10,
                  })
                })
                const data2 = await response2.json()
                const resultado = data2.deviceListItems

                if(resultado){
                  resultado.forEach(item => {
                    if (item.connectStatus === 0 || item.connectStatus === 2) {
                      inversoresAlerta.value.push({ucUsina: usina.uc, Inversor: item, nomeUsina: usina.nome }); 
                    }
                  });  
                }
                await delay(5000);
              } catch (error) {
                console.error("Erro ao obter o resultado:", error);
              } 
            }
              
          });  
      } catch (error) {
        console.error('Erro ao fazer requisições:', error)
      }

      //USINA PAÇO
      try {
        const response1 = await fetch('/api/token', {
              method: 'POST',
              headers: {
              'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                appSecret: "22c177dcc8ffe0adb41e736447617eb8",
                email: "upmh@upmh.com.br",
                password: "umph1234"
              })
          })
      
          const data1 = await response1.json() 
            
          try { 
            const response2 = await fetch('/api/device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                accessToken: data1.access_token,
                stationId: 61404023,
                deviceType: "INVERTER",
                page: 1,
                size: 10,
              })
            })
            const data2 = await response2.json()
            const resultado = data2.deviceListItems

            if(resultado){
              resultado.forEach(item => {
                if (item.connectStatus === 0 || item.connectStatus === 2) {
                  inversoresAlerta.value.push({ucUsina: 4003667424, Inversor: item, nomeUsina: 'NOVO PAÇO MUNICIPAL'}); 
                }
              });  
            }
            await delay(2000);
          } catch (error) {
            console.error("Erro ao obter o resultado:", error);
          }  
      } catch (error) {
        console.error('Erro ao fazer requisições:', error)
      }

    }
 
   
  // Chama a função ao montar o componente
  onMounted(() => {
    makeRequestsUsinas()
  })
</script>

<!-- <template>
    <div>
            <div
              class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated"
            >
              <div class="v-card-item pb-sm-8 pb-6">
                <div class="v-card-item__content">
                  <div class="v-card-title text-h5">
                    <v-avatar class="bg-lighterror text-error mb-1 mr-2" size="30">
                        <AlertTriangleIcon size="20" />
                    </v-avatar>
                    Alerta Inversores <code style="font-size: 12px;" class="text-error"></code></div>
                  <div class="v-card-subtitle text-subtitle-1 mt-n1">
                    Fora do ar/Sem geração
                  </div>
                  <div class="mt-sm-5 mt-5" v-for="usina of inversoresAlerta" :key="usina.id">
                    <div class="d-flex align-items-center justify-content-between mt-2">
                        <div class="v-avatar v-theme--BLUE_THEME v-avatar--density-default v-avatar--variant-flat rounded-md bg-lighterror" style="width: 40px; height: 40px">
                            <ServerBoltIcon size="22" class="text-error" />
                        </div>
                        <div class="pl-4 mt-n1 flex-grow-1">
                            <h5 class="text-h6">{{ usina.Inversor.deviceSn }}</h5>
                            <h6 class="text-subtitle-1 text-medium-emphasis">{{ usina.nomeUsina }}</h6>
                        </div> 
                    </div>
                  </div>
                </div>
              </div><span class="v-card__underlay"></span>
            </div>
          </div> 
</template> -->

<!-- TEMPLATE OFICIAL -->
<template>
  <div>
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex flex-column align-items-start">
            <div class="d-flex align-items-center">
              <v-avatar class="bg-lighterror text-error mb-1 mr-2" size="40">
                <AlertTriangleIcon size="30" />
              </v-avatar>
              <b style="font-size: 18px; margin: 10px;">Alerta Inversores</b> 
              <v-chip color="error" style="font-size: 12px; padding: 4px; height: 20px; margin-top: 10px;">{{inversoresAlerta.length}}</v-chip>
            </div>
            <div class="mt-1 text-subtitle-1 text-medium-emphasis">
              Fora do ar/Sem geração
            </div>
          </div>
        </v-expansion-panel-title>


        <v-expansion-panel-text>

          <div class="mt-sm-5 mt-5" v-for="usina of inversoresAlerta" :key="usina.id">
            <div class="d-flex align-items-center justify-content-between mt-2">
              <div class="v-avatar bg-lighterror rounded-md" style="width: 40px; height: 40px">
                <ServerBoltIcon size="22" class="text-error" />
              </div>
              <div class="pl-4 mt-n1 flex-grow-1">
                <h5 class="text-h6">{{ usina.Inversor.deviceSn }}</h5>
                <h6 class="text-subtitle-1 text-medium-emphasis">{{ usina.nomeUsina }}</h6>
              </div> 
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div> 
</template>
