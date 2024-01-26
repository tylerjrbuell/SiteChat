let _webClients: any = {}
let workers: any = {}

function setWebClients(webClients: any) {
  _webClients = webClients
}

function inferenceWorker(model: string, prompt: string, webClientId: any) {
  const worker = new Worker(new URL('worker.ts', import.meta.url).href)
  worker.postMessage({ model, prompt, webClientId })
  worker.onmessage = async (event: MessageEvent) => {
    // console.log('Received message from worker: ', event.data)
    const { chunk, webClientId, isStreaming, error } = event.data
    _webClients[webClientId]?.send(
      JSON.stringify({
        clientId: webClientId,
        chunk: chunk || '',
        isStreaming,
        error,
      })
    )
  }
  workers[webClientId] = worker
  // console.log('threadID: ', worker.threadId)
  return worker
}

export { inferenceWorker, setWebClients, workers }
