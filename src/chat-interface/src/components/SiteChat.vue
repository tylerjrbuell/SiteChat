<template>
  <div style="width: 600px">
    <q-banner class="bg-primary text-white" style="border-radius: 5px">
      <div class="row justify-between">
        <div class="text-h6">Site Chat</div>
        <q-fab
          flat
          vertical-actions-align="left"
          color="accent"
          padding="none md"
          icon="settings"
          direction="right"
          style="max-width: 20px"
          title="Context Settings"
        >
          <div class="col q-ml-md q-mb-xs">
            <q-input
              style="max-height: 50px"
              v-model.number="contextFiles"
              dense
              outlined
              standout
              label="Context Files"
              type="number"
              :rules="[(val) => val <= 4 || 'max of 4']"
            />
            <q-input
              v-model.number="contextDocuments"
              dense
              outlined
              standout
              label="Context Documents"
              type="number"
              :rules="[(val) => val <= 5 || 'max of 5']"
              style="min-width: 120px; max-height: 50px"
            />
          </div>
        </q-fab>
      </div>
    </q-banner>

    <q-input
      v-model="question"
      @keydown.enter.prevent="ask()"
      style="width: inherit"
      clearable
      autogrow
      type="textarea"
      label="Ask a question"
      @clear="
        answer = '';
        sourceLinks = [];
      "
    >
    </q-input>
    <q-input
      ref="response"
      :loading="loading"
      v-model="answer"
      type="textarea"
      label="Response"
      standout
      clearable
      autogrow
      input-class="response-input"
      :disable="!answer"
    >
      <template #loading>
        <q-spinner-dots
          v-if="loading && !streaming"
          class="q-mb-md q-mt-md"
          color="primary"
          size="xl"
        />
        <q-spinner-comment
          v-if="streaming"
          class="q-mb-md q-mt-md"
          color="primary"
          size="xl"
        />
      </template>
    </q-input>

    <div v-if="sourceLinks.length && !loading">
      <b>Relevant Sources:</b> <span v-html="sourceLinks.join(', ')"></span>
    </div>
    <q-btn
      @click="loading ? abortAsk() : ask()"
      :color="loading ? 'red' : 'accent'"
      style="width: inherit; margin-left: 0px"
      :label="loading ? 'Cancel' : 'Submit Question'"
      unelevated
      :title="loading ? 'Cancel' : 'Submit Question'"
      :icon="loading ? 'cancel' : 'send'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const ws = new WebSocket(`ws://localhost:${process.env.DOCKER_PORT || 3000}`);
const response = ref(null);
const webClientId = ref('');
const contextDocuments = ref(2);
const contextFiles = ref(1);
const question = ref('');
const answer = ref('');
const loading = ref(false);
const streaming = ref(false);
const streamEnded = ref(false);
const sourceLinks = ref([]);

ws.onopen = async function () {
  console.log('Connected to site-chat-api');
};

ws.onmessage = function (event) {
  const { chunk, clientId, isStreaming } = JSON.parse(event.data);
  console.log('message for ' + clientId);
  streaming.value = Boolean(isStreaming);
  if (clientId) {
    webClientId.value = clientId;
  }
  if (chunk) {
    answer.value = answer.value + chunk;
  }
};

ws.onclose = function () {
  console.log('Disconnected from site-chat-api');
};

watch(streaming, (val) => {
  if (val == true) {
    streamEnded.value = false;
  } else if (val == false) {
    streamEnded.value = true;
    loading.value = false;
  }
});

/**
 * Makes an asynchronous request to http://localhost:3000 with a POST method
 * and sends a JSON object containing a question and answer.
 *
 * @return {Promise} A promise that resolves to the response data from the server.
 */
const ask = async (_question = '') => {
  if (!question.value && !_question) return;
  try {
    answer.value = '';
    sourceLinks.value = [];
    loading.value = true;
    const response = await fetch(
      `http://localhost:${process.env.DOCKER_PORT || 3000}`,
      {
        method: 'POST',
        body: JSON.stringify({
          webClientId: webClientId.value,
          question: _question || question.value,
          contextDocuments: contextDocuments.value,
          contextFiles: contextFiles.value,
        }),
        headers: {
          Connection: 'keep-alive',
        },
      }
    );
    const data = await response.json();
    sourceLinks.value = data.relevantLinks.map(
      (s: string) => `<a href="${s}" target="_blank">${s.split('/').pop()}</a>`
    );
    return data;
  } catch (error) {
    loading.value = false;
    throw error;
  }
};

const abortAsk = () => {
  loading.value = false;
  ws.send(JSON.stringify({ abort: true }));
};
</script>
<style>
a,
a:visited,
a:hover,
a:active {
  color: blue;
}
::-webkit-scrollbar {
  display: none;
}
.response-input {
  max-height: 300px !important;
  min-height: 200px !important;
  overflow: scroll !important;
}
</style>
