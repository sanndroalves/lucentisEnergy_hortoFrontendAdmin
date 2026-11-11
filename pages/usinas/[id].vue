<script setup >
    import { useHead  } from '@vueuse/head';
    import { API_BASE_URL } from '~/base/link';

    const { data } = useAuth()
 

    // Defina o título da página
useHead ({
    title: 'Usina Informações'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

    import { ref, computed } from 'vue';
    import { useRoute } from 'vue-router';
    import { useEnergyFormat } from '~/composables/useEnergyFormat';

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
    const selectedYear = ref(String(new Date().getFullYear()));

    // Antes: "toggleYear" girava entre 2023-2026 e a página abria sem dados
    // até o primeiro clique. Agora carrega o ano escolhido (e o ano vigente
    // ao abrir a página).
    const carregarAno = async (ano) => {
        selectedYear.value = String(ano);

        const { data: proDetalhe } = await useFetch(`${API_BASE_URL}/projecaogeracao?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        const { data: geraDetalhe } = await useFetch(`${API_BASE_URL}/relatoriogeracao?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        proDetalheAno.value = proDetalhe.value ?? [];
        gerDetalheAno.value = geraDetalhe.value ?? [];
        gerDetalheAno.value.sort((a, b) => {
            // Se quiser considerar também o ano, use:
            const anoA = a.ano;
            const anoB = b.ano;
            const mesA = a.mes;
            const mesB = b.mes;

            if (anoA !== anoB) {
                return anoA - anoB;
            }
            return mesA - mesB;
        });
        
        geracoes.value = []

        for (let i=0; i<gerDetalheAno.value.length; i++){
            geracoes.value.push(gerDetalheAno.value[i].geracao)
        }

        /* PEGANDO AS INJEÇÕES */ 
        const { data: injecaoUsina } = await useFetch(`${API_BASE_URL}/relatoriousina?idGeradora=${route.params.id}&ano=${selectedYear.value}`);
        injecaoUsinaAno.value = injecaoUsina.value ?? [];

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
    const anos = [2028, 2027, 2026, 2025, 2024, 2023];

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

      // atualiza tabela/gráfico do ano exibido
      if (showSuccessAlertProjecao.value) await carregarAno(selectedYear.value);
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
        descricaoManutencao.value = null
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
    const descricaoManutencao = ref("")
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
                    descricao: descricaoManutencao.value,
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
    // id: 'OSPDF' (OS recém-programada) ou 'OSPDF2' (OS de uma manutenção da lista).
    // Antes os dois diálogos usavam o mesmo id e podia sair a OS errada.
    const baixarPDF = (id = 'OSPDF') => {
        // Referência para os elementos
        const tituloElement = document.getElementById(id);
        
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
    const descricaoManutencaoEdit = ref()
    const verOrdem = (idManutencao) =>{
        const manuSelecionada = manutencoes.value.filter((item) => item.id === idManutencao)
        dataPDFEdit.value = manuSelecionada[0].data
        empresaPDFEdit.value = manuSelecionada[0].empresa
        descricaoManutencaoEdit.value = manuSelecionada[0].descricao

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

    // ═══════════ Visão do ano (layout novo) ═══════════
    // Antes as tabelas eram montadas pela posição no array (se faltasse um
    // mês, os valores "andavam" de coluna). Agora tudo é indexado pelo mês.
    const { numero } = useEnergyFormat()
    const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const MESES_LONGO = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const ANOS_SEL = [2023, 2024, 2025, 2026, 2027, 2028]
    const anoSel = computed(() => Number(selectedYear.value))
    const num = (v) => Number(v) || 0

    const porMes = (lista, fn) => {
        const a = Array(12).fill(null)
        ;(Array.isArray(lista) ? lista : []).forEach(r => {
            const m = Number(r.mes)
            if (Number(r.ano) === anoSel.value && m >= 1 && m <= 12) a[m - 1] = (a[m - 1] ?? 0) + fn(r)
        })
        return a
    }
    const projMes = computed(() => porMes(proDetalheAno.value, r => num(r.projecao)))
    const realMes = computed(() => porMes(gerDetalheAno.value, r => num(r.geracao)))
    const injMes  = computed(() => porMes(injecaoUsinaAno.value, r => num(r.injetadoPonta) + num(r.injetadoFPonta)))

    // listas do ano exibido (diálogos "editar lançamentos")
    const doAno = (lista) => (Array.isArray(lista) ? lista : []).filter(r => Number(r.ano) === anoSel.value).sort((a, b) => a.mes - b.mes)
    const projAnoLista = computed(() => doAno(proDetalheAno.value))
    const realAnoLista = computed(() => doAno(gerDetalheAno.value))
    const injAnoLista  = computed(() => doAno(injecaoUsinaAno.value))

    const mesesAno = computed(() => MESES_CURTO.map((m, i) => {
        const p = projMes.value[i], r = realMes.value[i], inj = injMes.value[i]
        const efic = p > 0 && r != null ? (r / p) * 100 : null
        const auto = r != null && inj != null ? r - inj : null
        const ant = i > 0 ? injMes.value[i - 1] : null
        let tend = null
        if (inj != null) tend = inj === 0 ? 'zero' : ant == null ? 'igual' : inj > ant ? 'sobe' : inj < ant ? 'desce' : 'igual'
        return { i, m, p, r, inj, efic, auto, tend, abaixo: p > 0 && r != null && r < p }
    }))
    const resumoAno = computed(() => {
        const ms = mesesAno.value
        const comReal = ms.filter(x => x.r != null)
        const realTot = comReal.reduce((s, x) => s + x.r, 0)
        const projComDado = comReal.reduce((s, x) => s + (x.p ?? 0), 0)
        return {
            realTot,
            projTot: ms.reduce((s, x) => s + (x.p ?? 0), 0),
            projComDado,
            efic: projComDado > 0 ? (realTot / projComDado) * 100 : null,
            injTot: ms.reduce((s, x) => s + (x.inj ?? 0), 0),
            autoTot: ms.reduce((s, x) => s + (x.auto ?? 0), 0),
            nReal: comReal.length,
            abaixo: ms.filter(x => x.abaixo).length,
            maxGer: Math.max(1, ...ms.map(x => Math.max(x.p ?? 0, x.r ?? 0))),
            maxInj: Math.max(1, ...ms.map(x => Math.max(x.inj ?? 0, x.auto ?? 0))),
        }
    })
    const alt = (v, max) => `${max > 0 && v ? Math.max(2, (v / max) * 100) : 0}%`
    const kwh = (v) => (v == null ? '—' : `${numero(v)} kWh`)
    const mwhTxt = (v) => `${numero((v || 0) / 1000, (v || 0) >= 100000 ? 0 : 1)} MWh`
    const pctTxt = (v) => (v == null || !isFinite(v) ? '—' : `${numero(v, 1)}%`)
    const corEfic = (p) => (p == null ? 'var(--mut)' : p >= 90 ? 'var(--green)' : p >= 70 ? 'var(--orange)' : 'var(--red)')
    const tipLado = (i) => (i < 2 ? 'l' : i > 9 ? 'r' : '')
    const TEND = {
        sobe:  { s: '▲', c: 'var(--green)',  t: 'Subiu em relação ao mês anterior' },
        desce: { s: '▼', c: 'var(--red)',    t: 'Caiu em relação ao mês anterior' },
        zero:  { s: '✕', c: 'var(--red)',    t: 'Sem injeção no mês' },
        igual: { s: '=', c: 'var(--teal)',   t: 'Igual ao mês anterior' },
    }

    // alerta de geração (substitui o AlertManutencao, que era alterado durante a renderização)
    const AlertManutencao = computed(() => resumoAno.value.abaixo > 0)

    // ─── Cabeçalho / dados da usina ───
    const STATUS_USINA = { L: { txt: 'Ligada', c: 'var(--green)' }, D: { txt: 'Desligada', c: 'var(--red)' }, M: { txt: 'Manutenção', c: 'var(--orange)' } }
    const statusUsinaInfo = computed(() => STATUS_USINA[usinaDetalhe.value?.status] ?? { txt: 'Desconhecido', c: 'var(--mut)' })
    const dataBR = (d) => {
        if (!d) return '—'
        const dt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d)
        return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR')
    }

    // ─── Manutenções ───
    const STATUS_MANU = { '1': 'var(--teal)', '2': 'var(--orange)', '3': 'var(--green)' }
    const ultimaManu = computed(() => (ultima.value?.length ? ultima.value[ultima.value.length - 1] : null))
    const diasProxima = computed(() => (programada.value?.length ? calcularDiasRestantes(programada.value[0].data) : null))

    await carregarAno(selectedYear.value)
</script>
<template>
  <div class="lx-page">
    <!-- ══════════ Cabeçalho ══════════ -->
    <header class="lx-head">
      <div>
        <nav class="lx-crumb" aria-label="Você está em">
          <NuxtLink to="/">Início</NuxtLink><span class="sep">›</span>
          <NuxtLink to="/usinas/">Usinas</NuxtLink><span class="sep">›</span>
          <b>{{ usinaDetalhe.nome }}</b>
        </nav>
        <h1 class="lx-title">{{ usinaDetalhe.nome }}</h1>
        <div class="ud-tags">
          <span class="lx-pill" :style="{ '--c': statusUsinaInfo.c }"><i></i>{{ statusUsinaInfo.txt }}</span>
          <span class="lx-pill" style="--c:var(--teal)">UC <span class="lx-mono">{{ usinaDetalhe.uc }}</span></span>
          <span v-if="usinaDetalhe.tensao" class="lx-pill" style="--c:var(--purple)">{{ usinaDetalhe.tensao }}</span>
          <span v-if="usinaDetalhe.endereco" class="ud-end">{{ usinaDetalhe.endereco }}</span>
        </div>
      </div>
      <div class="lx-head-actions">
        <NuxtLink to="/usinas/" class="lx-btn-ghost">← Voltar</NuxtLink>
        <button class="lx-btn-ghost danger" @click="openDialogExcluir">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Excluir usina
        </button>
      </div>
    </header>

    <div v-if="AlertManutencao" class="lx-alert warn">
      Geração abaixo da projeção em {{ resumoAno.abaixo }} {{ resumoAno.abaixo === 1 ? 'mês' : 'meses' }} de {{ selectedYear }}. Talvez seja melhor adiantar a próxima manutenção programada.
    </div>

    <!-- ══════════ KPIs ══════════ -->
    <section class="lx-kpis">
      <div class="lx-kpi" style="--c:var(--orange)"><span class="ico">☀</span><span>Potência instalada</span><b>{{ numero(Number(usinaDetalhe.potencia) || 0, 2) }} <small>kWp</small></b><small>em operação desde {{ dataBR(usinaDetalhe.dataInicio) }}</small></div>
      <div class="lx-kpi" style="--c:var(--teal)"><span class="ico">⚡</span><span>Geração real em {{ selectedYear }}</span><b>{{ mwhTxt(resumoAno.realTot) }}</b><small>{{ resumoAno.nReal }} {{ resumoAno.nReal === 1 ? 'mês' : 'meses' }} com dado</small></div>
      <div class="lx-kpi" :style="{ '--c': corEfic(resumoAno.efic) }"><span class="ico">◎</span><span>Eficiência em {{ selectedYear }}</span><b>{{ pctTxt(resumoAno.efic) }}</b><small>real ÷ projetado (meses com dado)</small></div>
      <div class="lx-kpi" style="--c:var(--purple)"><span class="ico">⇄</span><span>Injetado na rede</span><b>{{ mwhTxt(resumoAno.injTot) }}</b><small>autoconsumo {{ mwhTxt(resumoAno.autoTot) }}</small></div>
    </section>

    <!-- ══════════ Dados + Manutenções ══════════ -->
    <section class="lx-grid g2 lx-mb">
      <div class="lx-panel accent" style="--c:var(--orange)">
        <div class="lx-panel-hd"><h3><span class="lx-ic" style="--c:var(--orange)">☀</span>Dados da usina</h3></div>
        <div class="lx-dl">
          <div><span>Nome</span><b>{{ usinaDetalhe.nome }}</b></div>
          <div><span>UC</span><b class="lx-mono">{{ usinaDetalhe.uc }}</b></div>
          <div><span>Endereço</span><b>{{ usinaDetalhe.endereco || '—' }}</b></div>
          <div><span>Data de início</span><b>{{ dataBR(usinaDetalhe.dataInicio) }}</b></div>
          <div><span>Potência</span><b>{{ numero(Number(usinaDetalhe.potencia) || 0, 2) }} kWp</b></div>
          <div><span>Tensão</span><b>{{ usinaDetalhe.tensao || '—' }}</b></div>
        </div>
      </div>

      <div class="lx-panel accent" style="--c:var(--purple)">
        <div class="lx-panel-hd">
          <h3><span class="lx-ic" style="--c:var(--purple)">⚙</span>Manutenções</h3>
          <div class="lx-head-actions">
            <button class="lx-btn-ghost sm" @click="verManutencoes">Ver todas ({{ manutencoes?.length ?? 0 }})</button>
            <button class="lx-btn sm" style="--c1:var(--purple);--c2:var(--teal)" @click="programarManutencao">+ Programar</button>
          </div>
        </div>
        <div class="ud-manu">
          <div class="ud-manu-box" style="--c:var(--green)">
            <span>Última realizada</span>
            <b>{{ ultimaManu ? formatarData(ultimaManu.data) : 'Nenhuma' }}</b>
            <small v-if="ultimaManu">próxima prevista em {{ calcularDataPrevista(ultimaManu.data) }}</small>
          </div>
          <div class="ud-manu-box" :style="{ '--c': diasProxima != null && diasProxima < 0 ? 'var(--red)' : 'var(--teal)' }">
            <span>Programada</span>
            <b v-if="programada?.length">{{ formatarData(programada[0].data) }}</b>
            <b v-else>Nenhuma</b>
            <small v-if="diasProxima != null">{{ diasProxima >= 0 ? `faltam ${diasProxima} dias` : `atrasada há ${Math.abs(diasProxima)} dias` }}</small>
            <small v-if="programada?.length > 1">+{{ programada.length - 1 }} outra(s) programada(s)</small>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ Geração ══════════ -->
    <section class="lx-panel lx-mb">
      <div class="lx-panel-hd">
        <div>
          <h3><span class="lx-ic" style="--c:var(--teal)">⚡</span>Geração projetada × real em {{ selectedYear }}</h3>
          <p>Passe o mouse sobre as barras para ver os valores de cada mês</p>
        </div>
        <div class="lx-head-actions">
          <div class="lx-anos" style="--c:var(--teal)" role="group" aria-label="Ano">
            <button v-for="a in ANOS_SEL" :key="a" class="lx-ano" :class="{ on: anoSel === a }" @click="carregarAno(a)">{{ a }}</button>
          </div>
          <button class="lx-btn-ghost sm" @click="dialogGeraConfig2 = true">Editar lançamentos</button>
          <button class="lx-btn sm" @click="openDialogProjecao">+ Lançar geração</button>
        </div>
      </div>

      <div class="lx-leg ud-leg"><span><i style="border:1px dashed var(--orange)"></i>Projetada</span><span><i style="background:var(--green)"></i>Real ≥ 90%</span><span><i style="background:var(--orange)"></i>70–90%</span><span><i style="background:var(--red)"></i>&lt; 70%</span></div>
      <div class="lx-bc">
        <div v-for="x in mesesAno" :key="x.i" class="lx-bcol" tabindex="0">
          <span class="lx-bv">{{ x.r != null ? numero(x.r / 1000, 1) : '' }}</span>
          <div class="lx-bbars">
            <i class="lx-b-proj" :style="{ height: alt(x.p, resumoAno.maxGer) }"></i>
            <i class="lx-b-real" :style="{ height: alt(x.r, resumoAno.maxGer), background: x.efic != null ? corEfic(x.efic) : 'var(--teal)' }"></i>
          </div>
          <span class="lx-bl">{{ x.m }}</span>
          <div class="lx-btip" :class="tipLado(x.i)">
            <strong>{{ MESES_LONGO[x.i] }}/{{ selectedYear }}</strong>
            <div><span>Projetada</span><b>{{ kwh(x.p) }}</b></div>
            <div><span>Real</span><b>{{ kwh(x.r) }}</b></div>
            <div><span>Eficiência</span><b :style="{ color: corEfic(x.efic) }">{{ pctTxt(x.efic) }}</b></div>
          </div>
        </div>
      </div>
      <p class="ud-nota">Valores acima das barras em MWh.</p>

      <div class="lx-tbl-wrap">
        <table class="lx-tbl ud-mtbl">
          <thead><tr><th>kWh</th><th v-for="m in MESES_CURTO" :key="m" class="r">{{ m }}</th><th class="r">Total</th></tr></thead>
          <tbody>
            <tr><td>Projetada</td><td v-for="x in mesesAno" :key="x.i" class="r">{{ x.p != null ? numero(x.p) : '—' }}</td><td class="r"><b>{{ numero(resumoAno.projTot) }}</b></td></tr>
            <tr><td>Real</td><td v-for="x in mesesAno" :key="x.i" class="r">{{ x.r != null ? numero(x.r) : '—' }}</td><td class="r"><b>{{ numero(resumoAno.realTot) }}</b></td></tr>
            <tr>
              <td>Análise</td>
              <td v-for="x in mesesAno" :key="x.i" class="r">
                <span v-if="x.efic != null" class="lx-pill" :style="{ '--c': x.abaixo ? 'var(--red)' : 'var(--green)' }" :title="pctTxt(x.efic)">{{ x.abaixo ? 'Abaixo' : 'Ok' }}</span>
                <span v-else class="ud-mut">—</span>
              </td>
              <td class="r"><span class="lx-pill" :style="{ '--c': corEfic(resumoAno.efic) }">{{ pctTxt(resumoAno.efic) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ══════════ Injeção ══════════ -->
    <section class="lx-panel lx-mb">
      <div class="lx-panel-hd">
        <div>
          <h3><span class="lx-ic" style="--c:var(--purple)">⇄</span>Injeção na rede e autoconsumo em {{ selectedYear }}</h3>
          <p>Autoconsumo = geração real − energia injetada</p>
        </div>
        <div class="lx-head-actions">
          <button class="lx-btn-ghost sm" @click="openDialogInjecao2">Editar injeções</button>
          <button class="lx-btn sm" style="--c1:var(--purple);--c2:var(--teal)" @click="openDialogInjecao">+ Lançar injeção</button>
        </div>
      </div>

      <div class="lx-leg ud-leg"><span><i style="background:var(--purple)"></i>Injetado</span><span><i style="background:var(--teal)"></i>Autoconsumo</span></div>
      <div class="lx-bc">
        <div v-for="x in mesesAno" :key="x.i" class="lx-bcol" tabindex="0">
          <span class="lx-bv">{{ x.inj != null ? numero(x.inj / 1000, 1) : '' }}</span>
          <div class="lx-bbars">
            <i class="lx-b-real" :style="{ height: alt(x.inj, resumoAno.maxInj), background: 'var(--purple)' }"></i>
            <i class="lx-b-real" :style="{ height: alt(x.auto > 0 ? x.auto : 0, resumoAno.maxInj), background: 'var(--teal)' }"></i>
          </div>
          <span class="lx-bl">{{ x.m }}</span>
          <div class="lx-btip" :class="tipLado(x.i)">
            <strong>{{ MESES_LONGO[x.i] }}/{{ selectedYear }}</strong>
            <div><span>Injetado</span><b>{{ kwh(x.inj) }}</b></div>
            <div><span>Autoconsumo</span><b>{{ kwh(x.auto) }}</b></div>
            <div v-if="x.tend"><span>Tendência</span><b :style="{ color: TEND[x.tend].c }">{{ TEND[x.tend].s }} {{ TEND[x.tend].t }}</b></div>
          </div>
        </div>
      </div>
      <p class="ud-nota">Valores acima das barras em MWh.</p>

      <div class="lx-tbl-wrap">
        <table class="lx-tbl ud-mtbl">
          <thead><tr><th>kWh</th><th v-for="m in MESES_CURTO" :key="m" class="r">{{ m }}</th><th class="r">Total</th></tr></thead>
          <tbody>
            <tr><td>Autoconsumo</td><td v-for="x in mesesAno" :key="x.i" class="r">{{ x.auto != null ? numero(x.auto) : '—' }}</td><td class="r"><b>{{ numero(resumoAno.autoTot) }}</b></td></tr>
            <tr><td>Injetado</td><td v-for="x in mesesAno" :key="x.i" class="r">{{ x.inj != null ? numero(x.inj) : '—' }}</td><td class="r"><b>{{ numero(resumoAno.injTot) }}</b></td></tr>
            <tr>
              <td>Tendência</td>
              <td v-for="x in mesesAno" :key="x.i" class="r">
                <span v-if="x.tend" class="ud-tend" :style="{ color: TEND[x.tend].c }" :title="TEND[x.tend].t">{{ TEND[x.tend].s }}</span>
                <span v-else class="ud-mut">—</span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!resumoAno.nReal" class="ud-nota">Para calcular o autoconsumo é preciso ter a geração real do mês lançada.</p>
    </section>

    <!-- ═════════════════════ DIÁLOGOS ═════════════════════ -->

    <!-- Excluir usina -->
    <LxDialog v-model="dialogExcluir" titulo="Excluir usina" :subtitulo="usinaDetalhe.nome" icone="!" cor="var(--red)" :largura="440" persistente>
      <div v-if="showSuccessAlertUsina" class="lx-alert ok">Usina excluída com sucesso.</div>
      <p v-else class="ud-txt">Tem certeza de que deseja excluir esta usina? Essa ação não pode ser desfeita.</p>
      <template #rodape>
        <template v-if="!showSuccessAlertUsina">
          <button class="lx-btn-ghost" @click="dialogExcluir = false">Cancelar</button>
          <button class="lx-btn danger" @click="excluirUsina">Excluir</button>
        </template>
        <button v-else class="lx-btn" @click="navigateTo('/usinas/')">Voltar para usinas</button>
      </template>
    </LxDialog>

    <!-- Programar manutenção -->
    <LxDialog v-model="dialogProgramarManutencao" titulo="Programar manutenção" :subtitulo="usinaDetalhe.nome" icone="⚙" cor="var(--purple)" :largura="520">
      <div v-if="showErrorCampoManu" class="lx-alert err">Preencha todos os campos.</div>
      <div v-if="showSuccessAlertManu" class="lx-alert ok">Manutenção programada com sucesso.</div>
      <div class="lx-form">
        <div class="lx-field"><label for="mn-data">Data da manutenção</label><input id="mn-data" v-model="dataManutencao" type="date" class="lx-input"></div>
        <div class="lx-field"><label for="mn-emp">Empresa responsável</label><input id="mn-emp" v-model="empresaResponsavel" class="lx-input"></div>
        <div class="lx-field full"><label for="mn-desc">Descrição</label><textarea id="mn-desc" v-model="descricaoManutencao" rows="3" class="lx-input"></textarea></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogProgramarManutencao = false">Cancelar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="sendManutencao">Programar</button>
      </template>
    </LxDialog>

    <!-- OS da manutenção recém-programada -->
    <LxDialog v-model="dialogManuCriada" titulo="Manutenção programada" subtitulo="Ordem de serviço pronta para download" icone="✓" cor="var(--green)" :largura="900">
      <div class="ud-paper-wrap">
        <div id="OSPDF" class="ud-paper">
          <div class="ud-os-logos"><img src="/images/logo_lucentis.png" alt="" width="70"><img src="/images/logo_peehorto.png" alt="" width="150"></div>
          <h2>ORDEM DE SERVIÇO</h2>
          <p class="ud-os-sub">Secretaria de Obras<br>Departamento de Iluminação Pública</p>
          <table class="ud-os"><tbody>
            <tr><th colspan="3" class="hd">INFORMAÇÕES</th></tr>
            <tr><th>UNIDADE</th><th colspan="2">DESCRIÇÃO</th></tr>
            <tr><td>{{ usinaDetalhe.uc }}</td><td colspan="2">{{ usinaDetalhe.nome }}</td></tr>
            <tr><th colspan="3">ENDEREÇO</th></tr>
            <tr><td colspan="3">{{ usinaDetalhe.endereco }}</td></tr>
            <tr><th>DATA</th><th>SOLICITAÇÃO</th><th>EMPRESA RESPONSÁVEL</th></tr>
            <tr><td>{{ dataManutencao ? formatarData(dataManutencao) : '' }}</td><td>Manutenção em Usina Fotovoltaica.</td><td>{{ empresaResponsavel }}</td></tr>
            <tr><th colspan="3">DESCRIÇÃO</th></tr>
            <tr><td colspan="3">{{ descricaoManutencao }}</td></tr>
          </tbody></table>
          <div class="ud-os-ft"><span>www.admin.peehorto.com</span><span>{{ new Date().toLocaleDateString('pt-BR') }}</span></div>
        </div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogManuCriada = false">Fechar</button>
        <button class="lx-btn danger" @click="baixarPDF('OSPDF')">Baixar PDF</button>
      </template>
    </LxDialog>

    <!-- Lista de manutenções -->
    <LxDialog v-model="dialogVerManutencoes" titulo="Manutenções" :subtitulo="usinaDetalhe.nome" icone="⚙" cor="var(--purple)" :largura="820">
      <div class="lx-tbl-wrap">
        <table class="lx-tbl">
          <thead><tr><th>ID</th><th>Data</th><th>Empresa</th><th class="c">Status</th><th class="c">Ações</th></tr></thead>
          <tbody>
            <tr v-for="manutencao in manutencoes" :key="manutencao.id">
              <td class="lx-mono">{{ manutencao.id }}</td>
              <td>{{ formatarData(manutencao.data) }}</td>
              <td>{{ manutencao.empresa }}</td>
              <td class="c"><span class="lx-pill" :style="{ '--c': STATUS_MANU[manutencao.status] ?? 'var(--mut)' }"><i></i>{{ getStatusLabel(manutencao.status) }}</span></td>
              <td class="c">
                <div class="ud-acts">
                  <button class="lx-icon-btn" style="--c:var(--red)" title="Ordem de serviço (PDF)" aria-label="Ordem de serviço" @click="verOrdem(manutencao.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </button>
                  <button class="lx-icon-btn" style="--c:var(--purple)" title="Alterar status" aria-label="Alterar status" @click="abrirDialog(manutencao.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="lx-icon-btn" style="--c:var(--red)" title="Excluir" aria-label="Excluir manutenção" @click="deleteManutencao(manutencao.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!manutencoes?.length" class="lx-empty">Nenhuma manutenção encontrada.</p>
      </div>
      <template #rodape>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="programarManutencao">+ Programar manutenção</button>
      </template>
    </LxDialog>

    <!-- OS de uma manutenção da lista -->
    <LxDialog v-model="dialogManuEditPDF" titulo="Ordem de serviço" :subtitulo="usinaDetalhe.nome" icone="⎙" cor="var(--red)" :largura="900">
      <div class="ud-paper-wrap">
        <div id="OSPDF2" class="ud-paper">
          <div class="ud-os-logos"><img src="/images/logo_lucentis.png" alt="" width="70"><img src="/images/logo_peehorto.png" alt="" width="150"></div>
          <h2>ORDEM DE SERVIÇO</h2>
          <p class="ud-os-sub">Secretaria de Obras<br>Departamento de Iluminação Pública</p>
          <table class="ud-os"><tbody>
            <tr><th colspan="3" class="hd">INFORMAÇÕES</th></tr>
            <tr><th>UNIDADE</th><th colspan="2">DESCRIÇÃO</th></tr>
            <tr><td>{{ usinaDetalhe.uc }}</td><td colspan="2">{{ usinaDetalhe.nome }}</td></tr>
            <tr><th colspan="3">ENDEREÇO</th></tr>
            <tr><td colspan="3">{{ usinaDetalhe.endereco }}</td></tr>
            <tr><th>DATA</th><th>SOLICITAÇÃO</th><th>EMPRESA RESPONSÁVEL</th></tr>
            <tr><td>{{ dataPDFEdit ? formatarData(dataPDFEdit) : '' }}</td><td>Manutenção em Usina Fotovoltaica.</td><td>{{ empresaPDFEdit }}</td></tr>
            <tr><th colspan="3">DESCRIÇÃO</th></tr>
            <tr><td colspan="3">{{ descricaoManutencaoEdit }}</td></tr>
          </tbody></table>
          <div class="ud-os-ft"><span>www.admin.peehorto.com</span><span>{{ new Date().toLocaleDateString('pt-BR') }}</span></div>
        </div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogManuEditPDF = false">Fechar</button>
        <button class="lx-btn danger" @click="baixarPDF('OSPDF2')">Baixar PDF</button>
      </template>
    </LxDialog>

    <!-- Alterar status da manutenção -->
    <LxDialog v-model="dialogVisible" titulo="Alterar status da manutenção" icone="✎" cor="var(--purple)" :largura="460">
      <div v-if="showErrorCampoManuEdit" class="lx-alert err">Selecione um status.</div>
      <div v-if="showSuccessAlertManuEdit" class="lx-alert ok">Manutenção editada com sucesso.</div>
      <div class="lx-field">
        <label>Status</label>
        <div class="lx-seg" role="radiogroup" aria-label="Status da manutenção">
          <button v-for="s in statusOptions" :key="s" role="radio" :aria-checked="statusIndi === s" :class="{ on: statusIndi === s }" :style="{ '--c': STATUS_MANU[s] }" @click="statusIndi = s">{{ getStatusLabel(s) }}</button>
        </div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogVisible = false">Fechar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="editarManutencao(manuRefId)">Salvar</button>
      </template>
    </LxDialog>

    <!-- Lançar geração (projetada ou real) -->
    <LxDialog v-model="dialogGeraConfig1" titulo="Lançar geração" subtitulo="Projetada ou real, em kWh" icone="⚡" cor="var(--teal)" :largura="560">
      <div v-if="showErrorCampoProjecao" class="lx-alert err">Preencha todos os campos.</div>
      <div v-if="showErrorMesProjecao" class="lx-alert err">Esse mês/ano já está preenchido.</div>
      <div v-if="showSuccessAlertProjecao" class="lx-alert ok">Geração enviada com sucesso.</div>
      <div class="lx-form">
        <div class="lx-field full">
          <label>Tipo</label>
          <div class="lx-seg" role="radiogroup" aria-label="Tipo de geração">
            <button role="radio" :aria-checked="tipoGeracao === 'P'" :class="{ on: tipoGeracao === 'P' }" style="--c:var(--orange)" @click="tipoGeracao = 'P'">Projetada</button>
            <button role="radio" :aria-checked="tipoGeracao === 'R'" :class="{ on: tipoGeracao === 'R' }" style="--c:var(--teal)" @click="tipoGeracao = 'R'">Real</button>
          </div>
        </div>
        <div class="lx-field"><label for="gr-mes">Mês</label>
          <select id="gr-mes" v-model="mesGeracao" class="lx-input"><option value="" disabled>Selecione</option><option v-for="m in meses" :key="m" :value="m">{{ MESES_LONGO[m - 1] }}</option></select>
        </div>
        <div class="lx-field"><label for="gr-ano">Ano</label>
          <select id="gr-ano" v-model="anoGeracao" class="lx-input"><option value="" disabled>Selecione</option><option v-for="a in anos" :key="a" :value="a">{{ a }}</option></select>
        </div>
        <div class="lx-field full"><label for="gr-kwh">{{ tipoGeracao === 'R' ? 'Geração real' : 'Projeção' }} (kWh)</label><input id="gr-kwh" v-model="kwhGeracao" type="number" class="lx-input"></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogGeraConfig2 = true">Editar lançamentos</button>
        <span class="sp"></span>
        <button class="lx-btn" @click="sendGeracao">Salvar</button>
      </template>
    </LxDialog>

    <!-- Lançamentos de geração existentes -->
    <LxDialog v-model="dialogGeraConfig2" titulo="Lançamentos de geração" :subtitulo="`Ano ${selectedYear}`" icone="⚡" cor="var(--teal)" :largura="860">
      <div class="lx-grid g2">
        <div v-for="bloco in [{ t: 'Projetada', c: 'var(--orange)', lista: projAnoLista, campo: 'projecao', tipo: 'P', del: deleteProjecao }, { t: 'Real', c: 'var(--teal)', lista: realAnoLista, campo: 'geracao', tipo: 'R', del: deleteGeracao }]" :key="bloco.t" class="ud-sub">
          <h4 :style="{ color: bloco.c }">{{ bloco.t }}</h4>
          <table class="lx-tbl">
            <thead><tr><th>Mês</th><th class="r">kWh</th><th class="c">Ações</th></tr></thead>
            <tbody>
              <tr v-for="g in bloco.lista" :key="g.id">
                <td>{{ MESES_LONGO[g.mes - 1] }}</td>
                <td class="r">{{ numero(Number(g[bloco.campo]) || 0) }}</td>
                <td class="c">
                  <div class="ud-acts">
                    <button class="lx-icon-btn" style="--c:var(--purple)" title="Editar" aria-label="Editar" @click="openDialogEditGeracao(g.id, bloco.tipo)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="lx-icon-btn" style="--c:var(--red)" title="Excluir" aria-label="Excluir" @click="bloco.del(g.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!bloco.lista.length" class="lx-empty">Nada lançado em {{ selectedYear }}.</p>
        </div>
      </div>
    </LxDialog>

    <!-- Editar geração -->
    <LxDialog v-model="dialogGeraConfig3" titulo="Editar geração" :subtitulo="tipoGeracaoEdit === 'P' ? 'Projetada' : 'Real'" icone="✎" cor="var(--purple)" :largura="520">
      <div v-if="showErrorCampoGeracaoEdit" class="lx-alert err">Preencha todos os campos.</div>
      <div v-if="showErrorAlertGeracaoEdit" class="lx-alert err">Erro ao tentar editar a geração.</div>
      <div v-if="showSuccessAlertGeracaoEdit" class="lx-alert ok">Geração editada com sucesso.</div>
      <div class="lx-form">
        <div class="lx-field"><label>Mês</label><input class="lx-input" :value="MESES_LONGO[mesGeracaoEdit - 1] ?? ''" disabled></div>
        <div class="lx-field"><label>Ano</label><input class="lx-input" :value="anoGeracaoEdit" disabled></div>
        <div class="lx-field full"><label for="ge-kwh">{{ tipoGeracaoEdit === 'R' ? 'Geração real' : 'Projeção' }} (kWh)</label><input id="ge-kwh" v-model="kwhGeracaoEdit" type="number" class="lx-input"></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogGeraConfig3 = false">Fechar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="editarGeracao(idGeracaoEdit, tipoGeracaoEdit)">Salvar</button>
      </template>
    </LxDialog>

    <!-- Lançar injeção -->
    <LxDialog v-model="dialogInjecao1" titulo="Lançar injeção" subtitulo="Energia injetada na rede no mês" icone="⇄" cor="var(--purple)" :largura="560">
      <div v-if="showErrorCampoInjecao" class="lx-alert err">Preencha todos os campos.</div>
      <div v-if="showErrorMesInjecao" class="lx-alert err">Esse mês/ano já está preenchido.</div>
      <div v-if="showSuccessAlertInjecao" class="lx-alert ok">Injeção enviada com sucesso.</div>
      <div class="lx-form">
        <div class="lx-field"><label for="in-mes">Mês</label>
          <select id="in-mes" v-model="mesInjecao" class="lx-input"><option value="" disabled>Selecione</option><option v-for="m in meses" :key="m" :value="m">{{ MESES_LONGO[m - 1] }}</option></select>
        </div>
        <div class="lx-field"><label for="in-ano">Ano</label>
          <select id="in-ano" v-model="anoInjecao" class="lx-input"><option value="" disabled>Selecione</option><option v-for="a in anos" :key="a" :value="a">{{ a }}</option></select>
        </div>
        <div class="lx-field"><label for="in-ckwh">Consumo (kWh)</label><input id="in-ckwh" v-model="consumoKWHUsina" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="in-crs">Consumo (R$)</label><input id="in-crs" v-model="consumoReaisUsina" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="in-p">Injetado ponta (kWh)</label><input id="in-p" v-model="pontaInjetado" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="in-fp">Injetado fora ponta (kWh)</label><input id="in-fp" v-model="pontaFInjetado" type="number" class="lx-input"></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="openDialogInjecao2">Editar injeções</button>
        <span class="sp"></span>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="sendInjecao">Salvar</button>
      </template>
    </LxDialog>

    <!-- Injeções existentes -->
    <LxDialog v-model="dialogInjecao2" titulo="Injeções lançadas" :subtitulo="`Ano ${selectedYear}`" icone="⇄" cor="var(--purple)" :largura="620">
      <table class="lx-tbl">
        <thead><tr><th>Mês</th><th class="r">Ponta</th><th class="r">Fora ponta</th><th class="r">Total</th><th class="c">Ações</th></tr></thead>
        <tbody>
          <tr v-for="injecao in injAnoLista" :key="injecao.id">
            <td>{{ MESES_LONGO[injecao.mes - 1] }}</td>
            <td class="r">{{ numero(Number(injecao.injetadoPonta) || 0) }}</td>
            <td class="r">{{ numero(Number(injecao.injetadoFPonta) || 0) }}</td>
            <td class="r"><b>{{ numero((Number(injecao.injetadoPonta) || 0) + (Number(injecao.injetadoFPonta) || 0)) }}</b></td>
            <td class="c">
              <div class="ud-acts">
                <button class="lx-icon-btn" style="--c:var(--purple)" title="Editar" aria-label="Editar injeção" @click="openDialogInjecao3(injecao.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="lx-icon-btn" style="--c:var(--red)" title="Excluir" aria-label="Excluir injeção" @click="deleteInjecao(injecao.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!injAnoLista.length" class="lx-empty">Nenhuma injeção lançada em {{ selectedYear }}.</p>
    </LxDialog>

    <!-- Editar injeção -->
    <LxDialog v-model="dialogInjecao3" titulo="Editar injeção" icone="✎" cor="var(--purple)" :largura="560">
      <div v-if="showErrorCampoInjecao" class="lx-alert err">Preencha todos os campos.</div>
      <div v-if="showSuccessAlertInjecao" class="lx-alert ok">Injeção editada com sucesso.</div>
      <div class="lx-form">
        <div class="lx-field"><label>Mês</label><input class="lx-input" :value="MESES_LONGO[mesInjecao - 1] ?? ''" disabled></div>
        <div class="lx-field"><label>Ano</label><input class="lx-input" :value="anoInjecao" disabled></div>
        <div class="lx-field"><label for="ie-ckwh">Consumo (kWh)</label><input id="ie-ckwh" v-model="consumoKWHUsina" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="ie-crs">Consumo (R$)</label><input id="ie-crs" v-model="consumoReaisUsina" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="ie-p">Injetado ponta (kWh)</label><input id="ie-p" v-model="pontaInjetado" type="number" class="lx-input"></div>
        <div class="lx-field"><label for="ie-fp">Injetado fora ponta (kWh)</label><input id="ie-fp" v-model="pontaFInjetado" type="number" class="lx-input"></div>
      </div>
      <template #rodape>
        <button class="lx-btn-ghost" @click="dialogInjecao3 = false">Fechar</button>
        <button class="lx-btn" style="--c1:var(--purple);--c2:var(--teal)" @click="editInjecao(injetadoId)">Salvar</button>
      </template>
    </LxDialog>
  </div>
</template>

<style scoped>
.ud-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.ud-end { font-size: 12.5px; color: var(--mut); }
.ud-manu { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ud-manu-box { --c: var(--teal); background: rgba(255, 255, 255, .04); border-radius: 14px; padding: 12px 14px; border-left: 3px solid var(--c); display: flex; flex-direction: column; gap: 3px; }
.ud-manu-box span { font-size: 11.5px; color: var(--mut); }
.ud-manu-box b { font-size: 19px; font-weight: 700; color: var(--c); }
.ud-manu-box small { font-size: 11.5px; color: var(--mut); }
.ud-leg { justify-content: flex-end; margin-bottom: 6px; }
.ud-nota { font-size: 11.5px; color: var(--mut); margin: 6px 0 12px; }
.ud-mtbl td, .ud-mtbl th { padding: 8px 9px; }
.ud-mtbl td:first-child { color: var(--mut); font-weight: 600; white-space: nowrap; }
.ud-mut { color: var(--mut); opacity: .6; }
.ud-tend { font-size: 14px; font-weight: 700; }
.ud-acts { display: flex; gap: 6px; justify-content: center; }
.ud-txt { font-size: 14px; color: var(--tx); line-height: 1.5; }
.ud-sub { background: rgba(255, 255, 255, .03); border: 1px solid var(--line2); border-radius: 16px; padding: 12px; min-width: 0; }
.ud-sub h4 { font-size: 14px; font-weight: 600; margin: 0 0 8px; }

/* Ordem de serviço: folha branca (é o que vai para o PDF) */
.ud-paper-wrap { background: rgba(255, 255, 255, .04); border-radius: 14px; padding: 14px; overflow-x: auto; }
.ud-paper { background: #fff; color: #111; padding: 28px 32px; border-radius: 6px; min-width: 640px; font-family: Arial, Helvetica, sans-serif; }
.ud-os-logos { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.ud-paper h2 { text-align: center; font-size: 22px; margin: 6px 0 2px; color: #111; }
.ud-os-sub { text-align: center; font-size: 13px; color: #333; margin-bottom: 16px; }
.ud-os { width: 100%; border-collapse: collapse; font-size: 13px; }
.ud-os th, .ud-os td { border: 1px solid #cfd4dc; padding: 8px 10px; text-align: center; color: #111; }
.ud-os th { background: #e8e8e8; font-weight: 700; }
.ud-os th.hd { background: #5d87ff; color: #fff; }
.ud-os-ft { display: flex; justify-content: space-between; font-size: 12px; color: #333; margin-top: 18px; padding-top: 10px; border-top: 1px solid #cfd4dc; }
@media (max-width: 640px) { .ud-manu { grid-template-columns: 1fr; } }
</style>
