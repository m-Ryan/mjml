import { BodyComponent } from 'mjml-core'

export default class MjAccordion extends BodyComponent {
  static componentName = 'mj-accordion'

  static allowedAttributes = {
    'container-background-color': 'color',
    border: 'string',
    'font-family': 'string',
    'icon-align': 'enum(top,middle,bottom)',
    'icon-width': 'unit(px,%)',
    'icon-height': 'unit(px,%)',
    'icon-wrapped-url': 'string',
    'icon-wrapped-alt': 'string',
    'icon-unwrapped-url': 'string',
    'icon-unwrapped-alt': 'string',
    'icon-position': 'enum(left,right)',
    'padding-bottom': 'unit(px,%)',
    'padding-left': 'unit(px,%)',
    'padding-right': 'unit(px,%)',
    'padding-top': 'unit(px,%)',
    padding: 'unit(px,%){1,4}',
  }

  static defaultAttributes = {
    border: '2px solid black',
    'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
    'icon-align': 'middle',
    'icon-wrapped-url': 'https://i.imgur.com/bIXv1bk.png',
    'icon-wrapped-alt': '+',
    'icon-unwrapped-url': 'https://i.imgur.com/w4uTygT.png',
    'icon-unwrapped-alt': '-',
    'icon-position': 'right',
    'icon-height': '32px',
    'icon-width': '32px',
    padding: '10px 25px',
  }

  headStyle = () => ''

  getStyles() {
    return {
      accordion: {
        width: '100%',
        'font-family': this.getAttribute('font-family'),
      },
    }
  }

  getChildContext() {
    return {
      ...this.context,
      accordionFontFamily: this.getAttribute('font-family'),
    }
  }

  render() {
    const childrenAttr = [
      'border',
      'icon-align',
      'icon-width',
      'icon-height',
      'icon-position',
      'icon-wrapped-url',
      'icon-wrapped-alt',
      'icon-unwrapped-url',
      'icon-unwrapped-alt',
    ].reduce(
      (res, val) => ({
        ...res,
        [val]: this.getAttribute(val),
      }),
      {},
    )

    return `
      <amp-accordion
        ${this.htmlAttributes({
          class: 'mj-accordion',
          style: 'accordion',
        })}
      >
        ${this.renderChildren(this.props.children, {
          attributes: childrenAttr,
        })}
      </amp-accordion>
    `
  }
}
