<script setup lang="ts">
import { UserIcon, MailIcon, ListCheckIcon } from 'vue-tabler-icons';
const { signOut } = useAuth();

const submitLogout = ()=> {
    signOut({redirect: false}).then(()=>{
        console.log("successfully performed the logout");
        navigateTo("/auth/login")
    }).catch((error)=>{
        console.log("error when trying logout ", error);
    })
}

const { data } = useAuth() 

const dados = ref([JSON.stringify(data.value)])
 
const username = ref(JSON.stringify(data.value.username)) 


</script>

<template>
    <!-- ---------------------------------------------- -->
    <!-- notifications DD -->
    <!-- ---------------------------------------------- -->
    <v-menu :close-on-content-click="false">
        <template v-slot:activator="{ props }">
            <v-btn class="profileBtn custom-hover-primary" variant="text" v-bind="props" icon>
                <v-avatar size="35">
                    <img src="/images/users/avatar.png" height="35" alt="user" />
                </v-avatar>
            </v-btn>
        </template>
        <v-sheet rounded="md" width="200" elevation="10" class="mt-2">
            <v-list class="py-0" lines="one" density="compact">
                <v-list-item value="item1" active-color="primary" >
                    <template v-slot:prepend>
                        <UserIcon stroke-width="1.5" size="20"/>
                    </template>
                    <v-list-item-title class="pl-4 text-body-1">{{ username.replace(/"/g, '') }}</v-list-item-title>
                </v-list-item>
                <!-- <v-list-item value="item2" active-color="primary">
                    <template v-slot:prepend>
                        <MailIcon stroke-width="1.5" size="20"/>
                    </template>
                    <v-list-item-title  class="pl-4 text-body-1">My Account</v-list-item-title>
                </v-list-item>
                <v-list-item value="item3" active-color="primary"> 
                    <template v-slot:prepend>
                        <ListCheckIcon stroke-width="1.5"  size="20"/>
                    </template>
                    <v-list-item-title class="pl-4 text-body-1">My Task</v-list-item-title>
                </v-list-item> -->
            </v-list>
            <div class="pt-4 pb-4 px-5 text-center">
                <v-btn @click="submitLogout" color="primary" variant="outlined" block>Sair</v-btn>
            </div>
        </v-sheet>
    </v-menu>
</template>
