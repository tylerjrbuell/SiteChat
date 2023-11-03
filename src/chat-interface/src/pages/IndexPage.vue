<template>
  <div class="fullscreen">
    <q-layout>
      <q-page-container>
        <q-page>
          <q-page-sticky position="bottom-right" :offset="fabPos">
            <q-fab
              icon="chat"
              direction="up"
              color="accent"
              :disable="draggingFab"
              v-touch-pan.prevent.mouse="moveFab"
              title="Site Chat"
            >
              <SiteChatVue />
            </q-fab>
          </q-page-sticky>
        </q-page>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import SiteChatVue from 'src/components/SiteChat.vue';
import { ref } from 'vue';
const fabPos = ref([18, 18]);
const draggingFab = ref(false);
const moveFab = (ev: any) => {
  draggingFab.value = ev.isFirst !== true && ev.isFinal !== true;

  fabPos.value = [fabPos.value[0] - ev.delta.x, fabPos.value[1] - ev.delta.y];
};
</script>
