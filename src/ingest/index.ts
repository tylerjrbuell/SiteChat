import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { Document } from 'langchain/document'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Chroma } from 'langchain/vectorstores/chroma'
import { chromaClient, getChroma } from '../chromaDB'

let _webClients: any = {}
let workers: any = {}

function setWebClients(webClients: any) {
  _webClients = webClients
}

function ingestWorker(siteUrl: string, webClientId: any) {
  const worker = new Worker(new URL('worker.ts', import.meta.url).href)
  worker.postMessage({ siteUrl, webClientId })
  worker.onmessage = async (event: MessageEvent) => {
    console.log('Received message from worker: ', event.data)
    const { webClientId, error, syncResult } = event.data
    _webClients[webClientId]?.send(JSON.stringify({ webClientId, error, syncResult, ingesting: false }))
  }
  workers[webClientId] = worker
  // console.log('threadID: ', worker.threadId)
  return worker
}

const chunkedArray = (arr: any[], chunkSize: number) => {
  const res = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    res.push(chunk)
  }
  return res
}

interface DirectoryLoadOptions {
  vectorCollectionName?: string
  chunkSize?: number
  chunkOverlap?: number
  embeddingChunkSize?: number
}

interface FileLoadOptions {
  vectorCollectionName?: string
}

const getDirectoryLoader = (path: string) => {
  return new DirectoryLoader(path, {
    '.pdf': (path) => new PDFLoader(path),
    '.txt': (path) => new TextLoader(path),
  })
}

async function loadDataDirectory(
  path: string = './data',
  embeddings: any,
  options: Partial<DirectoryLoadOptions> = {}
): Promise<Document<Record<string, any>>[]> {
  const defaultOptions: DirectoryLoadOptions = {
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingChunkSize: 1000,
    vectorCollectionName: 'sourceDocuments',
  };
  options = { ...defaultOptions, ...options };
  await chromaClient.reset()
  const collectionName = options.vectorCollectionName
  console.log(collectionName);
  const documentStore: Chroma = await getChroma(embeddings, {
    collectionName
  })
  const loader = getDirectoryLoader(path)
  const docs = await loader.load()
  if (docs.length) {
    console.log(`Loading and splitting documents from: ${path}...`)
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    })
    const splitDocs = await textSplitter.splitDocuments(docs)
    let combinedChunks: any = []
    console.log(`Embedding ${splitDocs.length} documents...`)
    for (let docsChunk of chunkedArray(splitDocs, options.embeddingChunkSize!)) {
      combinedChunks = combinedChunks.concat(docsChunk)
    }
    await documentStore.addDocuments(combinedChunks)
    const collection = await chromaClient.getCollection({ name: collectionName! })
    console.info(`${await collection.count()} Documents Embedded successfully to collection: ${collection.name}`);
  }
  return docs
}

async function loadSourceFiles(
  path: string = './data',
  embeddings: any,
  options: FileLoadOptions = {
    vectorCollectionName: 'sourceFiles',
  }
): Promise<Document<Record<string, any>>[]> {
  const loader = getDirectoryLoader(path)
  const docs = await loader.load()
  if (docs.length) {
    console.log(`Loading source file names from ${path}...`)
    const collectionName = options.vectorCollectionName
    const fileStore: Chroma = await getChroma(embeddings, {
      collectionName
    })
    await Chroma.fromTexts(Array.from(new Set(docs.map((d) => d.metadata.source))), [], embeddings, {
      url: fileStore.url,
      collectionName
    })
    const collection = await chromaClient.getCollection({ name: collectionName! })
    console.info(`${await collection.count()} File names Embedded successfully to collection: ${collection.name}`);
  }
  return docs
}

export {
  loadDataDirectory,
  loadSourceFiles,
  ingestWorker,
  setWebClients,
  workers,
}
