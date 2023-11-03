import { verifyModel } from './ollama/api'
import {
  getFileSource,
  getRelevantFiles,
  getRelevantDocuments,
  getRelevantTopics,
} from './helpers'
import { loadDataDirectory, loadSourceFiles } from './ingest'
import { getHuggingFaceInferenceEmbeddings } from './embeddings'
import { generatePrompt } from './prompt'
import { inferenceWorker } from './inference'
import { websocketEvents } from './websockets'

const uuid = require('uuid')
const OLLAMA_MODEL = 'llama2:latest'
const EMBEDDING_MODEL = 'Craig/paraphrase-MiniLM-L6-v2'
const DATA_DIRECTORY = './data'
const embeddings = await getHuggingFaceInferenceEmbeddings(EMBEDDING_MODEL)

try {
  await verifyModel(OLLAMA_MODEL)
  const docStore = await loadDataDirectory(DATA_DIRECTORY, embeddings, {
    chunkSize: 800,
    chunkOverlap: 100,
  })
  const fileStore = await loadSourceFiles(DATA_DIRECTORY, embeddings)
  const server = await Bun.serve({
    port: 3000,
    async fetch(request, server) {
      const success = server.upgrade(request, {
        data: {
          clientId: uuid.v4(),
        },
      })
      if (success) return
      const { webClientId, question, contextDocuments, contextFiles } =
        await request.json()
      const relevantFiles = await getRelevantFiles(
        fileStore,
        question,
        contextFiles
      )
      const relevantTopics = getRelevantTopics(relevantFiles)
      const relevantDocs = await getRelevantDocuments(
        docStore,
        question,
        contextDocuments,
        {
          source: {
            $in: relevantFiles.map((f) => f.pageContent),
          },
        }
      )
      const relevantSources = await Promise.all(
        relevantFiles.map((f) => getFileSource(f.pageContent))
      )
      const context = Array.from(
        new Set(relevantDocs.map((d) => d.pageContent))
      ).join('\n')
      const prompt = generatePrompt(
        question,
        context,
        relevantTopics,
        relevantSources
      )
      inferenceWorker(OLLAMA_MODEL, prompt, webClientId)
      return new Response(
        JSON.stringify({
          context: context,
          relevantDocs: relevantDocs,
          relevantFiles: relevantFiles,
          relevantLinks: relevantSources,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'sentry-trace, baggage',
          },
        }
      )
    },
    websocket: websocketEvents,
  })
  console.log(`Listening on http://${server.hostname}:${server.port}`)
} catch (error) {
  console.error(error)
}
