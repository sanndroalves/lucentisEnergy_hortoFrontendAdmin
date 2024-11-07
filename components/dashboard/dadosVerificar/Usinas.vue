 
  
<script>
import { ref, onMounted } from 'vue'
import { API_BASE_URL } from '~/base/link';

    const { data: usinas } = await useFetch(`${API_BASE_URL}/usina/`);
 
    const inversoresUsina = ref([]);
    const informaInversor = ref([]);
    const inversorarAlertaStrings = ref([]);

    const data1 = ref()
    const accessToken = ref()

    //PEGANDO O TOKEN
    async function initialize() {
        // Primeira requisição para obter o access_token
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

        data1.value = await response1.json()
        accessToken.value = data1.value.access_token 

        return accessToken.value
    }

//PEGAR OS INVERSORES DA USINA
async function pegarInversores(acessoTokenAPI) {
    try {
        usinas.value.forEach(async (usina) => {  
            if(usina.id != 1 && usina.id !=19 && usina.id !=20){
                const response2 = await fetch('/api/device', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        accessToken: acessoTokenAPI,
                        stationId: usina.idSolar,
                        deviceType: "INVERTER",
                        page: 1,
                        size: 10,
                    })
                })  

                const data2 = await response2.json()
                const resultado = data2.deviceListItems

                //SALVANDO INVERSORES
                if(resultado){
                    resultado.forEach(item => {
                        inversoresUsina.value.push({ucUsina: usina.uc, inversorSN: item.deviceSn, nomeUsina: usina.nome}) 
                    });  
                }

                //PEGANDO STRINGS DOS INVERSORES
                inversoresUsina.value.forEach(item =>{
                    verificarStringsAPI(item.inversorSN, acessoTokenAPI, item.ucUsina, item.nomeUsina)
                })

            }
        })
      
    } catch (error) {
    console.error('Erro ao fazer requisições:', error)
    } 
}  

pegarInversores(await initialize())

// PROCURAR NA API
async function verificarStringsAPI(inversorSN, acessoTokenAPI, ucItem, nomeItem) {
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
        informaInversor.value.push({ucUsina: ucItem, deviceSn: inversorSN, dados: dpItems, nomeUsina: nomeItem}) 
    }

    calculosDadosUsinas()

}

//VERIFICAR SE HÁ STRINGS IRREGULARES
async function calculosDadosUsinas() {

    informaInversor.value.forEach(inversor => {
        const { dados } = inversor;
        // Filtra os 6 primeiros itens de dpItems
        const firstSixItems = dados.slice(0, 4);
        
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



export { calculosDadosUsinas }
</script>

