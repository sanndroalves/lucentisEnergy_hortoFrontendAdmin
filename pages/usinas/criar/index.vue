<script setup >
import { useHead  } from '@vueuse/head';
import { API_BASE_URL } from '~/base/link';

// Defina o título da página
useHead ({
  title: 'Nova Usina'
});

definePageMeta({
  middleware: 'sidebase-auth'
})

import { ref } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const ucUsina = ref("");
const nomeUsina = ref("");
const dataInicioUsina = ref("");
const potenciaUsina = ref("");
const enderecoUsina = ref("");
const statusUsina = ref("");

const showSuccessAlert = ref(false);
const showErrorAlert = ref(false);
const showErrorCampo = ref(false);

const sendUsina = async () => {
     

    if (!ucUsina.value || !nomeUsina.value || !dataInicioUsina.value || !potenciaUsina.value || !enderecoUsina.value || !statusUsina.value) {
        showErrorCampo.value = true;
        return;
    }

    try {
        const response = await useFetch(`${API_BASE_URL}/usina/`, {
        method: 'POST',
        body: {
            uc: ucUsina.value,
            nome: nomeUsina.value,
            dataInicio: dataInicioUsina.value,
            potencia: potenciaUsina.value,
            endereco: enderecoUsina.value,
            status: statusUsina.value
        },
        key: 'usinaPost'
        });

        // Verifique se a resposta foi bem-sucedida
        if (response) {
            showSuccessAlert.value = true;
            showErrorCampo.value = false;
        } else {
            showErrorAlert.value = true;
            showErrorCampo.value = false;
        }
    } catch (error) {
        console.error("Erro ao enviar a usina:", error);
        showErrorAlert.value = true;
    }
}
</script>
<template>
    <v-row>
        <v-col cols="12" md="12">
            <UiParentCard title="Adicionar - Usina Fotovoltaica">
                <v-divider></v-divider>
                <v-row class="d-flex mb-3" style="margin: 15px;">
                    <v-col cols="12">
                        <v-alert v-if="showErrorCampo" type="error">
                            Preencha todos os campos!
                        </v-alert>
                    </v-col>
                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">UC</v-label>
                        <v-text-field v-model="ucUsina" type="number" variant="outlined" hide-details color="primary" required></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Nome</v-label>
                        <v-text-field v-model="nomeUsina" variant="outlined" hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Início</v-label>
                        <v-text-field v-model="dataInicioUsina" variant="outlined" type="date"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Potência (kW)</v-label>
                        <v-text-field v-model="potenciaUsina" variant="outlined" type="number"  hide-details color="primary"></v-text-field>
                    </v-col>
                    <v-col cols="6">
                        <v-label class="font-weight-bold mb-1">Endereço</v-label>
                        <v-text-field v-model="enderecoUsina" variant="outlined"  hide-details color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6" >
                        <v-label class="font-weight-bold mb-1">Status</v-label>
                        <v-radio-group v-model="statusUsina" inline>
                            <v-radio label="Ligado" value="L"></v-radio>
                            <v-radio label="Desligado" value="D"></v-radio>
                            <v-radio label="Manutenção" value="M"></v-radio>
                        </v-radio-group>
                    </v-col>

                    

                    <v-col cols="12" class="pt-0" style="margin-top: 10px;">
                        <v-btn @click="sendUsina" color="primary" size="large" block   flat>Criar</v-btn>
                    </v-col>

                    <v-alert v-if="showSuccessAlert" type="success">
                        Usina criada com sucesso!
                    </v-alert>

                </v-row>
            </UiParentCard>
        </v-col>
    </v-row>
</template>
