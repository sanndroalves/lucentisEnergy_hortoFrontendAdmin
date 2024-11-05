<script setup >
    import { useHead  } from '@vueuse/head';
    import { API_BASE_URL } from '~/base/link';

    const { data } = useAuth()
 

    // Defina o título da página
useHead ({
    title: 'Usina Informações'
});

definePageMeta({
    middleware: 'auth'
})

    import { ref } from 'vue';
    import UiParentCard from '@/components/shared/UiParentCard.vue';
    import MonthlyEarning from "@/components/dashboard/MonthlyEarnings.vue";
    import UsinaInjecao from "@/components/dashboard/UsinaInjecao.vue";

    import { useRouter, useRoute } from 'vue-router';

    const route = useRoute();

    const {data: usinaDetalhe} = await useFetch(`${API_BASE_URL}/usina/${route.params.id}`)

    useHead ({
    title: `Usina (${usinaDetalhe.value.nome})`
    });

    //SISTEMA PEGAR GERAÇÃO PROJETADA E REAL
    const proDetalheAno = ref("")
    const gerDetalheAno = ref("")
    const injecaoUsinaAno = ref("")
    const injecoes = ref([])

    const geracoes = ref([])
    const somaInjecao = ref(0)
    const selectedYear = ref('2024');


    const toggleYear = async () => {
        selectedYear.value = selectedYear.value === '2024' ? '2023' : '2024';

        const { data: proDetalhe } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        const { data: geraDetalhe } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        proDetalheAno.value = proDetalhe._value;
        gerDetalheAno.value = geraDetalhe._value;
 
        
        geracoes.value = []

        for (let i=0; i<gerDetalheAno.value.length; i++){
            geracoes.value.push(gerDetalheAno.value[i].geracao)
        }

        /* PEGANDO AS INJEÇÕES */ 
        const { data: injecaoUsina } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        injecaoUsinaAno.value = injecaoUsina._value;
        
        injecoes.value = []
        for (let i=0; i<injecaoUsinaAno.value.length; i++){
            somaInjecao.value = Number(injecaoUsinaAno.value[i].injetadoFPonta) + Number(injecaoUsinaAno.value[i].injetadoPonta)
            injecoes.value.push(somaInjecao.value)
        }
    };

    //SISTEMA ADICIONAR NOVA PROJEÇÃO
    const mesGeracao = ref("");
    const anoGeracao = ref("")
    const kwhGeracao = ref("");
    const tipoGeracao = ref("");

    const showSuccessAlertProjecao = ref(false);
    const showErrorAlertProjecao = ref(false);
    const showErrorCampoProjecao = ref(false);
    const showErrorMesProjecao = ref(false);

    const geradora =   route.params.id.toString();
    const dialogGeraConfig1 = ref(false);
    const dialogGeraConfig2 = ref(false);

    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const anos = [2024, 2023];

    /* ABRIR CAMPO DE ADICIONAR */
    const openDialogProjecao = () => {
        dialogGeraConfig1.value = true;
        showSuccessAlertProjecao.value = false;
        showErrorCampoProjecao.value = false;
        showErrorMesProjecao.value = false;
    }; 
    /* ENVIAR PROJECAO*/
    const sendGeracao = async () => {
      if (!mesGeracao.value || !kwhGeracao.value || !anoGeracao.value || !tipoGeracao.value) {
            showErrorCampoProjecao.value = true;
            return;
      }
      
      /* ENVIAR PROJEÇÃO */
      if (tipoGeracao.value === 'P'){
        const {data: mesVetor} = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${route.params.id}&mes=${mesGeracao.value}&ano=${anoGeracao.value}`)
            if(mesVetor.value.length){
                    showSuccessAlertProjecao.value = false;
                    showErrorCampoProjecao.value = false;
                    showErrorMesProjecao.value = true;
                    return;
        }

        try {
            const response =  await useFetch(`${API_BASE_URL}/projecaogeracao/`, {
                    method: 'POST',
                    body: 
                        {
                            idGeradora: geradora,
                            ano: anoGeracao.value,
                            projecao: kwhGeracao.value,
                            mes: mesGeracao.value
                        },
                    key: 'usinaProjecao'
                });

                if (response) {
                    showSuccessAlertProjecao.value = true;
                    showErrorCampoProjecao.value = false;
                    showErrorMesProjecao.value = false;
                } else {
                    showErrorAlertProjecao.value = true;
                    showErrorCampoProjecao.value = false;
                    showErrorMesProjecao.value = false;
                }

        } catch (error) {
            showErrorAlertProjecao.value = true;
            showErrorCampoProjecao.value = false;
            showErrorMesProjecao.value = false;
        }

    /* ENVIAR GERACAO */
      } else {
        const {data: mesVetor} = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${route.params.id}&mes=${mesGeracao.value}&ano=${anoGeracao.value}`)
        if(mesVetor.value.length){
                showSuccessAlertProjecao.value = false;
                showErrorCampoProjecao.value = false;
                showErrorMesProjecao.value = true;
                return;
        }

        try {
            const response =  await useFetch(`${API_BASE_URL}/relatoriogeracao/`, {
                        method: 'POST',
                        body: 
                            {
                                idGeradora: geradora,
                                ano: anoGeracao.value,
                                geracao: kwhGeracao.value,
                                mes: mesGeracao.value
                            },
                        key: 'usinaGeracao'
                    });

            if (response) {
                showSuccessAlertProjecao.value = true;
                showErrorCampoProjecao.value = false;
                showErrorMesProjecao.value = false;
            } else {
                showErrorAlertProjecao.value = true;
                showErrorCampoProjecao.value = false;
                showErrorMesProjecao.value = false;
            }

        } catch (error) {
            showErrorAlertProjecao.value = true;
            showErrorCampoProjecao.value = false;
            showErrorMesProjecao.value = false;
        }
      }
      
    }

    //EDITAR GERAÇÃO
    const idGeracaoEdit = ref("");
    const mesGeracaoEdit = ref("");
    const anoGeracaoEdit = ref("")
    const kwhGeracaoEdit = ref("");
    const tipoGeracaoEdit = ref("");
    const dialogGeraConfig3 = ref(false)

    const openDialogEditGeracao = (geracaoId, tipo) =>{
        dialogGeraConfig3.value = true

        informacoesGeracao(geracaoId, tipo)

        showErrorCampoGeracaoEdit.value = false
        showSuccessAlertGeracaoEdit.value = false
        showErrorAlertGeracaoEdit.value = false
    }

    const informacoesGeracao = async (geracaoId, tipo) => {
        //INFO PROJEÇÃO
        if(tipo === 'P'){   
            const {data: projecao} = await useFetch(`${API_BASE_URL}/projecaogeracao/${geracaoId}`)
            mesGeracaoEdit.value = projecao.value.mes
            anoGeracaoEdit.value = projecao.value.ano
            kwhGeracaoEdit.value = projecao.value.projecao
            tipoGeracaoEdit.value = tipo

        //INFO GERAÇÃO REAL
        }else{
            const {data: real} = await useFetch(`${API_BASE_URL}/relatoriogeracao/${geracaoId}`)
            mesGeracaoEdit.value = real.value.mes
            anoGeracaoEdit.value = real.value.ano
            kwhGeracaoEdit.value = real.value.geracao
            tipoGeracaoEdit.value = tipo
        }

        idGeracaoEdit.value = geracaoId
    }

    //EDITAR GERAÇÕES
    const showErrorCampoGeracaoEdit = ref(false)
    const showSuccessAlertGeracaoEdit = ref(false)
    const showErrorAlertGeracaoEdit = ref(false)

    const editarGeracao = async (geracaoId, tipo) => {
        //EDITAR PROJEÇÃO
        if(tipo === 'P'){   
            showErrorCampoGeracaoEdit.value = false
            showSuccessAlertGeracaoEdit.value = false
            showErrorAlertGeracaoEdit.value = false


            if(!kwhGeracaoEdit.value){
                showErrorCampoGeracaoEdit.value = true
                showSuccessAlertGeracaoEdit.value = false
                showErrorAlertGeracaoEdit.value = false
                return;
            }

            try {
                const response = await useFetch(`${API_BASE_URL}/projecaogeracao/${geracaoId}`, {
                    method: 'PUT',
                    body: 
                        {
                            idGeradora: geradora,
                            ano: anoGeracaoEdit.value,
                            projecao: kwhGeracaoEdit.value,
                            mes: mesGeracaoEdit.value

                        },
                    key: 'projecaoEdit'
                });

                if (response){
                    showErrorCampoGeracaoEdit.value = false
                    showSuccessAlertGeracaoEdit.value = true

                    const {data: updateProjecao} = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${route.params.id}`)
                    proDetalheAno.value = updateProjecao._value

                } else{
                    showErrorAlertGeracaoEdit.value = true
                    showErrorCampoGeracaoEdit.value = false
                    showSuccessAlertGeracaoEdit.value = false
                }
            } catch (error){
                showErrorAlertGeracaoEdit.value = true
                showErrorCampoGeracaoEdit.value = false
                showSuccessAlertGeracaoEdit.value = false
            }


        //EDITAR GERAÇÃO REAL
        }else{
            if(!kwhGeracaoEdit.value){
                showErrorCampoGeracaoEdit.value = true
                showSuccessAlertGeracaoEdit.value = false
                showErrorAlertGeracaoEdit.value = false

                return;
            }

            try {
                const response = await useFetch(`${API_BASE_URL}/relatoriogeracao/${geracaoId}`, {
                    method: 'PUT',
                    body: 
                        {
                            idGeradora: geradora,
                            ano: anoGeracaoEdit.value,
                            geracao: kwhGeracaoEdit.value,
                            mes: mesGeracaoEdit.value

                        },
                    key: 'geraRealEdit'
                });

                if (response){
                    showErrorCampoGeracaoEdit.value = false
                    showErrorAlertGeracaoEdit.value = false
                    showSuccessAlertGeracaoEdit.value = true

                    const {data: updateReal} = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${route.params.id}`)
                    gerDetalheAno.value = updateReal._value

                } else{
                    showErrorAlertGeracaoEdit.value = true
                    showErrorCampoGeracaoEdit.value = false
                    showSuccessAlertGeracaoEdit.value = false
                }
            } catch (error){
                showErrorAlertGeracaoEdit.value = true
                showErrorCampoGeracaoEdit.value = false
                showSuccessAlertGeracaoEdit.value = false
            }

        }
    }



    /* DELETAR GERAÇÕES */
    const deleteProjecao = async (projecaoId) => {
    try {
        await useFetch(`${API_BASE_URL}/projecaogeracao/${projecaoId}`, {
          method: 'DELETE',
          key: 'deleteProjecao'
        });

        const { data: updatedGeraDetalhe } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        proDetalheAno.value = updatedGeraDetalhe._value;

      } catch (error) {
        console.error("Erro ao excluir a projeção:", error);
        alert("Erro ao excluir a projeção. Consulte o console para obter mais detalhes.");
      }
    }

    const deleteGeracao = async (geracaoId) => {
    try {
        await useFetch(`${API_BASE_URL}/relatoriogeracao/${geracaoId}`, {
          method: 'DELETE',
          key: 'deleteGeracao'
        });

        const { data: updatedGeraReal } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        gerDetalheAno.value = updatedGeraReal._value;

      } catch (error) {
        console.error("Erro ao excluir a geração:", error);
        alert("Erro ao excluir a geração. Consulte o console para obter mais detalhes.");
      }
    }




    //SISTEMA ALERT EXCLUIR USINA
    const showSuccessAlertUsina = ref(false);
    const dialogExcluir = ref(false);
    const openDialogExcluir = () => {
        dialogExcluir.value = true;
    };

    const excluirUsina = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/usina/${route.params.id}`, {
                method: 'DELETE',
            });
            
            if (response) {
                showSuccessAlertUsina.value = true;
                
            } else {
                alert('Erro ao excluir usina:', response.statusText);
            }
        } catch (error) {
        alert('Erro ao excluir usina:', error);
        }
    };

    // SISTEMA UNIDADES COMPENSADAS
    const {data: porcentagens} = await useFetch(`${API_BASE_URL}/porcentagem?idGeradora=${route.params.id}`)

    const procurarUnidadesCompensadas = async () => {
        const unidadesCompensadas = []

        await Promise.all(porcentagens.value.map(async (porcentagem) => {
            const idUnidadeCompensa = porcentagem.idUnidadeCompensa;
                const { data: predio } = await useFetch(`${API_BASE_URL}/unidadecompensacao/${idUnidadeCompensa}`);
                unidadesCompensadas.push(predio._rawValue);
        }));
        return unidadesCompensadas;
    }

    const unidadesCompensadas = await procurarUnidadesCompensadas()


    const {data: relatorios} = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`)

    const getQuantidadeRelatorios = (unidadeId, ano) => {
        const relatoriosCompensacaoDoAno = relatorios.value.filter((rela) => rela.idUnidadeCompensa === unidadeId && rela.ano === ano);
        return relatoriosCompensacaoDoAno.length;
    };

    /* ADICIONAR NOVA UNIDADE COMPENSADA*/
    const showSuccessAlertUnidade = ref(false);
    const showErrorAlertUnidade = ref(false);
    const showErrorCampoUnidade = ref(false);;

    const dialogNovaUnidade = ref(false);

    const ucUnidade = ref("");
    const nomeUnidade = ref("");
    const dataInicioUnidade = ref("");
    const consumoUnidade = ref("");
    const kwhUnidade = ref("");
    const porcentoUnidade = ref("");
    const enderecoUnidade = ref("");
    const statusUnidade = ref("");

    const openDialogNovaUnidade = () => {
        dialogNovaUnidade.value = true;
        showSuccessAlertUnidade.value = false;
        showErrorAlertUnidade.value = false;
        showErrorCampoUnidade.value = false;
    }; 

    const sendUnidade = async () => {
        if (!ucUnidade.value || !nomeUnidade.value || !dataInicioUnidade.value || !consumoUnidade.value || !kwhUnidade.value || !porcentoUnidade.value || !enderecoUnidade.value || !statusUnidade.value) {
            showErrorCampoUnidade.value = true;
            showSuccessAlertUnidade.value = false;
            showErrorAlertUnidade.value = false;
            return;
        }

        try {
            const response =  await useFetch(`${API_BASE_URL}/unidadecompensacao/`, {
            method: 'POST',
                body: 
                    {
                        uc: ucUnidade.value,
                        nome: nomeUnidade.value,
                        dataInicio: dataInicioUnidade.value,
                        mediaConsumo: consumoUnidade.value,
                        valorKWH: kwhUnidade.value,
                        qtdPorcento: porcentoUnidade.value,
                        endereco: enderecoUnidade.value,
                        status: statusUnidade.value,
                        idGeradora: geradora
                    },
                key: 'unidadePost'
            });

            if (response) {
                showSuccessAlertUnidade.value = true;
                showErrorAlertUnidade.value = false;
                showErrorCampoUnidade.value = false;

                const {data: updateUnidade} = await useFetch(`${API_BASE_URL}/unidadecompensacao?idGeradora=${route.params.id}`)
                unidadeCompensada.value = updateUnidade._value
                
            } else {
                showSuccessAlertUnidade.value = false;
                showErrorAlertUnidade.value = true;
                showErrorCampoUnidade.value = false;
            }
            
        } catch (error) {
                    showErrorAlertProjecao.value = true;
                    showErrorCampoProjecao.value = false;
                    showErrorMesProjecao.value = false;
                }
    }

    /* ADICIONAR NOVO RELATÓRIO NA UNIDADE*/
    const mesRelUni = ref("");
    const anoRelUni = ref("");
    const consumoUni = ref("");
    const valorConUni = ref("");
    const enerTusdUni = ref("");
    const valorTusdUni = ref("");
    const enerTeUni = ref("");
    const valorTeUni = ref("");
    const saldoEnergiaUni = ref("");

    const compensada =   ref("")
    const ucUnidadeRela =   ref("")
    const nomeUnidadeRela =   ref("")

    const dialogNovoRelatorio = ref(false)
    const showSuccessAlertRelatorio = ref(false);
    const showErrorCampoRelatorio = ref(false);;
    const showErrorMesRelatorio = ref(false);
    const showErrorAlertRelatorio = ref(false);



    const openDialogNovoRelatorio = async (idUnidadeCompensa) =>{
        dialogNovoRelatorio.value = true
        compensada.value = idUnidadeCompensa

        const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${compensada.value}`)
        ucUnidadeRela.value = unidadeDetalhe.value.uc
        nomeUnidadeRela.value = unidadeDetalhe.value.nome
    }


    const sendRelatorioUni = async () => {
        if (!mesRelUni.value || !anoRelUni.value || !saldoEnergiaUni.value || !consumoUni.value || !valorConUni.value || !enerTusdUni.value || !valorTusdUni.value || !enerTeUni.value || !valorTeUni.value ) {
            showErrorCampoRelatorio.value = true
            showSuccessAlertRelatorio.value = false
            showErrorMesRelatorio.value = false
            return;
        }
        
        const {data: relaVerificar} = await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${compensada.value}&mes=${mesRelUni.value}&ano=${anoRelUni.value}`)
    
        if(relaVerificar.value.length){
            showErrorMesRelatorio.value = true
            showErrorCampoRelatorio.value = false
            showSuccessAlertRelatorio.value = false
            return;
        }
        try {
            const response = await useFetch(`${API_BASE_URL}/relatoriocompensacao/`, {
                    method: 'POST',
                    body: 
                        {
                            idGeradora: geradora,
                            idUnidadeCompensa: compensada,
                            mes: mesRelUni.value,
                            ano: anoRelUni.value,
                            consumokWh: consumoUni.value,
                            consumoReais: valorConUni.value,
                            enerInjTUSD:  enerTusdUni.value,
                            enerInjTE:  enerTeUni.value,
                            valorInjTUSD: valorTusdUni.value,
                            valorInjTE: valorTeUni.value,
                            saldoEnergia: saldoEnergiaUni.value
                        },
                    key: 'RelatorioUniPost'
                });
            
                if (response){
                    showSuccessAlertRelatorio.value = true
                    showErrorCampoRelatorio.value = false
                    showErrorMesRelatorio.value = false

                } else {
                    showErrorAlertRelatorio.value = true
                    showSuccessAlertRelatorio.value = false
                    showErrorCampoRelatorio.value = false
                    showErrorMesRelatorio.value = false
                }
            } catch (error){
                showErrorAlertRelatorio.value = true
                showSuccessAlertRelatorio.value = false
                showErrorCampoRelatorio.value = false
                showErrorMesRelatorio.value = false
            }
    }

    //EDITAR UNIDADE COMPENSADA
    const dialogEditUnidade = ref(false)
    const showErrorCampoUnidadeEdit = ref(false)
    const showSuccessAlertUnidadeEdit = ref(false);
    const showErrorAlertUnidadeEdit = ref(false);

    const ucUnidadeEdit = ref("");
    const nomeUnidadeEdit = ref("");
    const dataInicioUnidadeEdit = ref("");
    const consumoUnidadeEdit = ref("");
    const kwhUnidadeEdit = ref("");
    const porcentoUnidadeEdit = ref("");
    const enderecoUnidadeEdit = ref("");
    const statusUnidadeEdit = ref("");

    const compensadaId = ref("")

    const openDialogEditUnidade = async (unidadeId) => {
        showErrorCampoUnidadeEdit.value = false
        showSuccessAlertUnidadeEdit.value = false
        showErrorAlertUnidadeEdit.value = false

        dialogEditUnidade.value = true
        

        const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${unidadeId}`)
            ucUnidadeEdit.value = unidadeDetalhe.value.uc
            nomeUnidadeEdit.value = unidadeDetalhe.value.nome
            dataInicioUnidadeEdit.value = unidadeDetalhe.value.dataInicio
            consumoUnidadeEdit.value = unidadeDetalhe.value.mediaConsumo
            kwhUnidadeEdit.value = unidadeDetalhe.value.valorKWH
            porcentoUnidadeEdit.value = unidadeDetalhe.value.qtdPorcento
            enderecoUnidadeEdit.value = unidadeDetalhe.value.endereco
            statusUnidadeEdit.value = unidadeDetalhe.value.status
            compensadaId.value = unidadeDetalhe.value.id
    }

    /* EDITAR UNIDADE ENVIO*/
    const editUnidade = async () => {
        if (!ucUnidadeEdit.value || !nomeUnidadeEdit.value || !dataInicioUnidadeEdit.value || !consumoUnidadeEdit.value || !kwhUnidadeEdit.value || !porcentoUnidadeEdit.value || !enderecoUnidadeEdit.value || !statusUnidadeEdit.value) {
            showErrorCampoUnidadeEdit.value = true
            showSuccessAlertUnidadeEdit.value = false
            return;
        }

        try {
            const response = await useFetch(`${API_BASE_URL}/unidadecompensacao/${compensadaId.value}`, {
                method: 'PUT',
                body: 
                    {
                        uc: ucUnidadeEdit.value,
                        nome: nomeUnidadeEdit.value,
                        dataInicio: dataInicioUnidadeEdit.value,
                        mediaConsumo: consumoUnidadeEdit.value,
                        valorKWH: kwhUnidadeEdit.value,
                        qtdPorcento: porcentoUnidadeEdit.value,
                        endereco: enderecoUnidadeEdit.value,
                        status: statusUnidadeEdit.value,
                        idGeradora: geradora
                    },
                key: 'unidadePost'
            });

            if (response){
                showErrorCampoUnidadeEdit.value = false
                showSuccessAlertUnidadeEdit.value = true

                const {data: updateUnidade} = await useFetch(`${API_BASE_URL}/unidadecompensacao?idGeradora=${route.params.id}`)
                unidadeCompensada.value = updateUnidade._value

            } else{
                showErrorAlertUnidadeEdit.value = true
                showErrorCampoUnidadeEdit.value = false
                showSuccessAlertUnidadeEdit.value = false
            }
        } catch (error){
            showErrorAlertUnidadeEdit.value = true
            showErrorCampoUnidadeEdit.value = false
            showSuccessAlertUnidadeEdit.value = false
        }
    }


    //EXCLUIR UNIDADE COMPENSADA
    const dialogExcluirUnidade = ref(false)
    const showSuccessAlertUnidadeExcluida = ref(false)
    const showErrorAlertUnidadeExcluida = ref(false)

    const ucUnidadeExcluir = ref("")
    const nomeUnidadeExcluir = ref("")
    const idUnidadeExcluir = ref("")

    const openDialogExcluirUnidade = async (unidadeId) =>{
        dialogExcluirUnidade.value = true

        const {data: unidadeDetalhe} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${unidadeId}`)
        ucUnidadeExcluir.value = unidadeDetalhe.value.uc
        nomeUnidadeExcluir.value = unidadeDetalhe.value.nome
        idUnidadeExcluir.value = unidadeDetalhe.value.id
    } 

    const deleteUnidade = async () => {
    try {
        const response = await useFetch(`${API_BASE_URL}/unidadecompensacao/${idUnidadeExcluir.value}`, {
          method: 'DELETE',
          key: 'deleteUnidade'
        });

        if(response){
            showSuccessAlertUnidadeExcluida.value = true
        } else{
            showSuccessAlertUnidadeExcluida.value = false
            showErrorAlertUnidadeExcluida.value = true

        }

        const { data: updatedUnidadeCompensada } = await useFetch(`${API_BASE_URL}/unidadecompensacao?idGeradora=${route.params.id}`);
        unidadeCompensada.value = updatedUnidadeCompensada._value;

      } catch (error) {
        console.error("Erro ao excluir a unidade compensada:", error);
        alert("Erro ao excluir a unidade. Consulte o console para obter mais detalhes.");
      }
    }

    // LISTA DE RELATORIOS
    const dialogRelatorios = ref(false)
    const relatoriosUnidade = ref("")
    const idUnidadeRela = ref("")

    const ucUnidadeRelatorio = ref("")
    const nomeUnidadeRelatorio = ref("")

    const openDialogRelatorios = async (unidadeId) =>{
        dialogRelatorios.value = true
        
        const {data: unidade} = await useFetch(`${API_BASE_URL}/unidadecompensacao/${unidadeId}`)
        ucUnidadeRelatorio.value = unidade.value.uc
        nomeUnidadeRelatorio.value = unidade.value.nome

        const {data: relatorios} = await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${unidadeId}`)
        relatoriosUnidade.value = relatorios._value
        idUnidadeRela.value = unidadeId
    }

    /* DELETAR RELATORIOS */
    const deleteRelatorio = async (relatorioId) => {
        try {
            await useFetch(`${API_BASE_URL}/relatoriocompensacao/${relatorioId}`, {
                method: 'DELETE',
                key: 'deleteRelatorio'
            });

            const { data: updatedRelatorios } = await useFetch(`${API_BASE_URL}/relatoriocompensacao?idUnidadeCompensa=${idUnidadeRela.value}`);
            relatoriosUnidade.value = updatedRelatorios._value;

        } catch (error) {
            console.error("Erro ao excluir relatorio:", error);
            alert("Erro ao excluir relatorio. Consulte o console para obter mais detalhes.");
            }
    }

    /* EDITAR */
    const dialogRelatoriosEditar = ref(false);
    const showErrorCampoEdit = ref(false)
    const showSuccessAlertEdit = ref(false)
    const showErrorAlertEdit = ref(false)

    const idRelaEdit = ref("");
    const mesRelUniEdit = ref("");
    const anoRelUniEdit = ref("");
    const consumoUniEdit = ref("");
    const valorConUniEdit = ref("");
    const enerTusdUniEdit = ref("");
    const valorTusdUniEdit = ref("");
    const enerTeUniEdit = ref("");
    const valorTeUniEdit = ref("");
    const saldoEnergiaEdit = ref("");

    const openDialogRelatoriosEditar = async (relatorioId) =>{
        const { data: relatorioInd } = await useFetch(`${API_BASE_URL}/relatoriocompensacao/${relatorioId}`);

        idRelaEdit.value = relatorioInd.value.id
        mesRelUniEdit.value = relatorioInd.value.mes
        anoRelUniEdit.value = relatorioInd.value.ano
        consumoUniEdit.value = relatorioInd.value.consumokWh
        valorConUniEdit.value = relatorioInd.value.consumoReais
        enerTusdUniEdit.value = relatorioInd.value.enerInjTUSD
        valorTusdUniEdit.value = relatorioInd.value.valorInjTUSD
        enerTeUniEdit.value = relatorioInd.value.enerInjTE
        valorTeUniEdit.value = relatorioInd.value.valorInjTE
        saldoEnergiaEdit.value = relatorioInd.value.saldoEnergia

        dialogRelatoriosEditar.value = true
    }

    const saveChangesRelatorio = async (idRelaEdit) => {
      if (!mesRelUniEdit.value || !anoRelUniEdit.value || !saldoEnergiaEdit.value || !consumoUniEdit.value || !valorConUniEdit.value || !enerTusdUniEdit.value || !valorTusdUniEdit.value || !enerTeUniEdit.value || !valorTeUniEdit.value) {
        showErrorCampoEdit.value = true;
        showSuccessAlertEdit.value = false;
        return;
      }


      try {
        const response = await useFetch(`${API_BASE_URL}/relatoriocompensacao/${idRelaEdit}`,
          {
            method: "PUT",
            body: {
                mes: mesRelUniEdit.value,
                ano: anoRelUniEdit.value,
                consumokWh: consumoUniEdit.value,
                consumoReais: valorConUniEdit.value,
                enerInjTUSD:  enerTusdUniEdit.value,
                enerInjTE:  enerTeUniEdit.value,
                valorInjTUSD: valorTusdUniEdit.value,
                valorInjTE: valorTeUniEdit.value,
                saldoEnergia: saldoEnergiaEdit.value
            },
            key: "relatorioPut",
          }
        );

        if (response) {
          showSuccessAlertEdit.value = true;
          showErrorCampoEdit.value = false;
        } else {
          showErrorAlertEdit.value = true;
          showSuccessAlertEdit.value = false;
          showErrorCampoEdit.value = false;
        }
      } catch (error) {
        showErrorAlertEdit.value = true;
        showSuccessAlertEdit.value = false;
        showErrorCampoEdit.value = false;
      }
};

    //MANUTENÇÃO
    /* APRESENTAÇÃO MANUTENCAO */
    const { data: manutencoes } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}`); 
    const { data: programada } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}&status=1`); 
    const { data: ultima } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}&status=3`); 
    
    
    const formatarData = (dataString) => {
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    const calcularDiasRestantes = (dataProgramada) => {
        const dataProgramadaObj = new Date(dataProgramada);
        const hoje = new Date();
        const diferencaTempo = dataProgramadaObj.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

        return diasRestantes;
    };
    
    const calcularDataPrevista = (dataUlt) => {
        if (ultima.length === 0) return '';

        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        const ultimaData = new Date(dataUlt);
        const mesPrevistoIndex = (ultimaData.getMonth() + 7) % 12;
        const mesPrevisto = meses[mesPrevistoIndex];

        return mesPrevisto;
    };

    /* ABRIR DIALOG*/
    const dialogConfiguracoes = ref(false)
    const dialogProgramarManutencao = ref(false);
    const dialogVerManutencoes = ref(false);
    const dialogManuCriada = ref(false);

    const openDialogConfigManu = async (usinaId) =>{
        dialogConfiguracoes.value = true
    }

    const programarManutencao = () =>{
        dialogProgramarManutencao.value = true
        dataManutencao.value = null
        empresaResponsavel.value = null
        showErrorCampoManu.value = false
        showSuccessAlertManu.value = false
    }

    const verManutencoes = async () =>{
        dialogVerManutencoes.value = true

        const { data: updateManu } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}`);
        manutencoes.value = updateManu._value
    }

   

    /* CRIAR NOVA MANUTENÇÃO*/
    const dataManutencao = ref("")
    const empresaResponsavel = ref("")
    const statusManu = ref("1")

    const itemManu = [
        { label: 'Programada', value: '1' },
        { label: 'Realizando', value: '2' },
        { label: 'Realizada', value: '3' },
    ];

    const showErrorCampoManu = ref(false)
    const showSuccessAlertManu = ref(false)

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    const sendManutencao = async () =>{
        if(!dataManutencao.value || !empresaResponsavel.value || !statusManu){
            showErrorCampoManu.value = true
            showSuccessAlertManu.value = false
            return;
        }

        try{
            const response = await useFetch(`${API_BASE_URL}/manutencao/`, {
                method: 'POST',
                body: JSON.stringify({
                    idGeradora: geradora,
                    data: dataManutencao.value,
                    empresa: empresaResponsavel.value,
                    dataCriacao: formattedDate,
                    status: statusManu.value 
                }),
                key: 'manuPost'
            });

            if (response){
                showSuccessAlertManu.value = true
                showErrorCampoManu.value = false
                
                const { data: updateManu } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}`);
                manutencoes.value = updateManu._value

                const { data: updaPro } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}&status=1`); 
                programada.value = updaPro._value
                
                dialogManuCriada.value = true
                dialogProgramarManutencao.value = false

                
            }else{
                alert("Erro ao criar manutenção!")
            }
        } catch (error){
            alert("Erro ao criar manutenção! 2")
        }
    }

    /* EDITAR STATUS*/
        const getStatusLabel = (status) => {
            switch (status) {
                case '1':
                     return 'Programado';
                case '2':
                     return 'Realizando';
                case '3':
                    return 'Realizado';
                default:
                    return '';
            }
        };
        const getStatusColorClass = (status) => {
            const colorMap = {
                1: 'bg-primary',
                2: 'bg-warning', 
                3: 'bg-success'
            };

        return colorMap[status] || 'bg-primary';
    };

    /* BAIXAR PDF */
    import html2pdf from 'html2pdf.js';
    const baixarPDF = () => {
        // Referência para os elementos 
        const tituloElement = document.getElementById('OSPDF'); 
        
        const tempContainer = document.createElement('div');
            
        const clonedTitulo = tituloElement.cloneNode(true); 
        
        tempContainer.appendChild(clonedTitulo); 

        // Gera o PDF usando o contêiner temporário
        html2pdf(tituloElement, {
            margin: 0, // Margem em polegadas
            filename: 'OSPeeHorto.pdf',
            html2canvas: {
            scale: 3, // Aumenta a qualidade
            },
            jsPDF: {
            unit: 'in',
            format: 'a4', // Tamanho do papel
            //   orientation: 'landscape', // Orientação do papel
            }
        });
    };

    //VER PDF NA ABA EDITS
    const dialogManuEditPDF = ref(false)
    const dataPDFEdit = ref()
    const empresaPDFEdit = ref()
    const verOrdem = (idManutencao) =>{
        const manuSelecionada = manutencoes.value.filter((item) => item.id === idManutencao)
        dataPDFEdit.value = manuSelecionada[0].data
        empresaPDFEdit.value = manuSelecionada[0].empresa

        dialogManuEditPDF.value = true

    }

    /* APAGAR MANUTENCAO */
    const deleteManutencao = async (manuId) => {
        try {
            await useFetch(`${API_BASE_URL}/manutencao/${manuId}`, {
                method: 'DELETE',
                key: 'deleteManutencao'
            });

            const { data: updaManutencao } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}`);
            manutencoes.value = updaManutencao._value;

            const { data: updaPro } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}&status=1`); 
            programada.value = updaPro._value

        } catch (error) {
            console.error("Erro ao excluir manutencao:", error);
            alert("Erro ao excluir manutencao. Consulte o console para obter mais detalhes.");
            }
    }

    /*EDITAR MANUTENÇÃO*/
    const dialogVisible = ref(false);
    const statusOptions = ['1','2','3'];

    const dataIndi = ref("")
    const empresaIndi = ref("")
    const statusIndi = ref("")
    const dataCriaIndi = ref("")
    const manuRefId = ref("")

    const abrirDialog = async (manuId) => {
        const { data: manuIndi } = await useFetch(`${API_BASE_URL}/manutencao/${manuId}`);

        dataIndi.value = manuIndi.value.data
        empresaIndi.value = manuIndi.value.empresa
        statusIndi.value = manuIndi.value.status
        dataCriaIndi.value = manuIndi.value.dataCriacao
        manuRefId.value = manuId

        dialogVisible.value = true;
    };

    const showErrorCampoManuEdit = ref(false)
    const showSuccessAlertManuEdit = ref(false)

    const editarManutencao = async (manuId) => {
        if (!statusIndi.value ) {
            showErrorCampoManuEdit.value = true
            showSuccessAlertManuEdit.value = false
            return;
        }

        try {
            const response = await useFetch(`${API_BASE_URL}/manutencao/${manuId}`, {
                method: 'PUT',
                body: 
                    {   
                        idGeradora: geradora,
                        data: dataIndi.value,
                        empresa: empresaIndi.value,
                        status: statusIndi.value,
                        dataCriacao: dataCriaIndi.value
                    },
                key: 'manuEdit'
            });

            if (response){
                showSuccessAlertManuEdit.value = true
                showErrorCampoManuEdit.value = false

                const { data: updaManutencao } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}`);
                manutencoes.value = updaManutencao._value;

                const { data: updaPro } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}&status=1`); 
                programada.value = updaPro._value

                const { data: updaUlt } = await useFetch(`${API_BASE_URL}/manutencao?idGeradora=${geradora}&status=3`); 
                ultima.value = updaUlt._value

            } else{
                alert("ERRO1 - Informar Manutenção")
            }
        } catch (error){
            alert("ERRO2 - Informar Manutenção")
        }
    }


    // ADICIONAR NOVA INJEÇÃO
    const dialogInjecao1 = ref(false)
    const showSuccessAlertInjecao = ref(false)
    const showErrorCampoInjecao = ref(false)
    const showErrorMesInjecao = ref(false)

    const mesInjecao = ref()
    const anoInjecao = ref()
    const pontaInjetado = ref()
    const pontaFInjetado = ref()
    const consumoKWHUsina = ref()
    const consumoReaisUsina = ref()

    const openDialogInjecao = () =>{
        dialogInjecao1.value = true
        mesInjecao.value = ""
        anoInjecao.value = ""
        pontaInjetado.value = ""
        pontaFInjetado.value = ""
        consumoKWHUsina.value = ""
        consumoReaisUsina.value = ""

        showErrorCampoInjecao.value = false
        showErrorMesInjecao.value = false
        showSuccessAlertInjecao.value = false
    }

    const sendInjecao = async () => {
        if(!mesInjecao.value || !anoInjecao.value || !pontaInjetado.value || !pontaFInjetado.value){
            showErrorCampoInjecao.value = true
            showErrorMesInjecao.value = false
            showSuccessAlertInjecao.value = false
            return;
        }

        const {data: mesVetor} = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${route.params.id}&mes=${mesInjecao.value}&ano=${anoInjecao.value}`)
            if(mesVetor.value.length){
                    showSuccessAlertInjecao.value = false;
                    showErrorCampoInjecao.value = false;
                    showErrorMesInjecao.value = true;
                    return;
        }

        try{
            const response = await useFetch(`${API_BASE_URL}/relatoriousina/`, {
                method: 'POST',
                body: JSON.stringify({
                    idGeradora: geradora,
                    injetadoPonta: pontaInjetado.value,
                    injetadoFPonta: pontaFInjetado.value,
                    consumoReais: consumoReaisUsina.value,
                    consumoKWHUsina: consumoKWHUsina.value,
                    mes: mesInjecao.value,
                    ano: anoInjecao.value 
                }),
                key: 'injecaoPost'
            });

            if (response){
                showErrorCampoInjecao.value = false
                showErrorMesInjecao.value = false
                showSuccessAlertInjecao.value = true
                
                const { data: updatedUsina } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
                injecaoUsinaAno.value = updatedUsina._value

                
            }else{
                showErrorCampoInjecao.value = false
                showErrorMesInjecao.value = false
                showSuccessAlertInjecao.value = false
                alert("ERROR")
            }
        } catch (error){
            showErrorCampoInjecao.value = false
            showErrorMesInjecao.value = false
            showSuccessAlertInjecao.value = false
            alert("ERROR")
        }
    }

    /* ABRIR DIALOG LISTAR INJEÇÃO PARA EDITAR/EXCLUIR*/
    const dialogInjecao2 = ref(false)

    const openDialogInjecao2 = async () =>{
        dialogInjecao2.value = true
    }
    
    /* ABRIR DIALOG EDITAR INJECAOID */
    const dialogInjecao3 = ref(false)
    const injetadoId = ref()

    const openDialogInjecao3 = async (injecaoId) =>{
        dialogInjecao3.value = true

        const { data: dadosInjecao } = await useFetch(`${API_BASE_URL}/relatoriousina/${injecaoId}`);
        mesInjecao.value = dadosInjecao.value.mes
        anoInjecao.value = dadosInjecao.value.ano
        pontaInjetado.value = dadosInjecao.value.injetadoPonta
        pontaFInjetado.value = dadosInjecao.value.injetadoFPonta
        injetadoId.value = dadosInjecao.value.id
        consumoKWHUsina.value = dadosInjecao.value.consumoKWH
        consumoReaisUsina.value = dadosInjecao.value.consumoReais

        showErrorCampoInjecao.value = false
        showSuccessAlertInjecao.value = false
    }

    /* EDITANDO INJEÇÃO */
    const editInjecao = async (injecaoId) => {
        if(!pontaInjetado.value || !pontaFInjetado.value){
            showErrorCampoInjecao.value = true
            showSuccessAlertInjecao.value = false
            return;
        }

        try {
            const response = await useFetch(`${API_BASE_URL}/relatoriousina/${injecaoId}`, {
                method: 'PUT',
                body: 
                    {   
                        idGeradora: geradora,
                        injetadoPonta: pontaInjetado.value,
                        injetadoFPonta: pontaFInjetado.value,
                    consumoReais: consumoReaisUsina.value,
                    consumoKWH: consumoKWHUsina.value,
                        mes: mesInjecao.value,
                        ano: anoInjecao.value 
                    },
                key: 'injecaoEdit'
            });

            if (response){
                showErrorCampoInjecao.value = false
                showSuccessAlertInjecao.value = true

                const { data: updaInjecao } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
                injecaoUsinaAno.value = updaInjecao._value;

            } else{
                alert("ERRO1 - Informar Informática")
            }
        } catch (error){
            alert("ERRO2 - Informar Informática")
        }
    }

    /* DELETANDO INJEÇÃO */
    const deleteInjecao = async (injecaoId) => {
        try {
            await useFetch(`${API_BASE_URL}/relatoriousina/${injecaoId}`, {
                method: 'DELETE',
                key: 'deleteInjecao'
            });

            const { data: updaInjecao } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
            injecaoUsinaAno.value = updaInjecao._value;

        } catch (error) {
            console.error("Erro ao excluir injeção:", error);
            alert("Erro ao excluir injeção. Consulte o console para obter mais detalhes.");
        }
    }

    const AlertManutencao = ref(false)
    const verificarManutencao = (qtdReal, qtdProjecao) => {
        if((qtdReal - qtdProjecao) >= 0){
            AlertManutencao.value = false
            return 'Ok'
        }else{
            AlertManutencao.value = true
            return 'Abaixo'
        }
    }
