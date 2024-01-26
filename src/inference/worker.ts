import { getOllamaClient } from '../ollama'
let abortController: AbortController = new AbortController()
let _webClientId: string
// prevents TS errors
declare var self: Worker

const stream = async (model: string, prompt: string) => {
  console.log('starting stream worker for client: ', _webClientId)
  const ollama = getOllamaClient(model)
  const stream = await ollama.stream(prompt, {
    signal: abortController.signal,
    timeout: 300000,
  })
  try {
    for await (const chunk of stream) {
      // console.log('Sending chunk: ', chunk, _webClientId)
      self.postMessage({ chunk, webClientId: _webClientId, isStreaming: true })
    }
    self.postMessage({ webClientId: _webClientId, isStreaming: false })
  } catch (error: any) {
    self.postMessage({
      webClientId: _webClientId,
      isStreaming: false,
      error: {
        message: error.message,
      },
    })
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { model, prompt, webClientId, abort } = event.data
  _webClientId = webClientId
  if (abort === true) {
    abortController.abort()
  } else {
    await stream(model, prompt)
  }
}
