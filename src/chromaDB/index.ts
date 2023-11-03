import { ChromaClient } from "chromadb";

const chromaClient = new ChromaClient({
    path: "http://chromadb:8000",
  })

export default chromaClient