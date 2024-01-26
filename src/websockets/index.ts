import { setWebClients, workers as inferenceWorkers } from '../inference'
import {
  setWebClients as setIngestWebClients,
  workers as ingestWorkers,
} from '../ingest'
import { warmUpModel } from '../helpers'
import { ingestWorker } from '../ingest'

const webClients: any = {}

const websocketEvents = {
  open: async (ws: any) => {
    const clientId = ws.data.clientId
    webClients[clientId] = ws
    setWebClients(webClients)
    setIngestWebClients(webClients)
    console.log(`ClientId: ${clientId} connected`)
    console.log(`Clients: ${Object.keys(webClients).length}`)
    warmUpModel('siteChat:latest').then(() => {
      ws.send(JSON.stringify({ clientId: clientId }))
    })
  },
  message: (ws: any, message: any) => {
    const { abort, siteUrl, abortIngest } = JSON.parse(message)
    if (abort) {
      ws.send(
        JSON.stringify({ clientId: ws.data.clientId, isStreaming: false })
      )
      inferenceWorkers[ws.data.clientId].postMessage({ abort: true })
    }
    if (abortIngest) {
      ingestWorkers[ws.data.clientId].postMessage({ abort: true })
    }
    if (siteUrl) {
      ingestWorker(siteUrl, ws.data.clientId)
    }
  },
  close: (ws: any) => {
    const clientId = ws.data.clientId
    console.log(`ClientId: ${clientId} disconnected`)
    delete webClients[clientId]
  },
}

export default websocketEvents
export { webClients, websocketEvents }
