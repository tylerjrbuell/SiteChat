import { Ollama } from 'langchain/llms/ollama'

const getOllamaClient = (model: string) => {
  return new Ollama({
    baseUrl: 'http://ollama-api:11434',
    model: model,
    temperature: 0,
    numGpu: 50,
    numThread: 15,
  })
}

export { getOllamaClient }
