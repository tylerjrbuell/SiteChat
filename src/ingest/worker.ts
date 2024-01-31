import syncSiteContent from '../site-sync'
import { loadDataDirectory, loadSourceFiles } from '../ingest'
import { getHuggingFaceInferenceEmbeddings } from '../embeddings'
import { unlink } from "node:fs/promises";
// @ts-ignore
import { Glob } from "bun";


let abortController: AbortController = new AbortController()
let _webClientId: string
declare var self: Worker
// prevents TS errors

const DATA_DIRECTORY = './data'
const EMBEDDING_MODEL = 'Craig/paraphrase-MiniLM-L6-v2'
const embeddings = await getHuggingFaceInferenceEmbeddings(EMBEDDING_MODEL)

const ingestSite = async (url: string) => {
  const webClientId = _webClientId
  console.log('starting stream worker for client: ', webClientId)
  await clearDataDirectory()
  const result = await syncSiteContent(url, true, abortController.signal)
  try {
    if (result.success) {
      console.log(url.split('/').reverse().pop());
      await loadDataDirectory(DATA_DIRECTORY, embeddings, {
        chunkSize: 1300,
        chunkOverlap: 0,
        embeddingChunkSize: 1000,
        // vectorCollectionName: url.replace('https://', '').split('/').reverse().pop(),
      })
      await loadSourceFiles(DATA_DIRECTORY, embeddings)
      self.postMessage({ webClientId, syncResult: result })
    } else {
      self.postMessage({
        webClientId, error: {
          message: result.message
        }
      })
    }
  } catch (error: any) {
    self.postMessage({
      webClientId,
      error: {
        message: error.message,
      },
    })
  }
}

const clearDataDirectory = async () => {
  const glob = await Glob('*.txt')
  for await (const file of glob.scan(DATA_DIRECTORY)) {
    console.log('clearing file: ', file);
    await unlink(`${DATA_DIRECTORY}/${file}`);
  }
}

self.onmessage = async (event: MessageEvent) => {
  console.log('worker received message from Main thread: ', event.data)
  const { siteUrl, webClientId, abort } = event.data
  console.log('webClientId: ', webClientId);
  _webClientId = webClientId
  if (abort === true) {
    abortController.abort()
  } else {
    if (siteUrl) await ingestSite(siteUrl)
  }
}