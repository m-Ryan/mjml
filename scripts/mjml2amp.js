#!/usr/bin/env node
/**
 * MJML → AMP4EMAIL 转换脚本。
 * 用法（项目根目录）:
 *   node scripts/mjml2amp.js                    # 转换 test/template12.mjml
 *   node scripts/mjml2amp.js test/template12.mjml
 *   node scripts/mjml2amp.js test/template12.mjml -o out.html
 *   node scripts/mjml2amp.js test/template12.mjml --validate
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const mjmlCore = require(path.join(root, 'packages/mjml-core/lib'))
const mjml2html = mjmlCore.default || mjmlCore
const ampPreset = require(path.join(root, 'packages/mjml/test/amp-preset.js'))

const defaultInput = path.join(root, 'test', 'template12.mjml')
const defaultOutDir = path.join(root, 'test', 'output')

function parseArgs() {
  const args = process.argv.slice(2)
  let input = defaultInput
  let output = null
  let validate = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' || args[i] === '--output') {
      output = args[i + 1]
      i += 1
    } else if (args[i] === '--validate' || args[i] === '-v') {
      validate = true
    } else if (!args[i].startsWith('-')) {
      input = path.isAbsolute(args[i]) ? args[i] : path.resolve(process.cwd(), args[i])
    }
  }
  if (!output) {
    const base = path.basename(input, path.extname(input))
    output = path.join(defaultOutDir, `${base}-amp.html`)
  }
  return { input, output, validate }
}

async function run() {
  const { input, output, validate } = parseArgs()

  if (!fs.existsSync(input)) {
    console.error('输入文件不存在:', input)
    process.exit(1)
  }

  const mjml = fs.readFileSync(input, 'utf8')
  const result = await mjml2html(mjml, {
    presets: [ampPreset],
    validationLevel: 'skip',
  })

  if (result.errors && result.errors.length) {
    result.errors.forEach((e) => console.warn('MJML:', e.formattedMessage))
  }

  const html = result.html
  if (output === '-' || output === 'stdout') {
    process.stdout.write(html)
  } else {
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, html, 'utf8')
    console.log('AMP 已写入:', path.relative(root, output))
  }

  if (validate && output !== '-' && output !== 'stdout') {
    try {
      const ampValidator = require('amphtml-validator')
      const validator = await ampValidator.getInstance()
      const res = validator.validateString(html, 'AMP4EMAIL')
      if (res.status === 'PASS') {
        console.log('AMP4EMAIL 校验: PASS')
      } else {
        console.error('AMP4EMAIL 校验: FAIL')
        res.errors.forEach((e) => console.error(' ', e.line, e.message))
        process.exit(1)
      }
    } catch (err) {
      console.warn('校验跳过:', err.message)
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
