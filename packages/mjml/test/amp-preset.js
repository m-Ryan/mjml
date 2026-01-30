/**
 * Preset that requires AMP-built components from local workspace packages.
 * Use in AMP tests so we test the built mjml-image (amp-img), mjml-accordion (amp-accordion), etc.
 */
const path = require('path')

const base = path.join(__dirname, '../..')

function def(pkg) {
  const m = require(pkg)
  return m.default != null ? m.default : m
}

const Body = def(path.join(base, 'mjml-body/lib'))
const Head = def(path.join(base, 'mjml-head/lib'))
const HeadAttributes = def(path.join(base, 'mjml-head-attributes/lib'))
const HeadBreakpoint = def(path.join(base, 'mjml-head-breakpoint/lib'))
const HeadHtmlAttributes = def(path.join(base, 'mjml-head-html-attributes/lib'))
const HeadFont = def(path.join(base, 'mjml-head-font/lib'))
const HeadPreview = def(path.join(base, 'mjml-head-preview/lib'))
const HeadStyle = def(path.join(base, 'mjml-head-style/lib'))
const HeadTitle = def(path.join(base, 'mjml-head-title/lib'))
const Hero = def(path.join(base, 'mjml-hero/lib'))
const Button = def(path.join(base, 'mjml-button/lib'))
const Column = def(path.join(base, 'mjml-column/lib'))
const Divider = def(path.join(base, 'mjml-divider/lib'))
const Group = def(path.join(base, 'mjml-group/lib'))
const Image = def(path.join(base, 'mjml-image/lib'))
const Raw = def(path.join(base, 'mjml-raw/lib'))
const Section = def(path.join(base, 'mjml-section/lib'))
const Spacer = def(path.join(base, 'mjml-spacer/lib'))
const Text = def(path.join(base, 'mjml-text/lib'))
const Table = def(path.join(base, 'mjml-table/lib'))
const Wrapper = def(path.join(base, 'mjml-wrapper/lib'))

const socialPkg = require(path.join(base, 'mjml-social/lib'))
const Social = socialPkg.Social || socialPkg.default
const SocialElement = socialPkg.SocialElement || socialPkg.default

const navbarPkg = require(path.join(base, 'mjml-navbar/lib'))
const Navbar = navbarPkg.Navbar || navbarPkg.default
const NavbarLink = navbarPkg.NavbarLink || navbarPkg.default

const carouselPkg = require(path.join(base, 'mjml-carousel/lib'))
const Carousel = carouselPkg.Carousel || carouselPkg.default
const CarouselImage = carouselPkg.CarouselImage || carouselPkg.default

const accordionPkg = require(path.join(base, 'mjml-accordion/lib'))
const Accordion = accordionPkg.Accordion || accordionPkg.default
const AccordionElement = accordionPkg.AccordionElement || accordionPkg.default
const AccordionText = accordionPkg.AccordionText || accordionPkg.default
const AccordionTitle = accordionPkg.AccordionTitle || accordionPkg.default

const presetCore = require(path.join(base, 'mjml-preset-core/lib'))
const dependencies = (presetCore.default || presetCore).dependencies

const components = [
  Body,
  Head,
  HeadAttributes,
  HeadBreakpoint,
  HeadHtmlAttributes,
  HeadFont,
  HeadPreview,
  HeadStyle,
  HeadTitle,
  Hero,
  Button,
  Column,
  Divider,
  Group,
  Image,
  Raw,
  Section,
  Spacer,
  Text,
  Table,
  Wrapper,
  Social,
  SocialElement,
  Navbar,
  NavbarLink,
  Accordion,
  AccordionElement,
  AccordionText,
  AccordionTitle,
  Carousel,
  CarouselImage,
].filter(Boolean)

module.exports = { components, dependencies }
