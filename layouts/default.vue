<script setup >
import { RouterView } from 'vue-router';
const title = ref("Carregar • PEE Horto");

useHead({
  meta: [{ content: title }],
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} • PEE Horto`
      : "Gerencia • PEE Horto";
  },
});

const { data } = useAuth() 
const idUsuario = ref(data.value.id)

const { data: usuarioInfo } = await useFetch(`https://peehorto.cloud/usuarios/${idUsuario.value}`); 
console.log("CARGO: ", usuarioInfo.value.cargo)
</script>

<template>
    <v-locale-provider >
        <!-- <v-app v-if="usuarioInfo.cargo === 'AD' || !usuarioInfo"> -->
        <v-app>
            <LayoutFullMain/>
            <v-main>
                <v-container fluid class="page-wrapper">
                    <div class="maxWidth">
                        <RouterView />
                    </div>
                </v-container>
            </v-main>
        </v-app> 
        <!-- <v-app v-else>
            <v-main>
                <v-container fluid class="page-wrapper">
                    <div class="maxWidth">
                        <div class="d-flex justify-center align-center text-center h-100vh">
                            <div>
                                <img src="/images/background/errorimg.svg" width="500" alt="404" />
                                <h1 class="text-h1 pt-3">Opps!!!</h1>
                                <h4 class="text-h4 my-8">A página que você está procurando, não foi encontrada. Sem permissão.</h4>
                            </div>    
                        </div>
                    </div>
                </v-container>
            </v-main>
        </v-app>  -->
    </v-locale-provider>
</template>
