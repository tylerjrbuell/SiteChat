let _webClients: any = {}
let workers: any = {}

function setWebClients(webClients: any) {
  _webClients = webClients
}

function inferenceWorker(model: string, prompt: string, webClientId: any) {
  const worker = new Worker(new URL('worker.ts', import.meta.url).href)
  worker.postMessage({ model, prompt, webClientId })
  worker.onmessage = async (event: MessageEvent) => {
    const { chunk, webClientId, isStreaming } = event.data
    // console.log('receiving chunk: ', chunk, webClientId)
    _webClients[webClientId]?.send(
      JSON.stringify({ clientId: webClientId, chunk: chunk || '', isStreaming })
    )
  }
  workers[webClientId] = worker
  // console.log('threadID: ', worker.threadId)
  return worker
}

export { inferenceWorker, setWebClients, workers }
