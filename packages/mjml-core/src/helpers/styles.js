import { isFunction } from 'lodash'

export function buildStyleFromComponents(
  breakpoint,
  componentsHeadStyles,
  headStylesObject,
) {
  const headStyles = Object.values(headStylesObject)

  if (componentsHeadStyles.length === 0 && headStyles.length === 0) {
    return ''
  }

  return `
    <style type="text/css">${[...componentsHeadStyles, ...headStyles].reduce(
      (result, styleFunction) => `${result}\n${styleFunction(breakpoint)}`,
      '',
    )}
    </style>`
}

export function buildStyleFromTags(breakpoint, styles) {
  if (styles.length === 0) {
    return ''
  }

  return ` 
    <style type="text/css">${styles.reduce(
      (result, style) =>
        `${result}\n${isFunction(style) ? style(breakpoint) : style}`,
      '',
    )}
    </style>`
}

/**
 * Returns raw CSS string for AMP <style amp-custom> (no wrapper).
 */
export function buildAmpCustomCssContent(
  breakpoint,
  componentsHeadStyles,
  headStylesObject,
  styles,
) {
  const parts = []
  const headStyles = Object.values(headStylesObject || {})
  if (componentsHeadStyles.length > 0 || headStyles.length > 0) {
    parts.push(
      [...componentsHeadStyles, ...headStyles].reduce(
        (result, styleFunction) => `${result}\n${styleFunction(breakpoint)}`,
        '',
      ),
    )
  }
  if (styles && styles.length > 0) {
    parts.push(
      styles.reduce(
        (result, style) =>
          `${result}\n${isFunction(style) ? style(breakpoint) : style}`,
        '',
      ),
    )
  }
  return parts.join('\n').trim()
}

