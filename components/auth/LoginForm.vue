<script setup>
import { ref, reactive, watch } from 'vue';
import { API_BASE_URL } from '~/base/link';

const { signIn } = useAuth();

const overlay = ref(false);
watch(overlay, (val) => {
  if (val) {
    setTimeout(() => {
      overlay.value = false;
      submitLogin();
    }, 3000);
  }
});

const credentials = reactive({
  username: '',
  password: '',
});

const showAlertError = ref();
const showAlertErrorPermissao = ref();

const submitLogin = async () => {
  showAlertError.value = false;
  showAlertErrorPermissao.value = false;
  const { data: userPesquisar } = await useFetch(`${API_BASE_URL}/usuarios?username=${credentials.username}`);

  if (userPesquisar._rawValue[0] && userPesquisar._rawValue[0].cargo !== 'AD') {
    showAlertErrorPermissao.value = true;
    showAlertError.value = false;
    return;
  }

  signIn(credentials, { redirect: false })
    .then(() => {
      console.log("Successfully logged!");
      navigateTo('../');
    })
    .catch((error) => {
      showAlertErrorPermissao.value = false;
      showAlertError.value = true;
      console.log("Error when trying to login: ", error);
    });
};

// Adiciona o ouvinte para o evento de pressionar a tecla Enter
const onEnterPress = (event) => {
  if (event.key === 'Enter') {
    overlay.value = true;
  }
};
</script>

<template>
  <v-row class="d-flex mb-3" @keydown="onEnterPress">
    <v-col v-if="showAlertErrorPermissao" cols="12">
      <v-alert type="error">Usuário não permitido.</v-alert>
    </v-col>
    <v-col v-if="showAlertError" cols="12">
      <v-alert type="error">Usuário e/ou senha estão incorretos.</v-alert>
    </v-col>
    <v-col cols="12">
      <v-label class="font-weight-bold mb-1">Usuário</v-label>
      <v-text-field
        v-model="credentials.username"
        variant="outlined"
        hide-details
        color="primary"
      ></v-text-field>
    </v-col>
    <v-col cols="12">
      <v-label class="font-weight-bold mb-1">Senha</v-label>
      <v-text-field
        v-model="credentials.password"
        variant="outlined"
        type="password"
        hide-details
        color="primary"
      ></v-text-field>
    </v-col>
    <v-col cols="12" class="pt-0">
      <v-btn @click="overlay = !overlay" type="submit" color="primary" size="large" block flat>
        Entrar
      </v-btn>
    </v-col>
  </v-row>

  <v-overlay :model-value="overlay" class="align-center justify-center">
    <v-progress-circular color="primary" size="64" indeterminate></v-progress-circular>
  </v-overlay>
</template>
