import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Chroma } from 'langchain/vectorstores/chroma'
import chromaClient from '../chromaDB'

interface directoryLoadOptions {
  vectorCollectionName?: string
  chunkSize: number
  chunkOverlap: number
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
  options: directoryLoadOptions = { chunkSize: 1000, chunkOverlap: 200 }
): Promise<Chroma> {
  let vectorStore: Chroma
  const collectionName = options?.vectorCollectionName
    ? options.vectorCollectionName
    : 'dataSources'
  // await chromaClient.deleteCollection({ name: collectionName })
  const collections = await chromaClient.listCollections()
  if (!collections?.map((c) => c.name).includes(collectionName)) {
    const loader = getDirectoryLoader(path)
    console.log(`Loading and splitting documents from: ${path}...`)
    const docs = await loader.load()
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    })
    const splitDocs = await textSplitter.splitDocuments(docs)

    console.log(`Embedding ${splitDocs.length} documents...`)
    vectorStore = await Chroma.fromDocuments(splitDocs, embeddings, {
      collectionName: collectionName,
      url: 'http://chromadb:8000',
    })
  } else {
    console.log(`Using existing collection: ${collectionName}`)
    vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: collectionName,
      url: 'http://chromadb:8000',
    })
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
  await chromaClient.deleteCollection({ name: 'sourceFiles' })
  const filesStore = await Chroma.fromTexts(
    Array.from(new Set(docs.map((d) => d.metadata.source))),
    {},
    embeddings,
    {
      collectionName: 'sourceFiles',
      url: 'http://chromadb:8000',
    }
  )
  return filesStore
}

export { loadDataDirectory, loadSourceFiles }
