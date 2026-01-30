# Block: 布局与其它组件（section / column / text / button / divider / spacer / table / wrapper / group / hero / raw）

## 怎么转换

- **当前**：这些组件主要输出 **table / tr / td / div / a / span / p** 以及内联 style，用于排版、间距、背景色、按钮、分割线、表格、多列等；**不涉及 `<img>`、checkbox、radio**。
- **改为 AMP 专用**：
  - 原则上**不改组件名和结构**，仅保证产出标签在 [AMP for Email 允许的 HTML](https://github.com/ampproject/amphtml/blob/master/docs/spec/email/amp-email-html.md) 内。
  - **mj-section / mj-column / mj-wrapper / mj-group**：多为 table 布局 + 内联样式，AMP 一般允许；若有 `background-url` 等需确认 AMP 是否允许在对应元素上使用。
  - **mj-text**：输出 HTML 片段（如 `<p>`、`<a>` 等）；需避免产出 AMP 禁止标签（如 `<form>`、`<script>`、`<iframe>` 等），若用户通过 mj-raw 或富文本注入则需在文档中说明风险。
  - **mj-button**：通常为 `<a>` 或 `<table>` 模拟按钮；AMP 允许 `<a>`，**可保留**。
  - **mj-divider / mj-spacer**：表格行 + border 或 padding，无禁止项则**可保留**。
  - **mj-table**：输出 `<table>`；AMP 允许 table，注意不要产出 `style` 中禁止的属性。
  - **mj-hero**：若内含固定背景图或复杂结构，需对照 AMP 规范；若仅背景色 + 内容，一般可保留。
  - **mj-raw**：用户自定义 HTML；**无法保证用户内容符合 AMP**，需在文档中明确说明「mj-raw 在 AMP 输出下必须自行保证合规，否则校验会失败」。

## 涉及文件

- `packages/mjml-section`、`mjml-column`、`mjml-text`、`mjml-button`、`mjml-divider`、`mjml-spacer`、`mjml-table`、`mjml-wrapper`、`mjml-group`、`mjml-hero`、`mjml-raw` 等（按需微调，多数为「校验通过再收敛」）。

## 潜在问题与不能解决的

- **CSS 属性**：AMP 对某些 CSS 属性或选择器禁用（如部分 `position`、`behavior`、`-moz-` 等），若组件或 juice 内联产出此类样式，**校验会报错，需逐条替换或删除**，可能影响版式。
- **mj-raw**：用户可写任意 HTML，**无法在库内保证 AMP 合规**；含有 script、form、禁用标签时必然失败，只能文档约束。
- **背景图**：section/hero 等若用 `background-image`，AMP 可能限制在部分组件上使用，**需按 AMP 文档逐项确认**。
- **表格布局**：AMP 允许 table，但某些客户端对 AMP 邮件的表格渲染可能与原版不同，**视觉差异无法完全排除**。
