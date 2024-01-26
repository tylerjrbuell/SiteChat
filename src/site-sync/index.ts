const { Builder, By, Key, until } = require('selenium-webdriver')
const { mkdir, stat } = require('fs').promises
const { existsSync } = require('fs')
const { savePageText } = require('./helpers')
const chrome = require('selenium-webdriver/chrome')
const cliProgress = require('cli-progress')
// create a new progress bar instance and use shades_classic theme
const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic
)

const username = process.env.USERNAME
const password = process.env.PASSWORD
const dataDir = process.env.DATA_DIR
async function syncSiteContent(siteUrl: string = '', singleUrl: boolean = true, abortSignal: AbortSignal) {
  const baseUrl = siteUrl || process.env.BASE_URL
  if (!existsSync(dataDir)) await mkdir(dataDir)
  const urls: Array<string> = []
  const chromeOptions = new chrome.Options().headless()
  chromeOptions.addArguments(`user-data-dir=${__dirname}/chrome-profile`)
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build()
  try {
    await driver.get(baseUrl)
    // if (!(await driver.getCurrentUrl()).startsWith(baseUrl)) {
    //   console.log('Login is required, please approve the 2FA login prompt.')
    //   await driver
    //     .findElement(By.name('identifier'))
    //     .sendKeys(username, Key.RETURN)
    //   // Wait until the password field is visible and interactable
    //   await driver.wait(until.elementLocated(By.name('Passwd')), 10000)
    //   await driver.wait(
    //     until.elementIsVisible(driver.findElement(By.name('Passwd'))),
    //     10000
    //   )
    //   await driver.wait(
    //     until.elementIsEnabled(driver.findElement(By.name('Passwd'))),
    //     10000
    //   )

    //   // Scroll the password field into view if necessary
    //   const passwordField = await driver.findElement(By.name('Passwd'))
    //   await driver.executeScript(
    //     'arguments[0].scrollIntoView(true);',
    //     passwordField
    //   )
    //   await passwordField.sendKeys(password, Key.RETURN)
    //   // Perform 2-factor authentication manually
    //   // Wait for the user to complete 2-factor authentication
    //   // Once 2-factor authentication is completed, navigate to the desired page
    // }
    console.log('\nLogged in successfully.')
    if (!singleUrl) {
      // Get all the links on the page
      const elements = await driver.findElements(By.tagName('a'))
      console.log('Collecting all Site page links...')
      for (let element of elements) {
        try {
          if (abortSignal.aborted) return {
            success: false,
            message: 'Site download aborted.',
          }
          const href = await element.getAttribute('href')
          const pageUrl = href.split('#')[0]
          if (pageUrl && pageUrl.startsWith(baseUrl) && !urls.includes(pageUrl)) {
            urls.push(pageUrl)
          }
        } catch (error) {
          console.error('An error occurred skipping link')
        }
      }
    }
    urls.push(siteUrl)
    console.log(`Syncing latest Site content (${urls.length} pages)...`)
    progressBar.start(urls.length, 0)
    // Save each page as text
    for (let url of urls) {
      if (abortSignal.aborted) return {
        success: false,
        message: 'Site download aborted.',
      }
      if (!(await driver.getCurrentUrl()).startsWith(url)) {
        await driver.get(url)
      }
      progressBar.update(urls.indexOf(url) + 1)
      await savePageText(driver, url, dataDir)
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
    await driver.quit()
  }
}



// await syncSiteContent()

export default syncSiteContent
