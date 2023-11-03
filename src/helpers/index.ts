import { Chroma } from 'langchain/vectorstores/chroma'
import { Document } from 'langchain/document'

const webClients: any = {}

/**
 * Retrieves the source of a file located at the specified path.
 *
 * @param {string} path - The path to the file.
 * @return {string} The first line of the file's contents without the prefix 'Page Source: '.
 */
async function getFileSource(path: string) {
  const text = await Bun.file(path).text()
  return text.split('\n')[0].replace('Page Source: ', '')
}

/**
 * Retrieves relevant files from the file store based on a given query.
 *
 * @param {Chroma} fileStore - The file store to search in.
 * @param {string} query - The query to search for.
 * @param {number} [contextFiles=2] - The number of context files to include.
 * @returns {Promise<Document[]>} - A promise that resolves to an array of relevant files.
 */
async function getRelevantFiles(
  fileStore: Chroma,
  query: string,
  contextFiles: number = 2
): Promise<Document[]> {
  const relevantFiles = await fileStore.similaritySearch(query, contextFiles)
  return relevantFiles
}

/**
 * Retrieves relevant documents from the document store based on a given query.
 *
 * @param {Chroma} docStore - The Chroma document store.
 * @param {string} query - The query string used to search for relevant documents.
 * @param {number} contextDocuments - The number of context documents to retrieve. Default value is 2.
 * @return {Promise<Document[]>} - A promise that resolves to an array of relevant documents.
 */
async function getRelevantDocuments(
  docStore: Chroma,
  query: string,
  contextDocuments: number = 2,
  filter: Record<string, any> = {}
): Promise<Document[]> {
  const relevantDocs = await docStore.similaritySearch(
    query,
    contextDocuments,
    filter
  )
  return relevantDocs
}

/**
 * Retrieves the relevant topics from a list of documents.
 *
 * @param {Document[]} relevantFiles - The list of documents containing relevant information.
 * @return {string[]} An array of relevant topics extracted from the documents.
 */
function getRelevantTopics(relevantFiles: Document[]) {
  const relevantTopics = relevantFiles.map(
    (f) => f.pageContent.split('-')[1].split('.')[0]
  )
  return relevantTopics
}

const wakeUpOllama = async () => {
  const res = await fetch('http://ollama-api:11434/api/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2',
      prompt: 'wake up ollama',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return await res.status
}

export {
  getFileSource,
  getRelevantFiles,
  getRelevantDocuments,
  getRelevantTopics,
  wakeUpOllama,
}
