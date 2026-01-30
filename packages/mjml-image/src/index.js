import { min } from 'lodash'

import { BodyComponent } from 'mjml-core'

import widthParser from 'mjml-core/lib/helpers/widthParser'

export default class MjImage extends BodyComponent {
  static componentName = 'mj-image'

  static allowedAttributes = {
    alt: 'string',
    href: 'string',
    name: 'string',
    src: 'string',
    srcset: 'string',
    sizes: 'string',
    title: 'string',
    rel: 'string',
    align: 'enum(left,center,right)',
    border: 'string',
    'border-bottom': 'string',
    'border-left': 'string',
    'border-right': 'string',
    'border-top': 'string',
    'border-radius': 'unit(px,%){1,4}',
    'container-background-color': 'color',
    'fluid-on-mobile': 'boolean',
    padding: 'unit(px,%){1,4}',
    'padding-bottom': 'unit(px,%)',
    'padding-left': 'unit(px,%)',
    'padding-right': 'unit(px,%)',
    'padding-top': 'unit(px,%)',
    target: 'string',
    width: 'unit(px)',
    height: 'unit(px,auto)',
    'max-height': 'unit(px,%)',
    'font-size': 'unit(px)',
    usemap: 'string',
  }

  static defaultAttributes = {
    alt: '',
    align: 'center',
    border: '0',
    height: 'auto',
    padding: '10px 25px',
    target: '_blank',
    'font-size': '13px',
  }

  getStyles() {
    const width = this.getContentWidth()
    const fullWidth = this.getAttribute('full-width') === 'full-width'

    const { parsedWidth, unit } = widthParser(width)

    return {
      img: {
        border: this.getAttribute('border'),
        'border-left': this.getAttribute('border-left'),
        'border-right': this.getAttribute('border-right'),
        'border-top': this.getAttribute('border-top'),
        'border-bottom': this.getAttribute('border-bottom'),
        'border-radius': this.getAttribute('border-radius'),
        display: 'block',
        outline: 'none',
        'text-decoration': 'none',
        height: this.getAttribute('height'),
        'max-height': this.getAttribute('max-height'),
        'min-width': fullWidth ? '100%' : null,
        width: '100%',
        'max-width': fullWidth ? '100%' : null,
        'font-size': this.getAttribute('font-size'),
      },
      td: {
        width: fullWidth ? null : `${parsedWidth}${unit}`,
      },
      table: {
        'min-width': fullWidth ? '100%' : null,
        'max-width': fullWidth ? '100%' : null,
        width: fullWidth ? `${parsedWidth}${unit}` : null,
        'border-collapse': 'collapse',
        'border-spacing': '0px',
      },
    }
  }

  getContentWidth() {
    const width = this.getAttribute('width')
      ? parseInt(this.getAttribute('width'), 10)
      : Infinity

    const { box } = this.getBoxWidths()

    return min([box, width])
  }

  renderImage() {
    const width = this.getContentWidth()
    const heightAttr = this.getAttribute('height')
    // AMP requires numeric width and height; default height to width if auto/missing
    const height =
      heightAttr && heightAttr !== 'auto'
        ? parseInt(heightAttr, 10)
        : width

    const ampImg = `
      <amp-img
        ${this.htmlAttributes({
          alt: this.getAttribute('alt') ?? '',
          src: this.getAttribute('src'),
          width,
          height,
          layout: 'responsive',
          style: 'img',
          title: this.getAttribute('title'),
        })}
      ></amp-img>
    `

    if (this.getAttribute('href')) {
      return `
        <a
          ${this.htmlAttributes({
            href: this.getAttribute('href'),
            target: this.getAttribute('target'),
            rel: this.getAttribute('rel'),
            name: this.getAttribute('name'),
            title: this.getAttribute('title'),
          })}
        >
          ${ampImg}
        </a>
      `
    }

    return ampImg
  }

  headStyle = () => ''

  render() {
    return `
      <table
        ${this.htmlAttributes({
          border: '0',
          cellpadding: '0',
          cellspacing: '0',
          role: 'presentation',
          style: 'table',
          class: this.getAttribute('fluid-on-mobile')
            ? 'mj-full-width-mobile'
            : null,
        })}
      >
        <tbody>
          <tr>
            <td ${this.htmlAttributes({
              style: 'td',
              class: this.getAttribute('fluid-on-mobile')
                ? 'mj-full-width-mobile'
                : null,
            })}>
              ${this.renderImage()}
            </td>
          </tr>
        </tbody>
      </table>
    `
  }
}
