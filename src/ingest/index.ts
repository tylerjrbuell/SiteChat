import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Chroma } from 'langchain/vectorstores/chroma'
import chromaClient from '../chromaDB'

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

interface directoryLoadOptions {
  vectorCollectionName?: string
  chunkSize: number
  chunkOverlap: number
  embeddingChunkSize: number
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
  options: directoryLoadOptions = {
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingChunkSize: 1000,
  }
): Promise<Chroma> {
  let vectorStore: Chroma
  const collectionName = options?.vectorCollectionName
    ? options.vectorCollectionName
    : 'dataSources'
  // chromaClient.deleteCollection({ name: collectionName }).catch(() => { })
  const collections = await chromaClient.listCollections()
  // if (!collections?.map((c) => c.name).includes(collectionName)) {
  const loader = getDirectoryLoader(path)
  console.log(`Loading and splitting documents from: ${path}...`)
  const docs = await loader.load()
  if (!docs.length) {
    throw new Error('Failed to load documents')
  }
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
  })
  const splitDocs = await textSplitter.splitDocuments(docs)
  let combinedChunks: any = []
  console.log(`Embedding ${splitDocs.length} documents...`)
  for (let docsChunk of chunkedArray(splitDocs, options.embeddingChunkSize)) {
    combinedChunks = combinedChunks.concat(docsChunk)
  }
  vectorStore = await Chroma.fromDocuments(combinedChunks, embeddings, {
    collectionName: collectionName,
    url: 'http://chromadb:8000',
  })
  // }
  // vectorStore = await Chroma.fromExistingCollection(embeddings, {
  //   collectionName: collectionName,
  //   url: 'http://chromadb:8000',
  // })
  if (!vectorStore) {
    throw new Error('Failed to load vector store collection')
  }
  return vectorStore
}

async function loadSourceFiles(
  path: string = './data',
  embeddings: any
): Promise<Chroma> {
  console.log(`Loading source file names from ${path}...`)

  const loader = getDirectoryLoader(path)
  const docs = await loader.load()
  if (!docs.length) {
    throw new Error('No documents found in the specified directory')
  }
  const collectionName = 'sourceFiles'
  const filesStore = await Chroma.fromTexts(
    Array.from(new Set(docs.map((d) => d.metadata.source))),
    {},
    embeddings,
    {
      collectionName: collectionName,
      url: 'http://chromadb:8000',
    }
  )
  return filesStore
}

export {
  loadDataDirectory,
  loadSourceFiles,
  ingestWorker,
  setWebClients,
  workers,
}
