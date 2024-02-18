const { writeFile } = require('fs').promises
const puppeteer = require('puppeteer')

async function savePageText(
  page: any,
  url: string = '',
  path: string = './data'
) {
  try {
    await page.goto(url)
    const pageTitle = await page.title()
    const fileName = pageTitle
      ? pageTitle.replace(/[/\\?%*:|"<>]/g, '')
      : url
          .split('://')
          .pop()
          .replace(/[/\\?%*:|"<>]/g, '-') // Remove invalid characters from the title
    const pageText = `Page Source: ${url}\n${await page.evaluate(
      () => document.body.innerText
    )}`
    await writeFile(`${path}/${fileName}.txt`, pageText)
    // console.log(`Saved ${fileName}.txt`);
  } catch (error) {
    console.error(`Error occurred while processing ${url}`, error)
  }
}
async function savePageAsPDF(page: any, url: string, path: string) {
  try {
    await page.goto(url)
    const pageTitle = await page.title()
    const fileName = pageTitle.replace(/[/\\?%*:|"<>]/g, '')
    const htmlContent = await page.source()
    const puppetBrowser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      userDataDir: `${__dirname}/chrome-profile`,
    })
    await page.setContent(htmlContent)
    const pdfBuffer = await page.pdf({ format: 'letter', scale: 1 })
    await writeFile(`${path}/${fileName}.pdf`, pdfBuffer)
    console.log(`Saved ${fileName}.pdf`)
    await puppetBrowser.close()
  } catch (error) {
    console.error(`Error occurred while processing ${url}`, error)
  }
}

async function collectPageLinksRecursive(
  browser: any,
  baseUrl: string,
  currentUrl: string = '',
  collectedUrls: Set<string>,
  visitedUrls: Set<string>,
  abortSignal: AbortSignal,
  limit: number = 10
) {
  if (visitedUrls.has(currentUrl) || abortSignal.aborted) return
  console.log(`Processing: ${currentUrl}`)
  const page = await browser.newPage()
  await page.goto(currentUrl)
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map((link) => link.href)
  })
  visitedUrls.add(currentUrl)
  for (let link of links) {
    if ((limit && collectedUrls.size >= limit) || abortSignal.aborted) break
    const pageUrl = link?.split('#')[0]
    try {
      if (pageUrl && pageUrl.includes(baseUrl) && !collectedUrls.has(pageUrl)) {
        collectedUrls.add(pageUrl)
        console.log(`Collected ${pageUrl}`)
        await collectPageLinksRecursive(
          browser,
          baseUrl,
          pageUrl,
          collectedUrls,
          visitedUrls,
          abortSignal,
          limit
        )
      }
    } catch (error: any) {
      console.error('An error occurred skipping link', error.message)
      console.log(pageUrl)
      continue
    }
  }
}

export { collectPageLinksRecursive, savePageText, savePageAsPDF }
