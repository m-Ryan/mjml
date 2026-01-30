import { BodyComponent } from 'mjml-core'
import { find } from 'lodash'
import { initComponent } from 'mjml-core'
import AccordionText from './AccordionText'
import AccordionTitle from './AccordionTitle'

export default class MjAccordionElement extends BodyComponent {
  static componentName = 'mj-accordion-element'

  static allowedAttributes = {
    'background-color': 'color',
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
  }

  static defaultAttributes = {
    title: {
      img: {
        width: '32px',
        height: '32px',
      },
    },
  }

  getStyles() {
    return {
      section: {
        'background-color': this.getAttribute('background-color'),
      },
    }
  }

  getChildContext() {
    return {
      ...this.context,
      elementFontFamily: this.getAttribute('font-family'),
    }
  }

  render() {
    const { children } = this.props
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
    const context = this.getChildContext()

    const titleChild = find(children, { tagName: 'mj-accordion-title' })
    const textChild = find(children, { tagName: 'mj-accordion-text' })

    const titleComponent = titleChild
      ? initComponent({
          name: 'mj-accordion-title',
          initialDatas: {
            ...titleChild,
            attributes: { ...childrenAttr, ...titleChild.attributes },
            context,
          },
        })
      : new AccordionTitle({
          attributes: childrenAttr,
          context,
          props: { content: '' },
        })
    const textComponent = textChild
      ? initComponent({
          name: 'mj-accordion-text',
          initialDatas: {
            ...textChild,
            attributes: { ...childrenAttr, ...textChild.attributes },
            context,
          },
        })
      : new AccordionText({
          attributes: childrenAttr,
          context,
          props: { content: '' },
        })

    const titleHtml = titleComponent ? titleComponent.render() : ''
    const contentHtml = textComponent ? textComponent.render() : ''
    const otherChildren = (children || []).filter(
      (c) =>
        c.tagName !== 'mj-accordion-title' && c.tagName !== 'mj-accordion-text',
    )
    const otherHtml =
      otherChildren.length > 0
        ? this.renderChildren(otherChildren, { attributes: childrenAttr })
        : ''

    return `
      <section
        ${this.htmlAttributes({
          class: this.getAttribute('css-class'),
          style: 'section',
        })}
      >
        <h2>${titleHtml}</h2>
        <div>${contentHtml}${otherHtml}</div>
      </section>
    `
  }
}
