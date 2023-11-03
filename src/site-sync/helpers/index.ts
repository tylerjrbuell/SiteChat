const { writeFile } = require('fs').promises
const { By } = require('selenium-webdriver')
const puppeteer = require('puppeteer')

async function savePageText(driver: any, url: string, path: string = './data') {
  try {
    await driver.get(url)
    const pageTitle = await driver.getTitle()
    // console.log(`Processing ${url} -> ${pageTitle}`);
    const fileName = pageTitle.replace(/[/\\?%*:|"<>]/g, '') // Remove invalid characters from the title
    let body = await driver.findElement(By.tagName('body'))
    const pageText = `Page Source: ${url}\n${await body.getText()}`
    await writeFile(`${path}/${fileName}.txt`, pageText)
    // console.log(`Saved ${fileName}.txt`);
  } catch (error) {
    console.error(`Error occurred while processing ${url}`, error)
  }
}
async function savePageAsPDF(driver: any, url: string, path: string) {
  try {
    await driver.get(url)
    const pageTitle = await driver.getTitle()
    // console.log(`Processing ${url} -> ${pageTitle}`);
    const fileName = pageTitle.replace(/[/\\?%*:|"<>]/g, '')
    const htmlContent = await driver.getPageSource()
    const puppetBrowser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      userDataDir: `${__dirname}/chrome-profile`,
    })
    const page = await puppetBrowser.newPage()
    await page.setContent(htmlContent)
    const pdfBuffer = await page.pdf({ format: 'letter', scale: 1 })
    await writeFile(`${path}/${fileName}.pdf`, pdfBuffer)
    // console.log(`Saved ${fileName}.pdf`);
    await puppetBrowser.close()
  } catch (error) {
    console.error(`Error occurred while processing ${url}`, error)
  }
}

export { savePageText, savePageAsPDF }
