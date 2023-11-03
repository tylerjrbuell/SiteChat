async function getInstalledModels(
    ollamaUrl: string = 'http://ollama-api:11434'
) {
    return await (await fetch(`${ollamaUrl}/api/tags`)).json()
}

async function verifyModel(model: string) {
    console.log(`Verifying model: ${model}`)
    const installedModels = await getInstalledModels()
    if (!installedModels.models?.some((m: any) => m.name.includes(model))) {
        throw new Error(
            `Missing Ollama model: ${model}. Please use one of the currently installed models: (${
                installedModels.models?.map((m: any) => m.name).join(', ') || []
            })`
        )
    }
    return true
}

export { getInstalledModels, verifyModel }
