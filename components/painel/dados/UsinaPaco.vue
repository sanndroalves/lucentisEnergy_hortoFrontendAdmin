 
  
  <script>
  import { ref, onMounted } from 'vue'
  
  const instalacao = ref(61404023)
  const capacidadeInstalda = ref(null)
  const geracaoReal = ref(null)
  const percentualDeGeracao = ref(0)

  let data1 = ''
  let accessToken = ''

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
  
      data1 = await response1.json()
      accessToken = data1.access_token

}

initialize();

  // Função para realizar as requisições 
async function calcularPercentualDeGeracaoPaco() {
    try {

  
      // Segunda requisição usando o access_token para obter dados da instalação
      const response2 = await fetch('/api/station', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: accessToken,
          stationId: instalacao.value
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
          stationId: instalacao.value
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
  
  
  export { calcularPercentualDeGeracaoPaco }
  </script>
   
  