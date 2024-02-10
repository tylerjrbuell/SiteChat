<template>
  <div style="width: 850px">
    <q-banner class="bg-primary text-white" style="border-radius: 5px">
      <div class="row justify-between">
        <div class="text-h6">
          <q-input
            dense
            v-model="siteUrl"
            color="accent"
            icon="settings"
            direction="right"
            title="Site URL"
            label="Context Site URL"
            style="width: 730px"
            :loading=ingesting
          >
            <template v-slot:prepend>
              <q-icon name="link" />
            </template>
            <template v-slot:append>
              <q-icon
                @click="ingesting ? abortIngestion() : startSiteUrlIngestion()"
                v-if="isValidUrl(siteUrl)"
                :color="ingesting ? 'red' : 'accent'"
                size="md"
                class="cursor-pointer"
                :name="ingesting ? 'cancel' : 'download'"
                :title="ingesting ? 'Cancel Site Ingestion' : 'Ingest Site Contents'"
              />
            </template>
          </q-input>
          <q-linear-progress
            v-if="siteLoadingProgress > 0"
            class="q-pt-sm"
            dark
            color="accent"
            :value="siteLoadingProgress"
          ></q-linear-progress>
        </div>
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
            <q-checkbox v-model="singlePageIngest" style="color: black; font-size: 11px;" color="accent" dense label="Single Page Mode"></q-checkbox>
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
      :label="!webClientId ? 'Model is warming up...' : 'Ask a question'"
      @clear="
        answer = '';
        sourceLinks = [];
      "
      :loading="!webClientId"
      :disable="!webClientId"
    >
    </q-input>
    <q-scroll-area
      dark
      ref="response"
      class="response-input text-white rounded-borders"
    >
      <template #default>
        <div v-html="markdownAnswer" ref="markdownContainer"></div>
        <q-spinner-dots
          v-if="loading || streaming"
          class="q-mb-md q-mt-xl row"
          color="primary"
          size="lg"
          style="width: 100%"
        />
      </template>
    </q-scroll-area>
    <div class="relevant-sources" v-if="sourceLinks.length && !loading">
      <b>Relevant Sources:</b> <span v-html="sourceLinks.join(', ')"></span>
    </div>
    <q-btn
      @click="loading ? abortAsk() : ask()"
      :color="loading ? 'red' : 'accent'"
      style="
        margin-top: 0;
        width: inherit;
        margin-left: 0px;
        border-radius: 0px 0px 5px 5px;
      "
      :label="loading ? 'Cancel' : 'Submit Question'"
      unelevated
      :title="loading ? 'Cancel' : 'Submit Question'"
      :icon="loading ? 'cancel' : 'send'"
      :disable="!webClientId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useQuasar, copyToClipboard } from 'quasar';
import hljs from 'highlight.js';
import 'highlight.js/styles/stackoverflow-dark.min.css';

const ws = new WebSocket(`ws://localhost:${process.env.DOCKER_PORT || 3000}`);
const $q = useQuasar();
const response = ref(null);
const markdownContainer: any = ref(null);
const webClientId = ref('');
const contextDocuments = ref(2);
const contextFiles = ref(1);
const question = ref('');
const answer = ref('');
const loading = ref(false);
const streaming = ref(false);
const streamEnded = ref(false);
const sourceLinks = ref([]);
const siteUrl = ref('');
const ingesting = ref(false);
const singlePageIngest = ref(true);
const ingestResult = ref({});
const siteLoadingProgress = ref(0.0);
const copyIconName = ref('content_copy');

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

ws.onopen = async function () {
  console.log('Connected to site-chat-api');
};

ws.onmessage = function (event) {
  const {
    chunk,
    clientId,
    isStreaming,
    error,
    ingesting: isIngesting,
    syncResult,
    progress
  } = JSON.parse(event.data);
  // console.log('message  recieved: ', event.data);
  streaming.value = Boolean(isStreaming);

  if (clientId) {
    webClientId.value = clientId;
  }
  if (chunk) {
    answer.value = answer.value + chunk;
  }
  if (syncResult) {
    ingestResult.value = syncResult;
  }
  if(isIngesting != undefined){
    ingesting.value = isIngesting;
  }
  if(progress != undefined){
    siteLoadingProgress.value = progress
  }
  if (error) {
    loading.value = false;
    $q.notify({
      message: error.message,
      color: 'red',
      position: 'top',
      icon: 'warning'
    });
  }
};

ws.onclose = function () {
  console.log('Disconnected from site-chat-api');
};

const markdownAnswer = computed(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const markdown = marked.parse(answer.value);
  return markdown;
});

const copyIconHtml = computed(() => {
  return `<i
      class="q-icon notranslate material-icons copy-icon"
      aria-hidden="true"
      role="presentation"
      title="Copy to Clipboard"
      >${copyIconName.value}</i
    >`;
});

watch(streaming, (val) => {
  if (val == true) {
    streamEnded.value = false;
  } else if (val == false) {
    enrichCodeBlocks();
    streamEnded.value = true;
    loading.value = false;
  }
});

watch(ingestResult, (result: any) => {
  if (result.success) {
    $q.notify({
      message: result.message,
      color: 'black',
      position: 'top',
      icon: 'check'
    });
  }
  setTimeout(() => {
    ingesting.value = false;
    siteLoadingProgress.value = 0.0;
  }, 2000);
});

const enrichCodeBlocks = () => {
  if (markdownContainer.value) {
    const codeBlocks = markdownContainer.value.querySelectorAll('pre');
    codeBlocks.forEach((codeBlock: any) => {
      hljs.highlightElement(codeBlock);
      const copyIcon = document.createElement('span');
      copyIcon.className = 'copy-icon';
      copyIcon.innerHTML = copyIconHtml.value;
      copyIcon.addEventListener('click', async () => {
        await copyToClipboard(codeBlock.innerText);
        copyIconName.value = 'assignment_turned_in';
        copyIcon.innerHTML = copyIconHtml.value;
        setTimeout(() => {
          copyIconName.value = 'content_copy';
          copyIcon.innerHTML = copyIconHtml.value;
        }, 2000);
      });
      codeBlock.parentNode.insertBefore(copyIcon, codeBlock);
    });
  }
};

const startSiteUrlIngestion = () => {
  ingesting.value = true;
  ws.send(
    JSON.stringify({ webClientId: webClientId.value, siteUrl: siteUrl.value, singlePageIngest: singlePageIngest.value })
  );
};

const abortIngestion = () => {
  console.log('abortIngestion');
  ws.send(JSON.stringify({ abortIngest: true }));
  ingesting.value = false;
};

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
          contextFiles: contextFiles.value
        }),
        headers: {
          Connection: 'keep-alive'
        }
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

<style lang="scss">
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
  height: 350px !important;
  width: 850px !important;
  padding-right: 20px;
  padding-left: 20px;
  padding-top: 15px;
  background-color: #343541;
  border-radius: 5px 5px 0px 0px;
}
:not(pre) > code {
  color: orange;
  border-radius: 5px;
}
pre {
  padding: 10px;
  background-color: black;
  border-radius: 5px;
}

.relevant-sources {
  background-color: #6d708c;
}

.copy-icon {
  cursor: pointer;
  font-size: 20px;
  margin-right: 5px;
  margin-top: 5px;
  position: relative;
  float: right;
  color: white;
}
</style>
