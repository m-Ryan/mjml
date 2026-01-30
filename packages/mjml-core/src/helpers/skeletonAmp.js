import { negate, isNil } from 'lodash'

/**
 * AMP for Email document skeleton.
 * Outputs <!doctype html>, <html ⚡4email>, head with required AMP markup,
 * and a single <style amp-custom> for all custom CSS.
 */
export default function skeletonAmp(options) {
  const {
    beforeDoctype = '',
    content = '',
    headRaw = [],
    title = '',
    lang = 'und',
    dir = 'auto',
    ampCustomCss = '',
    fontsHtml = '',
  } = options

  return `${beforeDoctype ? `${beforeDoctype}\n` : ''}<!doctype html>
<html ⚡4email data-css-strict lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style amp4email-boilerplate>body{visibility:hidden}</style>
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    ${ampCustomCss ? `<style amp-custom>${ampCustomCss}</style>` : ''}
    ${fontsHtml}
    ${headRaw.filter(negate(isNil)).join('\n')}
  </head>
  ${content}
</html>
`
}
