import { setWebClients, workers } from '../inference'

const webClients: any = {}

const websocketEvents = {
  open: (ws: any) => {
    const clientId = ws.data.clientId
    webClients[clientId] = ws
    setWebClients(webClients)
    console.log(`ClientId: ${clientId} connected`)
    console.log(`Clients: ${Object.keys(webClients).length}`)
    ws.send(JSON.stringify({ clientId: clientId }))
  },
  message: (ws: any, message: any) => {
    const { abort } = JSON.parse(message)
    if (abort) {
      ws.send(
        JSON.stringify({ clientId: ws.data.clientId, isStreaming: false })
      )
      workers[ws.data.clientId].postMessage({ abort: true })
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
