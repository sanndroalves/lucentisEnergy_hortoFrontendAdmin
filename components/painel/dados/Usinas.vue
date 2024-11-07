 
  
  <script>
  import { ref, onMounted } from 'vue'
   
  const capacidadeInstalda = ref(null)
  const geracaoReal = ref(null)
  const percentualDeGeracao = ref(0)
  
  // Função para realizar as requisições 
    // Primeira requisição para obter o access_token

    let data1 = ''
    let accessToken = ''  

async function initialize() {
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
    
        data1 = await response1.json()
        accessToken = data1.access_token
}

initialize();


  // Função para calcular o percentual de geração
  async function calcularPercentualDeGeracao(idUsina) {
    try {
      
  
      // Segunda requisição usando o access_token para obter dados da instalação
      const response2 = await fetch('/api/station', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: accessToken,
          stationId: idUsina
        })
      })
      const data2 = await response2.json()
  
      capacidadeInstalda.value = data2.installedCapacity * 1000 // Convertendo para watts
  
      // Terceira requisição usando o access_token para obter dados de geração real
      const response3 = await fetch('/api/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: accessToken,
          stationId: idUsina
        })
      })
  
      const data3 = await response3.json()
      geracaoReal.value = data3.generationPower
  
      percentualDeGeracao.value = ((geracaoReal.value / capacidadeInstalda.value) * 100).toFixed(2)

  
    } catch (error) {
      console.error('Erro ao fazer requisições:', error)
    } 
   
    return percentualDeGeracao.value
  }
  
  export { calcularPercentualDeGeracao }
  </script>
   
  