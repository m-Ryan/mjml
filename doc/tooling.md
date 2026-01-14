# Tooling

In order to provide you with the best experience with MJML and help you use it more efficiently, we've developed some tools to integrate it seamlessly in your development workflow:

## Visual Studio Code

[Visual Studio Code](https://code.visualstudio.com/) is a free code editor made by [Microsoft](https://www.microsoft.com/). We recommend this package as it is among the most feature-rich MJML plugins for code editors with live previews, syntax highlighting and linting as well as export features including HTML and screenshots. It is available [on Github](https://github.com/mjmlio/vscode-mjml) and through the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=mjmlio.vscode-mjml).

## Parcel

[Parcel](https://parcel.io) is the code editor built for email. This feature packed tool includes syntax highlighting, Emmet, inline documentation, autocomplete, live preview, screenshots, and full MJML, CSS, and HTML validation. Use Focus Mode to keep the preview aligned with the code you're working on, or Inspect Element to easily find the code that produces specific elements in the preview. Export MJML to HTML with a click.

## Atom language plugin

[Atom](https://atom.io) is a powerful text editor originally released by [Github](https://github.com). This package provides autocompletion and syntax highlighting for MJML. It is available [on Github](https://github.com/mjmlio/language-mjml) and through the [Atom Package Manager (APM)](https://atom.io/packages/language-mjml).

## Atom linter

In addition to the language plugin, a linter is available to highlight errors in MJML. The linter is available [on Github](https://github.com/mjmlio/atom-linter-mjml) and through the [Atom Package Manager (APM)](https://atom.io/packages/linter-mjml).

## Sublime Text

[Sublime Text](https://www.sublimetext.com/) is a powerful text editor. We're providing you with a package to color MJML tags. It is available [on Github](https://github.com/mjmlio/mjml-syntax) and through the [Sublime Package Control](https://packagecontrol.io/packages/MJML-syntax).

## IntelliJ IDEA Plugin - MJML Support

[IntelliJ IDEA](https://www.jetbrains.com/idea/) is an IDE developed by JetBrains. The plugin provides you with a (near) realtime preview, auto complete, inline documentation and code analysis. Its available on the [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/16418-mjml-support).

## Gradle Plugin - MJML Compilation
[Gradle](https://gradle.org/) is a build tool for a various set of languages and environments, mainly used for java/kotlin. The plugin provides an easy way to embed your mjml templates to your java/kotlin application in its resources in precompiled form (html). 
It's available through the gradle plugin system [io.freefair.mjml.java](https://plugins.gradle.org/plugin/io.freefair.mjml.java) and documentation is available here [FreeFair User Guide](https://docs.freefair.io/gradle-plugins/current/reference/)

## Gulp

Gulp is a tool designed to help you automate and enhance your workflow. Our plugin enables you to plug the MJML translation engine into your workflow, helping you to streamline your development workflow. It is available here on [Github](https://github.com/mjmlio/gulp-mjml)

## Neos CMS

[Neos CMS](https://www.neos.io/) is a content management system that combines structured content with application. This package adds the helper for compiling `MJML` markup as well as some prototypes which allow to use TailwindCSS like classes in your `MJML` markup. It is available on [packagist](https://packagist.org/packages/garagist/mjml)

## Easy-email

[Easy-email](https://github.com/zalify/easy-email) is a Drag-and-Drop Email Editor based on MJML. Transform structured JSON data into major email clients compatible HTML. Written in Typescript and supported both in browser and Node.js.

## Contribute to the MJML ecosystem

The MJML ecosystem is still young and we're also counting on your help to help us make it grow and provide its community with even more awesome tools, always aiming to making development with MJML an efficient and fun process!

Getting involved is really easy. If you want to contribute, feel free to [open an issue](https://github.com/mjmlio/mjml/issues) or [submit a pull-request](https://github.com/mjmlio/mjml/pulls)!

## Template Tokens in CSS

MJML can safely minify HTML and CSS while preserving template tokens embedded in CSS. This is useful when your templating system (Liquid, Handlebars, etc.) injects dynamic values into style attributes or `<style>` blocks.

- Supported contexts: CSS value tokens (`color: {{primary}}`) and CSS property-name tokens (`{{prop}}: {{value}}`), as well as block tokens inside style contexts.
- Enable sanitization: pass `sanitizeStyles: true` when you also enable `minify: true`. Configure token wrappers with `templateSyntax` (array of `{ prefix, suffix }` pairs, defaults to `{{…}}` and `[[…]]`).
- Mixed syntax: by default MJML disallows mixing block tokens with CSS tokens in the same document. Opt-in via `allowMixedSyntax: true` if you need to mix.
- Broken delimiters pre-check: MJML fails fast when it detects unbalanced token delimiters inside CSS (e.g. more `{{` than `}}`). Fix your tokens or disable CSS minification.

### CLI examples

- Preserve CSS tokens while minifying:

```bash
mjml input.mjml -o out.html --config.sanitizeStyles true --config.minify true
```

- Allow mixed syntax:

```bash
mjml input.mjml -o out.html --config.sanitizeStyles true --config.minify true --config.allowMixedSyntax true
```

- Disable CSS minification (to bypass token pre-check/minifier):

```bash
mjml input.mjml -o out.html --config.minify true --config.minifyOptions '{"minifyCss": false}'
```

### Programmatic usage

```js
const { html } = mjml(input, {
	minify: true,
	sanitizeStyles: true,
	templateSyntax: [
		{ prefix: '{{', suffix: '}}' },
		{ prefix: '[[', suffix: ']]' },
	],
	allowMixedSyntax: false, // set true to allow block + CSS tokens together
	// Disable CSS minify if your tokens are broken or your minifier cannot parse them:
	minifyOptions: { minifyCss: false },
})
```

For the canonical list of CLI flags and Node.js options, see [Usage](https://documentation.mjml.io/#usage)
