/**
 * Generate screenshots from MJML → standard HTML (non-AMP).
 * Usage (from project root):
 *   node scripts/screenshot-mjml.js
 *   node scripts/screenshot-mjml.js test/template1.mjml
 *   node scripts/screenshot-mjml.js test/template1.mjml test/template2.mjml
 * Output: test/output/screenshots-mjml/<name>.png
 */
const fs = require('fs')
const path = require('path')
const mjml2html = require('mjml')
const puppeteer = require('puppeteer')

const root = path.resolve(__dirname, '..')
const skeletonHtml = require(path.join(root, 'packages/mjml-core/lib/helpers/skeleton'))
const skeleton = skeletonHtml.default || skeletonHtml

const OUTPUT_DIR = path.join(root, 'test', 'output', 'screenshots-mjml')

function getChromePath() {
  if (process.platform === 'darwin') {
    const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if (fs.existsSync(p)) return p
    const canary = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    if (fs.existsSync(canary)) return canary
  }
  if (process.platform === 'win32') {
    const p = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
    if (p && fs.existsSync(p)) return p
  }
  if (process.platform === 'linux') {
    const candidates = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    for (const c of candidates) {
      if (fs.existsSync(c)) return c
    }
  }
  return undefined
}

const chromePath = getChromePath()

async function getScreenshot(mjml, options = {}) {
  const result = await mjml2html(mjml, { skeleton, ...options })
  if (options.validationLevel !== 'skip' && result.errors && result.errors.length) {
    throw new Error(result.errors.map((e) => e.formattedMessage).join('; '))
  }
  const html = result.html

  const launchOptions = { headless: true }
  if (chromePath) launchOptions.executablePath = chromePath
  const browser = await puppeteer.launch(launchOptions)
  const page = await browser.newPage()

  await page.setContent(html, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  })


  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    };
  });
  page.setViewport(dimensions);


  const buffer = await page.screenshot({ type: 'png', encoding: 'binary' })
  await browser.close()
  return buffer
}

async function run() {
  const args = process.argv.slice(2)
  let files
  if (args.length > 0) {
    files = args.map((f) => (path.isAbsolute(f) ? f : path.join(root, f)))
  } else {
    const testDir = path.join(root, 'test')
    files = fs
      .readdirSync(testDir)
      .filter((f) => /^template\d+\.mjml$/.test(f))
      .map((f) => path.join(testDir, f))
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const filters =files.filter((_, index) => index <=2)

  for (const filePath of filters) {
    const name = path.basename(filePath, path.extname(filePath))
    if (!fs.existsSync(filePath)) {
      console.warn('Skip (not found):', filePath)
      continue
    }
    const mjmlSource = fs.readFileSync(filePath, 'utf8')
    try {
      const png = await getScreenshot(mjmlSource)
      const outPath = path.join(OUTPUT_DIR, `${name}.png`)
      fs.writeFileSync(outPath, png)
      console.log('OK', name, '->', path.relative(root, outPath))
    } catch (err) {
      console.warn(name, 'screenshot failed:', err.message)
    }
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { getScreenshot }
