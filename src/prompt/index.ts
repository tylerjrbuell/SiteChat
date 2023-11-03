function generatePrompt(
  question: string,
  context: string,
  relevantTopics: string[] = [],
  relevantSources: string[] = [],
  systemMessage: string | undefined = undefined
): string {
  const defaultPrompt = `
The context has info on the following topics: ${relevantTopics.join(', ')}
Context: ${context}
Question: ${question}
Sources: ${relevantSources.join('\n')}
`
  if (!systemMessage) return defaultPrompt

  return `${systemMessage}\n
The context has info on the following topics: ${relevantTopics.join(', ')}
Context: ${context}
Question: ${question}
Sources: ${relevantSources.join('\n')}`
}

export { generatePrompt }
