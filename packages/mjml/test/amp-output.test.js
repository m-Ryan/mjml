const path = require('path')
const chai = require('chai')
// Use local built workspace packages so AMP changes are tested
const mjmlCore = require(path.join(__dirname, '../../mjml-core/lib'))
const mjml2htmlCore = mjmlCore.default || mjmlCore
const ampPreset = require(path.join(__dirname, './amp-preset'))
const { assignComponents, components } = mjmlCore
assignComponents(components, ampPreset.components)
const { assignDependencies, dependencies } = require('mjml-validator')
assignDependencies(dependencies, ampPreset.dependencies)

async function mjml(input, options = {}) {
  return mjml2htmlCore(input, options)
}

describe('AMP Email output', function () {
  it('should output AMP document with ⚡4email root', async function () {
    const input = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Hello</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
    `
    const { html } = await mjml(input)
    chai.expect(html).to.include('⚡4email')
    chai.expect(html).to.include('<!doctype html>')
    chai.expect(html).to.include('<meta charset="utf-8">')
    chai.expect(html).to.include('amp4email-boilerplate')
    chai.expect(html).to.include('cdn.ampproject.org/v0.js')
  })

  it('should output amp-img for mj-image', async function () {
    const input = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-image src="https://example.com/img.png" width="200" />
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
    `
    const { html } = await mjml(input)
    chai.expect(html).to.include('<amp-img')
    chai.expect(html).to.include('layout="responsive"')
    chai.expect(html).not.to.include('<img ')
  })

  it('should output amp-accordion for mj-accordion', async function () {
    const input = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-accordion>
              <mj-accordion-element>
                <mj-accordion-title>Title</mj-accordion-title>
                <mj-accordion-text>Content</mj-accordion-text>
              </mj-accordion-element>
            </mj-accordion>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
    `
    const { html } = await mjml(input)
    chai.expect(html).to.include('<amp-accordion')
    chai.expect(html).to.include('<h2>')
  })

  it('should output amp-carousel for mj-carousel', async function () {
    const input = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-carousel>
              <mj-carousel-image src="https://example.com/1.png" />
              <mj-carousel-image src="https://example.com/2.png" />
            </mj-carousel>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
    `
    const { html } = await mjml(input)
    chai.expect(html).to.include('<amp-carousel')
    chai.expect(html).to.include('type="slides"')
    chai.expect(html).to.include('<amp-img')
  })

  it('should output amp-img for mj-social icons', async function () {
    const input = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-social>
              <mj-social-element name="facebook" href="https://facebook.com" />
            </mj-social>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
    `
    const { html } = await mjml(input)
    chai.expect(html).to.include('<amp-img')
  })

  it('should have single style amp-custom in head', async function () {
    const input = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Test</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
    `
    const { html } = await mjml(input)
    const ampCustomCount = (html.match(/<style amp-custom>/g) || []).length
    chai.expect(ampCustomCount).to.equal(1)
  })
})
