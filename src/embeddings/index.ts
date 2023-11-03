import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf'
import { OllamaEmbeddings } from 'langchain/embeddings/ollama'

interface ollamaEmbeddingOptions {
  useMMap: boolean
  numThreads: number
  numGpu: number
  temperature: number
}

const hfEmbeddingModels = [
  'sentence-transformers/all-mpnet-base-v2',
  'Craig/paraphrase-MiniLM-L6-v2',
]

const getHuggingFaceInferenceEmbeddings = (
  model: string = 'Craig/paraphrase-MiniLM-L6-v2'
) => {
  return new HuggingFaceInferenceEmbeddings({
    model: model,
    apiKey: process.env.HF_API_KEY,
  })
}

const defaultOptions: ollamaEmbeddingOptions = {
  useMMap: true,
  numThreads: 12,
  numGpu: 1,
  temperature: 0,
}

const getOllamaEmbeddings = (
  model: string,
  ollamaUrl: string = 'http://ollama-api:11434',
  options = defaultOptions
) => {
  return new OllamaEmbeddings({
    baseUrl: ollamaUrl,
    model: model,
    requestOptions: options,
  })
}

export {
  getHuggingFaceInferenceEmbeddings,
  getOllamaEmbeddings,
  hfEmbeddingModels,
}
