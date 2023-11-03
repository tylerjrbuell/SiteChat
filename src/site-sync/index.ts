const { Builder, By, Key, until } = require('selenium-webdriver')
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
const baseUrl = process.env.BASE_URL
const dataDir = process.env.DATA_DIR

async function syncSiteContent() {
  const urls: Array<string> = []
  const chromeOptions = new chrome.Options().headless()
  chromeOptions.addArguments(`user-data-dir=${__dirname}/chrome-profile`)
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build()
  try {
    await driver.get(baseUrl)
    if (!(await driver.getCurrentUrl()).startsWith(baseUrl)) {
      console.log('Login is required, please approve the 2FA login prompt.')
      await driver
        .findElement(By.name('identifier'))
        .sendKeys(username, Key.RETURN)
      // Wait until the password field is visible and interactable
      await driver.wait(until.elementLocated(By.name('Passwd')), 10000)
      await driver.wait(
        until.elementIsVisible(driver.findElement(By.name('Passwd'))),
        10000
      )
      await driver.wait(
        until.elementIsEnabled(driver.findElement(By.name('Passwd'))),
        10000
      )

      // Scroll the password field into view if necessary
      const passwordField = await driver.findElement(By.name('Passwd'))
      await driver.executeScript(
        'arguments[0].scrollIntoView(true);',
        passwordField
      )
      await passwordField.sendKeys(password, Key.RETURN)
      // Perform 2-factor authentication manually
      // Wait for the user to complete 2-factor authentication
      // Once 2-factor authentication is completed, navigate to the desired page
    }
    await driver.wait(until.urlIs(baseUrl), 8000)
    console.log('\nLogged in successfully.')
    // Get all the links on the page
    const elements = await driver.findElements(By.tagName('a'))
    console.log('Collecting all Site page links...')
    for (let element of elements) {
      const href = await element.getAttribute('href')
      const pageUrl = href.split('#')[0]
      if (pageUrl && pageUrl.startsWith(baseUrl) && !urls.includes(pageUrl)) {
        urls.push(pageUrl)
      }
    }
    console.log(`Syncing latest Site content (${urls.length} pages)...`)
    progressBar.start(urls.length, 0)
    // Save each page as text
    for (let url of urls) {
      progressBar.update(urls.indexOf(url) + 1)
      await savePageText(driver, url, dataDir)
    }
    console.log('\nSuccessfully synced Site content.')
  } catch (error) {
    console.error('An error occurred:', error)
  } finally {
    progressBar.stop()
    await driver.quit()
  }
}

await syncSiteContent()

export default syncSiteContent
