/**
 * 对生成的 AMP4EMAIL HTML 做规范校验。
 * 用法（项目根目录）:
 *   node scripts/validate-amp.js test/output/template12-amp.html
 *   node scripts/validate-amp.js   # 校验 test/output/template12-amp.html
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const defaultFile = path.join(root, 'test', 'output', 'template12-amp.html')
const file = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultFile

if (!fs.existsSync(file)) {
  console.error('文件不存在:', file)
  process.exit(1)
}

const ampValidator = require('amphtml-validator')
const html = fs.readFileSync(file, 'utf8')

ampValidator
  .getInstance()
  .then((validator) => {
    // AMP4EMAIL 必须用 AMP4EMAIL 格式校验
    const result = validator.validateString(html, 'AMP4EMAIL')
    console.log('AMP4EMAIL 校验:', result.status)
    if (result.status === 'PASS') {
      console.log('通过')
      process.exit(0)
    }
    console.log('错误数:', result.errors.length)
    result.errors.forEach((e, i) => {
      const loc = e.line != null ? ` line ${e.line}${e.col != null ? `, col ${e.col}` : ''}` : ''
      console.log(`  ${i + 1}. [${e.severity}]${loc}: ${e.message}`)
      if (e.specUrl) console.log('     ', e.specUrl)
    })
    process.exit(result.errors.some((e) => e.severity === 'ERROR') ? 1 : 0)
  })
  .catch((err) => {
    console.error('校验失败（如网络拉取 validator 失败）:', err.message)
    process.exit(1)
  })
