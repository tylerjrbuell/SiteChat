import { Ollama } from 'langchain/llms/ollama'
import { warmUpModel } from '../helpers'

const getOllamaClient = (model: string) => {
  const ollama = new Ollama({
    baseUrl: 'http://ollama-api:11434',
    model: model,
    temperature: 0,
    numGpu: 50,
    numThread: 15,
  })
  return ollama
}

export { getOllamaClient }
