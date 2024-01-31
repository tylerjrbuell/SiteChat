import { ChromaClient } from "chromadb";
import { Chroma } from "langchain/vectorstores/chroma";

const chromaClient = new ChromaClient({
  path: "http://chromadb:8000"
});

const getChroma = async (embeddings: any, {
  url = 'http://chromadb:8000',
  collectionName = 'dataSources'
} = {}) => {
  return new Chroma(embeddings, {
    url,
    collectionName
  })
}

export { chromaClient, getChroma };