</script>
<template>
    <!-- BANNER -->
    <v-row>
    <div
      class="v-card v-theme--BLUE_THEME v-card--density-default elevation-10 rounded-md v-card--variant-elevated bg-lightprimary elevation-0 rounded-md mb-8"
    >
      <div class="px-8 py-8 py-lg-0">
        <div class="d-flex justify-space-between">
          <div class="d-flex py-0 align-center">
            <div>
              <h3 class="text-h3 mb-2">Informações Individuais</h3>
              <ul
                class="v-breadcrumbs v-breadcrumbs--density-default text-h6 font-weight-medium pa-0 ml-n1"
              >
                <!---->
                <li class="v-breadcrumbs-item" text="Dashboard">
                  <a class="v-breadcrumbs-item--link" href="/" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Eficiência
                    </h6></a
                  >
                </li>
                <li class="v-breadcrumbs-divider">
                  <div class="d-flex align-center text-h3 mt-n4">.</div>
                </li>
                <li class="v-breadcrumbs-item" text="Dashboard">
                  <a class="v-breadcrumbs-item--link" href="/usinas" style="text-decoration:none"
                    ><h6 class="text-medium-emphasis text-subtitle-1">
                      Usinas
                    </h6></a
                  >
                </li>
                <li class="v-breadcrumbs-divider">
                  <div class="d-flex align-center text-h3 mt-n4">.</div>
                </li>
                <li
                  class="v-breadcrumbs-item v-breadcrumbs-item--disabled"
                  text="Relatórios"
                >
                  <h6 class="text-medium-emphasis text-subtitle-1">{{ usinaDetalhe.nome}}</h6>
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

    <!-- DIVIDIR -->
    <v-row>
        <v-divider></v-divider>
        <br>
    </v-row>

    <!-- EXCLUIR USINA-->
    <div class="text-center">
        <v-dialog v-model="dialogExcluir"  persistent width="auto">
            <v-card>
                <v-card-text v-if="showSuccessAlertUsina">
                   <v-alert type="success" title="Exclusão" text="Usina EXCLUÍDA com sucesso!"></v-alert> 
                </v-card-text>
                
                <v-card-text v-if="!showSuccessAlertUsina">
                    Você tem certeza que deseja excluir a usina?
                </v-card-text>
                <v-card-actions v-if="!showSuccessAlertUsina">
                    <v-col cols="6" >
                        <v-btn color="blue-darken-1" block @click="dialogExcluir = false">Fechar</v-btn>
                    </v-col>
                    <v-col cols="6" >
                        <v-btn color="error" block @click="excluirUsina">Excluir</v-btn>
                    </v-col>
                </v-card-actions>    
                <v-card-actions v-if="showSuccessAlertUsina">
                    <v-btn color="succes" block href="/usinas">Fechar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>

    <!-- CARD INFORMAÇÕES USINA E MANUTENÇÕES-->
    <v-row>
        <v-col v-if="AlertManutencao" cols="12">
                            <v-alert type="warning">
                                Gerações estão baixas. Talvez seja melhor adiantar a próxima manutenção programanda.
                            </v-alert>
                        </v-col>
        <v-col cols="12" md="6">
            <UiParentCard :title="'UC ' + usinaDetalhe.uc"> 
                <div class="pa-7 pt-1">
                    <v-row>
                        <v-col cols="12">
                            <div class="d-flex align-center">
                                <h4 class="mr-2">Nome: </h4>
                                {{ usinaDetalhe.nome }}
                            </div>
                        </v-col>
                        <v-col cols="6">
                            <div class="d-flex align-center">
                                <h4 class="mr-2">Data de Início: </h4>
                                {{ new Date(usinaDetalhe.dataInicio).toLocaleDateString('pt-BR') }}
                            </div>
                        </v-col>
                        <v-col cols="6">
                            <div class="d-flex align-center">
                                <h4 class="mr-2">Potência: </h4>
                                {{ usinaDetalhe.potencia }}
                            </div>
                        </v-col> 
                        <v-col cols="12" class="text-center">
                            <v-btn @click="openDialogExcluir" size="30" icon class="bg-error">
                                <v-avatar size="30" class="text-white">
                                    <TrashIcon size="17" />
                                </v-avatar>
                                <v-tooltip activator="parent" location="bottom">Excluir Usina</v-tooltip>
                            </v-btn>
                        </v-col>
                    </v-row>
                </div>
            </UiParentCard>
        </v-col>

        <v-col cols="12" md="6">
            <UiParentCard title="Manutenções" > 
                <div class="pa-7 pt-1">
                    <v-row>
                        <v-col cols="6">
                            <div class="d-flex align-center">
                                <h4 class="mr-2">Última: </h4>
                                <span v-if="ultima.length === 0">
                                    Não há.
                                </span>
                                <span v-else>
                                    {{ formatarData(ultima[ultima.length -1].data) }}
                                </span>
                            </div>
                        </v-col>
                        <v-col cols="6">
                            <div v-if="ultima.length > 0" class="d-flex align-center">
                                <h4 class="mr-2">Prevista: </h4>
                                <span>{{ calcularDataPrevista(ultima[ultima.length -1].data) }}</span>
                            </div>
                        </v-col>
                        <v-col cols="6">
                            <div class="d-flex align-center">
                                <h4 class="mr-2">Programada: </h4>
                                <span v-if="programada.length === 0">
                                    Não há.
                                </span>
                                    
                                <span v-else v-for="prog in programada" :key="prog.id">{{ formatarData(prog.data) }}</span>

                            </div>
                        </v-col>
                        <v-col cols="6" class="text-center">
                            <div v-if="programada.length > 0">
                                <h4 class="mr-2">Falta {{ calcularDiasRestantes(programada[0].data) }} dias</h4>
                            </div>
                        </v-col>
                        <v-col cols="12" class="text-center">
                            <v-btn @click="openDialogConfigManu(usinaDetalhe.id)" size="30" icon class="bg-primary ml-5 mr-5">
                                <v-avatar size="30" class="text-white">
                                    <ReportIcon size="20" />
                                </v-avatar>
                                <v-tooltip activator="parent" location="bottom">Configurações</v-tooltip>
                            </v-btn>
                        </v-col>
                        
                    </v-row>
                </div>
            </UiParentCard>
        </v-col>
    </v-row> 

    <!-- MENU MANUTENÇÕES (MENU, ADICIONAR MANUTENCAO, LISTAR MANUTENCOES) // PROGRAMAR MANU // PDF MANU // VERMANUTENÇÕES-->
    <v-row justify="center">
        <v-dialog v-model="dialogConfiguracoes" width="500">
        <v-card>
            <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">Configurações</span>
            </v-card-title>
            <v-card-text>
            <v-container>
                <v-row>
                <v-col cols="12" class="text-center">
                    <v-btn @click="programarManutencao" color="primary mr-5 mb-5">Programar Manutenção</v-btn>
                    <v-btn @click="verManutencoes" color="primary mb-5">Ver Manutenções</v-btn>
                </v-col>
                </v-row>
            </v-container>
            </v-card-text>
        </v-card>
        </v-dialog>

    <v-dialog v-model="dialogProgramarManutencao" width="500">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Programar Manutenção</span>
        </v-card-title>
        <v-card-text>
            <v-row>
                <v-col v-if="showErrorCampoManu" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertManu" cols="12">
                    <v-alert type="success">
                            Manutenção programada com sucesso!
                        </v-alert>
                </v-col>
                <v-col cols="12">
                    <v-text-field v-model="dataManutencao" label="Data da Manutenção" type="date" required></v-text-field>
                </v-col>
                <v-col cols="12">
                    <v-text-field v-model="empresaResponsavel" label="Nome da Empresa Responsável" required></v-text-field>
                </v-col>
                <v-col cols="12" class="text-center">
                    <v-btn @click="sendManutencao" type="submit" color="primary">Programar</v-btn>
                </v-col>
            </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogManuCriada" width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Manutenção Programada...</span>
        </v-card-title>
        <v-card-text ref="tabelaElement" id="OSPDF">
            <v-row>
                <v-col cols="2" class="text-right">
                    <img src="/images/logo_horto.png" alt="" width="70"> 
                </v-col> 
                <v-col cols="7" class="text-center">
                    
                </v-col> 
                <v-col cols="2">
                    <img src="/images/logo_peehorto.png" alt="" style="margin-right: 250px" width="150"> 
                </v-col> 
            </v-row>
            <v-row justify="space-around">
                <v-col cols="12" class="text-center" style="padding-bottom: 10px;">
                    <h2>ORDEM DE SERVIÇO</h2>
                </v-col> 
                <v-col cols="12" class="text-center" style="padding-top: 0px; padding-bottom: 0px;">
                    <h5>Secretaria de Obras</h5>
                </v-col> 
                <v-col cols="12" class="text-center" style="padding-top: 0px;">
                    <h5>Departamento de Iluminação Pública</h5>
                </v-col>   
            </v-row>
            <v-row>
                <v-col cols="12" class="text-center">
                    <v-table>
                        <thead>
                            <tr>
                                <th colspan="3" class="text-center bg-primary" >INFORMAÇÕES</th>
                            </tr>
                            <tr>
                                <th class="text-center" style="background-color: #e8e8e8">UNIDADE</th>
                                <th colspan="2" class="text-center" style="background-color: #e8e8e8">DESCRIÇÃO</th>
                            </tr>
                            <tr>
                                <td>{{ usinaDetalhe.uc}}</td>
                                <td colspan="2" class="text-center">{{ usinaDetalhe.nome }}</td>
                            </tr>
                            <tr>
                                <th class="text-center" colspan="3" style="background-color: #e8e8e8">ENDEREÇO</th>
                            </tr>
                            <tr>
                                <td  colspan="3" style="font-size: 13px" >{{ usinaDetalhe.endereco}}</td>
                            </tr>
                            <tr>
                                <td colspan="3"></td>
                            </tr>
                            <tr>
                                <th class="text-center" style="background-color: #e8e8e8">DATA</th>
                                <th class="text-center" style="background-color: #e8e8e8">SOLICITAÇÃO</th>
                                <th class="text-center" style="background-color: #e8e8e8">EMPRESA RESPONSÁVEL</th>
                            </tr>
                            <tr>
                                <td>{{ formatarData(dataManutencao) }}</td>
                                <td>Manutenção em Usina Fotovoltaica.</td>
                                <td>{{ empresaResponsavel }}</td>
                            </tr>
                            <tr>
                                <td colspan="3"></td>
                            </tr>
                             <tr>
                                <th colspan="3" class="text-center" style="background-color: #e8e8e8;">Descrição</th>
                            </tr>
                            <tr>
                                <td colspan="3">[campo descrição]</td>
                            </tr>
                        </thead>
                    </v-table>
                    <br>
                    <v-divider></v-divider>
                    <br>
                    <v-row>
                        <v-col cols="6" class="text-left">
                            <h5>www.admin.peehorto.com</h5>
                        </v-col>
                        <v-col cols="6" class="text-right">
                            <h5>{{ new Date().toLocaleDateString() }}</h5>
                        </v-col>
                    </v-row>
                    <br>
                    <br>
                    <br>  
                    <v-divider></v-divider>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-actions>
           <v-row justify="space-around">
            <v-btn @click="baixarPDF()" color="error">
                <v-avatar size="30" class="text-error">
                    <FileTextIcon  />
                </v-avatar>
                PDF Geral
            </v-btn>
           </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogVerManutencoes" width="800">
      <v-card class="text-center">
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Ver Manutenções</span>
        </v-card-title>
        <v-card-text>
            <v-table class="table" >
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Data</th>
                        <th>Empresa</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
            <tbody class="text-left">
                <tr v-for="manutencao in manutencoes" :key="manutencao.id">
                    <td>{{ manutencao.id }}</td>
                    <td>{{ manutencao.data }}</td>
                    <td>{{ manutencao.empresa }}</td>
                    <td>
                        <v-chip :class="getStatusColorClass(manutencao.status)">
                        {{ getStatusLabel(manutencao.status) }}
                        </v-chip>
                    </td> 
                    <td>
                        <v-btn @click="verOrdem(manutencao.id)" icon class="mr-2">
                            <FileTextIcon  />
                        </v-btn>
                        <v-btn @click="abrirDialog(manutencao.id)" icon class="mr-2">
                            <v-icon>mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn @click="deleteManutencao(manutencao.id)" icon>
                            <v-icon>mdi-delete</v-icon>
                        </v-btn>
                    </td>
                </tr>
            </tbody>
            </v-table>
                <v-alert v-if="manutencoes.length === 0" >
                    Nenhuma manutenção encontrada.
                </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
    </v-row>

    <v-dialog v-model="dialogManuEditPDF" width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">[Download PDF] Manutenção Programada </span>
        </v-card-title>
        <v-card-text ref="tabelaElement" id="OSPDF">
            <v-row>
                <v-col cols="2" class="text-right">
                    <img src="/images/logo_horto.png" alt="" width="70"> 
                </v-col> 
                <v-col cols="7" class="text-center">
                    
                </v-col> 
                <v-col cols="2">
                    <img src="/images/logo_peehorto.png" alt="" style="margin-right: 250px" width="150"> 
                </v-col> 
            </v-row>
            <v-row justify="space-around">
                <v-col cols="12" class="text-center" style="padding-bottom: 10px;">
                    <h2>ORDEM DE SERVIÇO</h2>
                </v-col> 
                <v-col cols="12" class="text-center" style="padding-top: 0px; padding-bottom: 0px;">
                    <h5>Secretaria de Obras</h5>
                </v-col> 
                <v-col cols="12" class="text-center" style="padding-top: 0px;">
                    <h5>Departamento de Iluminação Pública</h5>
                </v-col>   
            </v-row>
            <v-row>
                <v-col cols="12" class="text-center">
                    <v-table>
                        <thead>
                            <tr>
                                <th colspan="3" class="text-center bg-primary" >INFORMAÇÕES</th>
                            </tr>
                            <tr>
                                <th class="text-center" style="background-color: #e8e8e8">UNIDADE</th>
                                <th colspan="2" class="text-center" style="background-color: #e8e8e8">DESCRIÇÃO</th>
                            </tr>
                            <tr>
                                <td>{{ usinaDetalhe.uc}}</td>
                                <td colspan="2" class="text-center">{{ usinaDetalhe.nome }}</td>
                            </tr>
                            <tr>
                                <th class="text-center" colspan="3" style="background-color: #e8e8e8">ENDEREÇO</th>
                            </tr>
                            <tr>
                                <td  colspan="3" style="font-size: 13px" >{{ usinaDetalhe.endereco}}</td>
                            </tr>
                            <tr>
                                <td colspan="3"></td>
                            </tr>
                            <tr>
                                <th class="text-center" style="background-color: #e8e8e8">DATA</th>
                                <th class="text-center" style="background-color: #e8e8e8">SOLICITAÇÃO</th>
                                <th class="text-center" style="background-color: #e8e8e8">EMPRESA RESPONSÁVEL</th>
                            </tr>
                            <tr>
                                <td>{{ formatarData(dataPDFEdit) }}</td>
                                <td>Manutenção em Usina Fotovoltaica.</td>
                                <td>{{ empresaPDFEdit }}</td>
                            </tr>
                            <tr>
                                <td colspan="3"></td>
                            </tr>
                             <tr>
                                <th colspan="3" class="text-center" style="background-color: #e8e8e8;">Descrição</th>
                            </tr>
                            <tr>
                                <td colspan="3">[campo descrição]</td>
                            </tr>
                        </thead>
                    </v-table>
                    <br>
                    <v-divider></v-divider>
                    <br>
                    <v-row>
                        <v-col cols="6" class="text-left">
                            <h5>www.admin.peehorto.com</h5>
                        </v-col>
                        <v-col cols="6" class="text-right">
                            <h5>{{ new Date().toLocaleDateString() }}</h5>
                        </v-col>
                    </v-row>
                    <br>
                    <br>
                    <br>  
                    <v-divider></v-divider>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-actions>
           <v-row justify="space-around">
            <v-btn @click="baixarPDF()" color="error">
                <v-avatar size="30" class="text-error">
                    <FileTextIcon  />
                </v-avatar>
                PDF Geral
            </v-btn>
           </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- EDITAR MANUTENÇÃO -->
    <v-dialog v-model="dialogVisible" max-width="400">
        <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            Editar Status
        </v-card-title>
        <v-card-text >
            <v-col v-if="showErrorCampoManuEdit" cols="12">
                <v-alert  type="error">
                    Preencha todos os campos!
                </v-alert>
            </v-col>
            <v-col v-if="showSuccessAlertManuEdit" cols="12">
                <v-alert type="success">
                    Manutenção editada com sucesso!
                </v-alert>
            </v-col>
            <v-row>
                <v-col cols="12" class="text-center">
                    <strong class="mr-5">1: Programado</strong>
                    <strong class="mr-5">2: Realizando</strong><br>
                    <strong class="mr-5">3: Realizado</strong>
                </v-col>
            </v-row>
            <br>
            <v-select v-model="statusIndi" :items="statusOptions" label="Selecione o status"></v-select>
        </v-card-text>
        <v-card-actions>
            <v-btn @click="editarManutencao(manuRefId)" color="primary">
            Editar
            </v-btn>
        </v-card-actions>
        </v-card>
    </v-dialog>

    <br>

    <!-- CARD GERAÇÕES E INJEÇÕES -->
    <v-row>
        <!-- TABELA GERAÇÕES -->
        <v-col sm="12" xs="12" md="12" lg="6" xl="6" cols="12">
            <v-card elevation="10" class="withbg">
                <!-- style="background-color: #ECF2FF; " -->
                <v-card-item class="pa-0">
                    <div class="d-sm-flex align-center">
                        
                        <h5 class="text-h3 pl-7 pt-7">
                            <v-avatar class="bg-lightprimary text-primary mb-1" size="25">
                                <BulbIcon size="19" />
                            </v-avatar>
                             
                            
                            {{ selectedYear === '2024' ? 'Geração 2024 (kWh)' : 'Geração 2023 (kWh)' }}</h5>
                    </div>
                    <div class="text-center">
                        <v-btn @click="toggleYear" size="40" icon class="bg-primary mt-2 ml-5 mr-5 mb-2">
                            <v-avatar size="30" class="text-white">
                                <ExchangeIcon size="20" />
                            </v-avatar>
                            <v-tooltip activator="parent" location="bottom">Trocar ano</v-tooltip>
                        </v-btn>
                        <v-btn @click="openDialogProjecao" size="40" icon class="bg-primary mt-2 ml-5 mr-5 mb-2">
                            <v-avatar size="30" class="text-white">
                                <SettingsIcon size="20" />
                            </v-avatar>
                            <v-tooltip activator="parent" location="bottom">Configurações</v-tooltip>
                        </v-btn>
                    </div>
                    <div class="pa-7 pt-1"> 
                        <v-row>
                            <v-col cols="12">
                            <v-table>
                                <thead>
                                <tr>
                                    <th class="text-center">Geração</th>
                                    <th class="text-center">Jan</th>
                                    <th class="text-center">Fev</th>
                                    <th class="text-center">Mar</th>
                                    <th class="text-center">Abr</th>
                                    <th class="text-center">Mai</th>
                                    <th class="text-center">Jun</th>
                                    <th class="text-center">Jul</th>
                                    <th class="text-center">Ago</th>
                                    <th class="text-center">Set</th>
                                    <th class="text-center">Out</th>
                                    <th class="text-center">Nov</th>
                                    <th class="text-center">Dez</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <th>Projetada</th>
                                    <td class="text-center" v-for="geracao in proDetalheAno" :key="geracao.id">{{ geracao.projecao }}</td>
                                </tr>
                                <tr>
                                    <th>Real</th>
                                    <td class="text-center" v-for="real in gerDetalheAno" :key="real.id">
                                        {{ real.geracao }} 
                                    </td>
                                </tr>
                                <tr>
                                    <th>Análise</th>
                                    <td class="text-center" v-for="(real, index) in gerDetalheAno" :key="real.id">
                                        <v-chip :color="(real.geracao - proDetalheAno[index].projecao) >= 0 ? 'primary' : 'error'" variant="tonal">
                                            {{ verificarManutencao(real.geracao, proDetalheAno[index].projecao) }}
                                        </v-chip>
                                    </td>
                                </tr>
                                </tbody>
                            </v-table>
                            </v-col>
                        </v-row>
                    </div>
                </v-card-item>
            </v-card>
        </v-col>
        
        <!-- TABELA INJEÇÕES -->
        <v-col sm="12" xs="12" md="12" lg="6" xl="6" cols="12">
            <v-card elevation="10" class="withbg">
                <!-- style="background-color: #ECF2FF; " -->
                <v-card-item class="pa-0">
                    <div class="d-sm-flex align-center">
                        
                        <h5 class="text-h3 pl-7 pt-7">
                            <v-avatar class="bg-lightsecondary text-secondary mb-1" size="25">
                                <NetworkIcon size="19" />
                            </v-avatar>
                             
                            
                            {{ selectedYear === '2024' ? 'Injetado 2024 (kWh)' : 'Injetado 2023 (kWh)' }}</h5>
                    </div>
                    <div class="text-center">
                        <v-btn @click="openDialogInjecao" size="40" icon class="bg-secondary mt-2 ml-5 mr-5 mb-2">
                            <v-avatar size="30" class="text-white">
                                <SettingsIcon size="20" />
                            </v-avatar>
                            <v-tooltip activator="parent" location="bottom">Configurações</v-tooltip>
                        </v-btn>
                    </div>
                    <div class="pa-7 pt-1"> 
                        <v-row>
                            <v-col cols="12">
                            <v-table>
                                <thead>
                                <tr>
                                    <th class="text-center">-</th>
                                    <th class="text-center">Jan</th>
                                    <th class="text-center">Fev</th>
                                    <th class="text-center">Mar</th>
                                    <th class="text-center">Abr</th>
                                    <th class="text-center">Mai</th>
                                    <th class="text-center">Jun</th>
                                    <th class="text-center">Jul</th>
                                    <th class="text-center">Ago</th>
                                    <th class="text-center">Set</th>
                                    <th class="text-center">Out</th>
                                    <th class="text-center">Nov</th>
                                    <th class="text-center">Dez</th>
                                </tr>
                                </thead>
                                <tbody v-if="gerDetalheAno.length > 0">
                                    <tr>
                                        <th>Consumo (geração)</th>
                                        <td class="text-center" v-for="(injecao, index) in injecaoUsinaAno" :key="injecao.id">
                                            {{ parseInt(gerDetalheAno[index].geracao)  - ((Number(injecao.injetadoPonta) + Number(injecao.injetadoFPonta))) }}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>Injetado</th>
                                        <td class="text-center" v-for="injecao in injecaoUsinaAno" :key="injecao.id">{{ (Number(injecao.injetadoPonta) + Number(injecao.injetadoFPonta)) }}</td>
                                    </tr>
                                    <tr>
                                        <th>Análise</th>
                                        <td class="text-center" v-for="(injecao, index) in injecaoUsinaAno" :key="injecao.id">
                                            <!-- Verifica se a quantidade atual é maior que a do mês anterior -->
                                            <v-avatar v-if="index > 0 && Number(injecao.injetadoPonta) + Number(injecao.injetadoFPonta) > Number(injecaoUsinaAno[index - 1].injetadoPonta + injecaoUsinaAno[index - 1].injetadoFPonta)" class="bg-lightsuccess text-success" size="30">
                                                <ArrowUpRightIcon size="20" />
                                            </v-avatar>

                                            <!-- Verifica se a quantidade atual é menor que a do mês anterior -->
                                            <v-avatar v-else-if="index > 0 && Number(injecao.injetadoPonta) + Number(injecao.injetadoFPonta) < Number(injecaoUsinaAno[index - 1].injetadoPonta + injecaoUsinaAno[index - 1].injetadoFPonta)" class="bg-lighterror text-error" size="30">
                                                <ArrowDownRightIcon size="20" />
                                            </v-avatar>

                                            <v-avatar v-else-if="index > 0 && Number(injecao.injetadoPonta) + Number(injecao.injetadoFPonta) === 0" class="bg-lighterror text-error" size="30">
                                                <CircleXIcon size="20" />
                                            </v-avatar>

                                            <!-- Se não for nem maior nem menor, é igual -->
                                            <v-avatar v-else class="bg-lightsecondary text-secondary" size="30">
                                                <CheckIcon size="20" />
                                            </v-avatar>
                                        </td>
                                    </tr>
                                            
                                    </tbody>
                                    <tbody v-else>
                                        <tr>
                                            <td colspan="13">
                                               É necessário ter pelo menos 1 geração real no mês do no sistema para ver a tabela de injeções.
                                            </td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </v-col>
                        </v-row>
                    </div>
                </v-card-item>
            </v-card>
        </v-col>
    </v-row>
    
    <!-- SISTEMA GERAÇÕES -->
    <!-- ADICIONAR GERAÇÃO PROJ OU REAL-->
    <v-row justify="center">
    <v-dialog v-model="dialogGeraConfig1" width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Adicionar Geração Projetado ou Real</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
                <v-col v-if="showErrorCampoProjecao" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showErrorMesProjecao" cols="12">
                    <v-alert  type="error">
                        Esse mês/ano já está preenchido!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertProjecao" cols="12">
                    <v-alert type="success">
                            Geração enviada com sucesso!
                        </v-alert>
                </v-col>
                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Mês</v-label>
                    <v-select v-model="mesGeracao" :items="meses" label="Mês" hide-details color="primary" required></v-select>
                    </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Ano</v-label>
                    <v-select v-model="anoGeracao" :items="anos" label="Ano" hide-details color="primary"></v-select>
                </v-col>

                <v-col cols="6" >
                    <v-label class="font-weight-bold mb-1">Tipo</v-label>
                    <v-radio-group v-model="tipoGeracao" inline>
                        <v-radio label="Projetada" value="P"></v-radio>
                        <v-radio label="Real" value="R"></v-radio>
                    </v-radio-group>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Projeção (kWh)</v-label>
                    <v-text-field v-model="kwhGeracao" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>
                
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialogGeraConfig2 = true">
            Editar gerações existentes
          </v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="sendGeracao">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-row>

    <!-- VIZUALIZAR GERAÇÕES PROJ E REAL-->
    <v-row>
    <v-dialog v-model="dialogGeraConfig2" width="1024" >
        <v-card>
          <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            Gerações Existentes
          </v-card-title>
          <v-card-text>
            <v-row>
                <v-col>
                    <v-card>
                        <v-card-title class="text-h5 text-center mb-5">Projetada</v-card-title>
                        <v-card-text>
                            <v-row v-for="geracao in proDetalheAno" :key="geracao.id">
                                <v-col class="text-center">
                                    <strong>MÊS:</strong><br> {{ geracao.mes }}
                                </v-col>
                                <v-col class="text-center">
                                    <strong>kWh:</strong><br> {{ geracao.projecao }}
                                </v-col>
                                <v-col>
                                    <v-btn @click="openDialogEditGeracao(geracao.id, 'P')" color="success">Editar</v-btn>
                                </v-col>
                                <v-col>
                                    <v-btn @click="deleteProjecao(geracao.id)" color="error">Excluir</v-btn>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col>
                    <v-card>
                        <v-card-title class="text-h5 text-center mb-5">Real</v-card-title>
                        <v-card-text>
                            <v-row v-for="real in gerDetalheAno" :key="real.id">
                                <v-col class="text-center">
                                    <strong>MÊS:</strong><br> {{ real.mes }}
                                </v-col>
                                <v-col class="text-center">
                                    <strong>kWh:</strong><br> {{ real.geracao }}
                                </v-col>
                                <v-col>
                                    <v-btn @click="openDialogEditGeracao(real.id, 'R')" color="success">Editar</v-btn>
                                </v-col>
                                <v-col>
                                    <v-btn @click="deleteGeracao(real.id)" color="error">Excluir</v-btn>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-row>

    <!-- EDITAR GERAÇÃO PROJ OU REAL -->
    <v-row>
    <v-dialog v-model="dialogGeraConfig3" width="1024" >
        <v-card>
          <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            Editando Geração
          </v-card-title>
          <v-card-text>
            <v-row>
                <v-container>
                    <v-row>
                        <v-col v-if="showErrorCampoGeracaoEdit" cols="12">
                            <v-alert  type="error">
                                Preencha todos os campos!
                            </v-alert>
                        </v-col>
                        <v-col v-if="showErrorAlertGeracaoEdit" cols="12">
                            <v-alert  type="error">
                                Erro ao tentar editar geração!
                            </v-alert>
                        </v-col>
                        <v-col v-if="showSuccessAlertGeracaoEdit" cols="12">
                            <v-alert type="success">
                                    Geração enviada com sucesso!
                                </v-alert>
                        </v-col>
                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Mês</v-label>
                            <v-select disabled v-model="mesGeracaoEdit" :items="meses" label="Mês" hide-details color="primary" required></v-select>
                            </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ano</v-label>
                            <v-select disabled v-model="anoGeracaoEdit" :items="anos" label="Ano" hide-details color="primary"></v-select>
                        </v-col>

                        <v-col cols="6" >
                            <v-label class="font-weight-bold mb-1">Tipo</v-label>
                            <v-radio-group disabled v-model="tipoGeracaoEdit" inline>
                                <v-radio label="Projetada" value="P"></v-radio>
                                <v-radio label="Real" value="R"></v-radio>
                            </v-radio-group>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Projeção (kWh)</v-label>
                            <v-text-field v-model="kwhGeracaoEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>
                    </v-row>
                </v-container>
            </v-row>
          </v-card-text>
          <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialogGeraConfig3 = false">
            Fechar
          </v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="editarGeracao(idGeracaoEdit, tipoGeracaoEdit)">
            Salvar
          </v-btn>
        </v-card-actions>
        </v-card>
      </v-dialog>
    </v-row>

    <!-- SISTEMA INJEÇÕES -->
    <!-- ADICIONAR INJEÇÃO -->
    <v-row justify="center">
    <v-dialog v-model="dialogInjecao1" width="500">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Adicionar nova Injeção</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
                <v-col v-if="showErrorCampoInjecao" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showErrorMesInjecao" cols="12">
                    <v-alert  type="error">
                        Esse mês/ano já está preenchido!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertInjecao" cols="12">
                    <v-alert type="success">
                            Injeção enviada com sucesso!
                        </v-alert>
                </v-col>
                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Mês</v-label>
                    <v-select v-model="mesInjecao" :items="meses" label="Mês" hide-details color="primary" required></v-select>
                    </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Ano</v-label>
                    <v-select v-model="anoInjecao" :items="anos" label="Ano" hide-details color="primary"></v-select>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Consumo (kWh)</v-label>
                    <v-text-field v-model="consumoKWHUsina" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Consumo (R$)</v-label>
                    <v-text-field v-model="consumoReaisUsina" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Inj. Ponta (kWh)</v-label>
                    <v-text-field v-model="pontaInjetado" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Inj. FPonta (kWh)</v-label>
                    <v-text-field v-model="pontaFInjetado" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>
                
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="openDialogInjecao2">
            Editar injeções existentes
          </v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="sendInjecao">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-row>

    <!-- LISTAR INJEÇÕES EXISTENTES PARA EDITAR/EXCLUIR -->
    <v-row>
    <v-dialog v-model="dialogInjecao2" width="600" >
        <v-card>
          <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            Injeções Existentes
          </v-card-title>
          <v-card-text>
            <v-table>
                <thead>
                    <tr>
                        <th class="text-center">Mês</th>
                        <th class="text-center">Injetado</th>
                        <th class="text-center">Configurações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="injecao in injecaoUsinaAno" :key="injecao.id" style="height: 50px;">
                        <td class="text-center">{{ injecao.mes }}</td>
                        <td class="text-center">{{ (Number(injecao.injetadoPonta) + Number(injecao.injetadoFPonta)) }}</td>
                        <td class="text-center">
                            <v-btn class="mr-5" @click="openDialogInjecao3(injecao.id)" icon>
                                <v-icon color="primary">mdi-pencil</v-icon>
                            </v-btn>
                            <v-btn @click="deleteInjecao(injecao.id)" icon>
                                    <v-icon color="error">mdi-delete</v-icon>
                            </v-btn>
                        </td>
                    </tr>
                </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-row>

    <!-- EDITAR INJEÇÃO -->
    <v-row justify="center">
    <v-dialog v-model="dialogInjecao3" width="500">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Editar Injeção</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
                <v-col v-if="showErrorCampoInjecao" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertInjecao" cols="12">
                    <v-alert type="success">
                            Injeção editada com sucesso!
                        </v-alert>
                </v-col>
                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Mês</v-label>
                    <v-select disabled v-model="mesInjecao" :items="meses" label="Mês" hide-details color="primary" required></v-select>
                    </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Ano</v-label>
                    <v-select disabled v-model="anoInjecao" :items="anos" label="Ano" hide-details color="primary"></v-select>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Consumo (kWh)</v-label>
                    <v-text-field v-model="consumoKWHUsina" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Consumo (R$)</v-label>
                    <v-text-field v-model="consumoReaisUsina" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Inj. Ponta (kWh)</v-label>
                    <v-text-field v-model="pontaInjetado" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-label class="font-weight-bold mb-1">Inj. FPonta (kWh)</v-label>
                    <v-text-field v-model="pontaFInjetado" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                </v-col>
                
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="editInjecao(injetadoId)">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-row>   

    <br>
    <br>
    <br>
    <br>
    <!-- GRAFICOS GERACAO E INJEÇÃO-->
    <v-row>
        <v-col sm="12" xs="12" md="12" lg="6" xl="6" cols="12">
            <MonthlyEarning :lista="geracoes" :ano="selectedYear"/>
        </v-col> 

        <v-col sm="12" xs="12" md="12" lg="6" xl="6" cols="12">
            <UsinaInjecao :lista="injecoes" :ano="selectedYear"/>
        </v-col> 
    </v-row>

    <!-- TABELA UNIDADES COMPENSADAS-->
    <v-row>
        <v-col cols="12" md="12">
            <v-card elevation="3" class="withbg ">
                <v-card-item class="pa-0">
                    <div class="d-sm-flex justify-space-between align-center">
                        <h5 class="text-h3 pl-7 pt-7">
                            <v-avatar class="bg-lightsecondary text-secondary mb-1" size="30">
                                <BuildingIcon size="21" />
                            </v-avatar>
                             
                            
                            Unidades Compensadas</h5>
                        <!-- <v-btn @click="openDialogNovaUnidade" size="40" icon class="bg-secondary mt-2 ml-5 mr-5">
                            <v-avatar size="30" class="text-white">
                                <PlusIcon size="20" />
                            </v-avatar>
                            <v-tooltip activator="parent" location="bottom">Nova Unidade</v-tooltip>
                        </v-btn> -->
                    </div>
                    <br>
                    <div class="pa-7 pt-1"> 
                        <v-row>
                            <v-col cols="12">
                            <v-table>
                                <thead>
                                <tr>
                                    <th class="text-center">UC</th>
                                    <th class="text-center">Nome</th>
                                    <th class="text-center">Porcentagem</th>
                                    <th class="text-center">2023 </th>
                                    <th class="text-center">2024</th>
                                    <th class="text-center">Ações</th>
                                </tr>
                                </thead>
                                <tbody>
                                    <tr class="text-center" v-for="unidade in unidadesCompensadas " :key="unidade.id">
                                        <td><strong>{{unidade.uc}}</strong></td>
                                        <td>{{unidade.nome}}</td>
                                        <td>
                                            <span v-for="porcento in porcentagens" :key="porcento.id">{{
                                                porcento.idUnidadeCompensa === unidade.id ? porcento.porcentagem : ''
                                            }}</span>%
                                        </td>
                                        <td>{{ getQuantidadeRelatorios(unidade.id, 2023) }}</td>
                                        <td>{{ getQuantidadeRelatorios(unidade.id, 2024) }}</td>
                                        <td>
                                            <v-btn @click="openDialogNovoRelatorio(unidade.id)" size="30" icon class="bg-primary mr-2">
                                                <v-avatar size="30" class="text-white">
                                                    <PlusIcon size="20" />
                                                </v-avatar>
                                                <v-tooltip activator="parent" location="bottom">Novo Relatório</v-tooltip>
                                            </v-btn>

                                            <v-btn @click="openDialogRelatorios(unidade.id)" size="30" icon class="bg-primary mr-2">
                                                <v-avatar size="30" class="text-white">
                                                    <NotesIcon size="18" />
                                                </v-avatar>
                                                <v-tooltip activator="parent" location="bottom">Editar Relatórios</v-tooltip>
                                            </v-btn>

                                            <!-- <v-btn @click="openDialogEditUnidade(unidade.id)" size="30" icon class="bg-secondary mr-2">
                                                <v-avatar size="30" class="text-white">
                                                    <EditIcon size="18" />
                                                </v-avatar>
                                                <v-tooltip activator="parent" location="bottom">Editar Unidade</v-tooltip>
                                            </v-btn>

                                            <v-btn @click="openDialogExcluirUnidade(unidade.id)"  size="30" icon class="bg-error mr-2">
                                                <v-avatar size="30" class="text-white">
                                                    <TrashIcon size="18" />
                                                </v-avatar>
                                                <v-tooltip activator="parent" location="bottom">Excluir Unidade</v-tooltip>
                                            </v-btn> -->

                                        </td>
                                    </tr>

                                </tbody>
                            </v-table>
                            </v-col>
                        </v-row>
                    </div>
                </v-card-item>
            </v-card>
        </v-col>
    </v-row>

    <!-- ADICIONAR NOVA UNIDADE (EXCLUIR) -->
    <v-row justify="center">
    <v-dialog v-model="dialogNovaUnidade" width="1024">
      <v-card>
        <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
          <span class="text-h5">Adicionar - Unidade Compensada</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
                <v-col v-if="showErrorCampoUnidade" cols="12">
                    <v-alert  type="error">
                        Preencha todos os campos!
                    </v-alert>
                </v-col>
                <v-col v-if="showSuccessAlertUnidade" cols="12">
                    <v-alert type="success">
                            Unidade adicionada com sucesso!
                        </v-alert>
                </v-col>

                <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">UC</v-label>
                        <v-text-field v-model="ucUnidade" type="number" variant="outlined" hide-details color="primary" required></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Nome</v-label>
                        <v-text-field v-model="nomeUnidade" variant="outlined" hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="3">
                        <v-label class="font-weight-bold mb-1">Início</v-label>
                        <v-text-field v-model="dataInicioUnidade" variant="outlined" type="date"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="3">
                        <v-label class="font-weight-bold mb-1">Consumo (médio)</v-label>
                        <v-text-field v-model="consumoUnidade" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="3">
                        <v-label class="font-weight-bold mb-1">Valor kWh (R$)</v-label>
                        <v-text-field v-model="kwhUnidade" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="3">
                        <v-label class="font-weight-bold mb-1">Porcentagem (%)</v-label>
                        <v-text-field v-model="porcentoUnidade" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Endereço</v-label>
                        <v-text-field v-model="enderecoUnidade" variant="outlined"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6" >
                        <v-label class="font-weight-bold mb-1">Status</v-label>
                        <v-radio-group v-model="statusUnidade" inline>
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
          <v-btn color="blue-darken-1" variant="text" @click="sendUnidade">
            Enviar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-row>

    <!-- ADICIONAR NOVO RELATÓRIO PARA A UNIDADE -->
    <v-row justify="center">
        <v-dialog v-model="dialogNovoRelatorio" width="1024">
        <v-card>
            <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">Criar Relatório Mensal</span>
            </v-card-title>
            <v-card-text>
            <v-container>
                <v-row>
                    <v-col v-if="showErrorAlertRelatorio" cols="12">
                        <v-alert  type="error">
                            Error ao enviar projeção!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showErrorCampoRelatorio" cols="12">
                        <v-alert  type="error">
                            Preencha todos os campos!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showErrorMesRelatorio" cols="12">
                        <v-alert  type="error">
                            Esse mês/ano já está preenchido!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showSuccessAlertRelatorio" cols="12">
                        <v-alert type="success">
                                Relatório enviado com sucesso!
                            </v-alert>
                    </v-col>
                    <v-col cols="12">
                        <strong>UC:</strong> {{ ucUnidadeRela }}
                        <br>
                        <strong>UNIDADE:</strong> {{ nomeUnidadeRela }}
                    </v-col>
                    <v-divider></v-divider>
                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Mês</v-label>
                        <v-select v-model="mesRelUni" :items="meses" label="Mês" hide-details color="primary" required></v-select>
                        </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Ano</v-label>
                        <v-select v-model="anoRelUni" :items="anos" label="Ano" hide-details color="primary"></v-select>
                    </v-col>

                    <v-col cols="4">
                        <v-label class="font-weight-bold mb-1">Consumo (kWh)</v-label>
                        <v-text-field v-model="consumoUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="4">
                        <v-label class="font-weight-bold mb-1">Consumo (R$)</v-label>
                        <v-text-field v-model="valorConUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="4">
                        <v-label class="font-weight-bold mb-1">Saldo em Energia (kWh - Crédito)</v-label>
                        <v-text-field v-model="saldoEnergiaUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Ener. Inj-TUSD (kWh)</v-label>
                        <v-text-field v-model="enerTusdUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Valor (R$ - TUSD)</v-label>
                        <v-text-field v-model="valorTusdUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Ener. Inj-TE (kWh)</v-label>
                        <v-text-field v-model="enerTeUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Valor (R$ - TE)</v-label>
                        <v-text-field v-model="valorTeUni" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>

                </v-row>
            </v-container>
            </v-card-text>
            <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" variant="text" @click="sendRelatorioUni">
                Salvar
            </v-btn>
            </v-card-actions>
        </v-card>
        </v-dialog>
    </v-row>

    <!-- EDITAR UNIDADE (EXCLUIR) -->
    <v-row justify="center">
        <v-dialog v-model="dialogEditUnidade" width="1024">
        <v-card>
            <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
            <span class="text-h5">Editar - Unidade Compensada</span>
            </v-card-title>
            <v-card-text>
            <v-container>
                <v-row>
                    <v-col v-if="showErrorAlertUnidadeEdit" cols="12">
                        <v-alert  type="error">
                            Erro em editar unidade!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showErrorCampoUnidadeEdit" cols="12">
                        <v-alert  type="error">
                            Preencha todos os campos!
                        </v-alert>
                    </v-col>
                    <v-col v-if="showSuccessAlertUnidadeEdit" cols="12">
                        <v-alert type="success">
                                Unidade editada com sucesso!
                            </v-alert>
                    </v-col>

                    <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">UC</v-label>
                            <v-text-field v-model="ucUnidadeEdit" type="number" variant="outlined" hide-details color="primary" required></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Nome</v-label>
                            <v-text-field v-model="nomeUnidadeEdit" variant="outlined" hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="3">
                            <v-label class="font-weight-bold mb-1">Início</v-label>
                            <v-text-field v-model="dataInicioUnidadeEdit" variant="outlined" type="date"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="3">
                            <v-label class="font-weight-bold mb-1">Consumo (médio)</v-label>
                            <v-text-field v-model="consumoUnidadeEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="3">
                            <v-label class="font-weight-bold mb-1">Valor kWh (R$)</v-label>
                            <v-text-field v-model="kwhUnidadeEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Endereço</v-label>
                            <v-text-field v-model="enderecoUnidadeEdit" variant="outlined"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6" >
                            <v-label class="font-weight-bold mb-1">Status</v-label>
                            <v-radio-group v-model="statusUnidadeEdit" inline>
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
            <v-btn color="blue-darken-1" variant="text" @click="editUnidade">
                Editar
            </v-btn>
            </v-card-actions>
        </v-card>
        </v-dialog>
    </v-row>

    <!-- EXCLUIR UNIDADE (EXCLUIR) -->
    <div class="text-center">
        <v-dialog v-model="dialogExcluirUnidade"  width="auto">
            <v-card>
                <v-card-text v-if="showSuccessAlertUnidadeExcluida">
                   <v-alert type="success" title="Exclusão" text="Unidade excluída com sucesso!"></v-alert> 
                </v-card-text>

                <v-col v-if="showErrorAlertUnidadeExcluida" cols="12">
                    <v-alert  type="error">
                        Erro ao excluir unidade!
                    </v-alert>
                </v-col>
                
                <v-card-text v-if="!showSuccessAlertUnidadeExcluida">
                    <v-col cols="12">
                        Você tem certeza que deseja a unidade compensada?
                    </v-col>
                    <v-divider></v-divider>
                    <v-col>
                        <strong>UC: </strong> {{ ucUnidadeExcluir }}
                        <br>
                        <strong>NOME: </strong> {{ nomeUnidadeExcluir }}
                    </v-col>
                </v-card-text>
                <v-card-actions v-if="!showSuccessAlertUnidadeExcluida">
                        <v-btn color="error" block @click="deleteUnidade">Excluir</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>

    <!-- LISTAR RELATÓRIOS DA UNIDADE -->
    <v-row justify="center">
        <v-dialog v-model="dialogRelatorios" width="1024">
            <v-card>
                <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
                    <span class="text-h5">Lista de relatórios</span>
                </v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col cols="6">
                            <strong>UC: </strong> {{ ucUnidadeRelatorio }}
                        </v-col>
                        <v-col cols="6">
                            <strong>Unidade: </strong> {{ nomeUnidadeRelatorio }}
                        </v-col>
                    </v-row>
                    <v-container>
                    <v-table>
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Ano</th>
                            <th>Mês</th>
                            <th>Configurações</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="relatorio in relatoriosUnidade" :key="relatorio.id">
                            <td>{{ relatorio.id }}</td>
                            <td>{{ relatorio.ano }}</td>
                            <td>{{ relatorio.mes }}</td>
                            <td>
                            <v-btn class="mr-5" @click="openDialogRelatoriosEditar(relatorio.id)" icon>
                                <v-icon color="primary">mdi-pencil</v-icon>
                            </v-btn>
                            <v-btn @click="deleteRelatorio(relatorio.id)" icon>
                                <v-icon color="error">mdi-delete</v-icon>
                            </v-btn>
                        </td>
                    </tr>
                    </tbody>
                </v-table>
                </v-container>
                </v-card-text>
            </v-card>
        </v-dialog>
    </v-row>

    <!-- EDITANDO RELATORIO DA UNIDADE -->
    <v-row justify="center">
        <v-dialog v-model="dialogRelatoriosEditar" width="1024">
            <v-card>
            <v-card-title style="background: linear-gradient(to bottom, #4d7fff, #1e73be); color: white;">
                <span class="text-h5">Editando Relatório</span>
            </v-card-title>
                <v-card-text>
                    <v-container>
                        <v-row>
                            <strong>ID: </strong> {{ idRelaEdit }}
                            <br><br>
                            <v-divider></v-divider>
                            <br>
                        </v-row>
                        <v-row>
                        <v-col v-if="showErrorAlertEdit" cols="12">
                            <v-alert  type="error">
                                Erro em editar relatório!
                            </v-alert>
                        </v-col>
                        <v-col v-if="showErrorCampoEdit" cols="12">
                            <v-alert  type="error">
                                Preencha todos os campos!
                            </v-alert>
                        </v-col>
                        <v-col v-if="showSuccessAlertEdit" cols="12">
                            <v-alert type="success">
                                    Relatório editado com sucesso!
                            </v-alert>
                        </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Mês</v-label>
                            <v-select v-model="mesRelUniEdit" :items="meses" label="Mês" hide-details color="primary" disabled></v-select>
                            </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ano</v-label>
                            <v-select v-model="anoRelUniEdit" :items="anos" label="Ano" hide-details color="primary" disabled></v-select>
                        </v-col>

                        <v-col cols="4">
                            <v-label class="font-weight-bold mb-1">Consumo (kWh)</v-label>
                            <v-text-field v-model="consumoUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="4">
                            <v-label class="font-weight-bold mb-1">Consumo (R$)</v-label>
                            <v-text-field v-model="valorConUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="4">
                            <v-label class="font-weight-bold mb-1">Saldo em Energia (kWh - Crédito)</v-label>
                            <v-text-field v-model="saldoEnergiaEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ener. Inj-TUSD (kWh)</v-label>
                            <v-text-field v-model="enerTusdUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Valor (R$ - TUSD)</v-label>
                            <v-text-field v-model="valorTusdUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Ener. Inj-TE (kWh)</v-label>
                            <v-text-field v-model="enerTeUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>

                        <v-col cols="6">
                            <v-label class="font-weight-bold mb-1">Valor (R$ - TE)</v-label>
                            <v-text-field v-model="valorTeUniEdit" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                        </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                            <v-btn color="primary" block @click="saveChangesRelatorio(idRelaEdit)">Editar</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-row>

</template>

<style scoped>
.table-wrapper {
    overflow-x: auto;
    scrollbar-width: thin; /* Para navegadores compatíveis */
    scrollbar-color: #888 transparent; /* Cor da barra de rolagem e cor de fundo */
  }

  /* Estilizando o indicador da barra de rolagem */
  .table-wrapper::-webkit-scrollbar {
    width: 8px; /* Largura da barra de rolagem */
  }

  /* Estilizando a alça da barra de rolagem */
  .table-wrapper::-webkit-scrollbar-thumb {
    background-color: #888; /* Cor da alça da barra de rolagem */
    border-radius: 4px; /* Bordas arredondadas */
  }

</style>