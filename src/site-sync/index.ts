// const { Builder, By, Key, until } = require('selenium-webdriver')
const puppeteer = require('puppeteer')
const { mkdir } = require('fs').promises
const { existsSync } = require('fs')
const { savePageText, collectPageLinksRecursive } = require('./helpers')
const cliProgress = require('cli-progress')

// create a new progress bar instance and use shades_classic theme
const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic
)

const dataDir = process.env.DATA_DIR
async function syncSiteContent(
  siteUrl: string = '',
  singleUrl: boolean = true,
  abortSignal: AbortSignal
) {
  const baseUrl = siteUrl || process.env.BASE_URL
  if (!existsSync(dataDir)) await mkdir(dataDir)
  const urls: Set<string> = new Set()
  const processedUrls: Set<string> = new Set()
  const puppetBrowser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    userDataDir: `${__dirname}/chrome-profile`,
  })
  try {
    if (!singleUrl) {
      console.log('Collecting all Site page links...')
      await collectPageLinksRecursive(
        puppetBrowser,
        baseUrl,
        baseUrl,
        urls,
        processedUrls,
        abortSignal,
        25
      )
    }
    urls.add(siteUrl)
    console.log(`Syncing latest Site content (${urls.size} pages)...`)
    progressBar.start(urls.size, 0)
    const page = await puppetBrowser.newPage()
    // Save each page as text
    for (let url of urls) {
      if (abortSignal.aborted)
        return {
          success: false,
          message: 'Site download aborted.',
        }
      if (!(await page.url()).startsWith(url)) {
        await page.goto(url)
      }
      progressBar.update([...urls].indexOf(url) + 1)
      await savePageText(page, url, dataDir)
    }
    console.log('\nSuccessfully synced Site content.')
    return {
      success: true,
      message: 'Successfully ingested site content.',
      savedUrls: urls,
    }
  } catch (error: any) {
    console.error('An error occurred:', error)
    return {
      success: false,
      message: 'An error occurred ingesting the site content.',
      error: error,
    }
  } finally {
    progressBar.stop()
  }
}

// await syncSiteContent()

export default syncSiteContent
