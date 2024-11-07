 
  
<script>
    import { ref, onMounted } from 'vue'
    
     
    const inversoresUsina = ref([]);
    const informaInversor = ref([]);
    const inversorarAlertaStrings = ref([]);

    const data1 = ref()
    const accessToken = ref()

//PEGANDO O TOKEN
async function initialize() {
  // Primeira requisição para obter o access_token
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
  
      data1.value = await response1.json()
      accessToken.value = data1.value.access_token 

      return accessToken.value
}
  
//PEGAR OS INVERSORES DA USINA
async function pegarInversores(acessoTokenAPI) {
    try {
 
        const response2 = await fetch('/api/device', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                accessToken: acessoTokenAPI,
                stationId: 61404023,
                deviceType: "INVERTER",
                page: 1,
                size: 10,
            })
        })  

        //SALVANDO INVERSORES
        const data2 = await response2.json()
        const resultado = data2.deviceListItems

        if(resultado){
            resultado.forEach(item => {
                inversoresUsina.value.push({ucUsina: 4003667424, inversorSN: item.deviceSn, nomeUsina: 'NOVO PAÇO MUNICIPAL'}) 
            });  
        }
        
        //PEGANDO STRINGS DOS INVERSORES
        inversoresUsina.value.forEach(item =>{
            verificarStringsAPI(item.inversorSN, acessoTokenAPI)
        })
 
      
    } catch (error) {
      console.error('Erro ao fazer requisições:', error)
    } 
}  
  
async function init() {
     pegarInversores(await initialize())
}

init();

// PROCURAR NA API
async function verificarStringsAPI(inversorSN, acessoTokenAPI) {
    const response2 = await fetch('/api/currentData', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            accessToken: acessoTokenAPI,
            deviceSn:  inversorSN
        })
    })  

    const data2 = await response2.json()
    const resultado = data2.dataList
    
    if (resultado) {
        const dpItems = resultado.filter(item => item.key.startsWith("DP")); 
        informaInversor.value.push({ucUsina: 4003667424, deviceSn: inversorSN, dados: dpItems, nomeUsina: 'NOVO PAÇO MUNICIPAL'}) 
    }

    calculosDados()

}

//VERIFICAR SE HÁ STRINGS IRREGULARES
async function calculosDados() {
    
    informaInversor.value.forEach(inversor => {
        const { dados } = inversor;
        // Filtra os 6 primeiros itens de dpItems
        const firstSixItems = dados.slice(0, 6);
        
        // Extrai os valores e converte para número
        const values = firstSixItems.map(item => parseFloat(item.value));
        
        // Calcula a média dos valores
        const average = values.reduce((acc, val) => acc + val, 0) / values.length;

        // Define um limite de discrepância (por exemplo, 20% da média)
        const threshold = average * 0.2;

        // Verifica se algum valor está fora do limite aceitável
        const discrepantes = values.filter(val => Math.abs(val - average) > threshold);

        if (discrepantes.length > 0) { 
            // Verifica se o deviceSn já existe em inversorarAlertaStrings.value
            const exists = inversorarAlertaStrings.value.some(item => item.deviceSn === inversor.deviceSn);
            
            if (!exists) {
                inversorarAlertaStrings.value.push(inversor);
            }
        } 
    });  
    return inversorarAlertaStrings.value
}
  
 

export { calculosDados }
  </script>
   
  