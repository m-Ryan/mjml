# Block: 核心 Skeleton 与文档结构（mjml-core）

## 怎么转换

- **当前**：`packages/mjml-core/src/helpers/skeleton.js` 输出标准 HTML5 文档壳，包含：
  - `<!doctype html>` + `<html lang dir xmlns...>`
  - `<head>` 内：`<title>`、`<!--[if !mso]><!-->`、`<meta X-UA-Compatible>`、`<meta Content-Type>`、`<meta viewport>`、多个 `<style type="text/css">`（outlook/body/table/img 等）、`<!--[if mso]>` 的 Office 设置与 `.mj-outlook-group-fix`、`buildFontsTags`、`buildMediaQueriesTags`、`buildStyleFromComponents`、`buildStyleFromTags`、headRaw
  - 最后是 `${content}`（即 `<body>...</body>` 由 mj-body 产出，skeleton 只拼在 html 下）
- **改为 AMP 专用**：
  1. 新建 `skeletonAmp.js`（或直接改写 `skeleton.js`），输出 AMP for Email 必需结构。
  2. 文档根：`<!doctype html>\n<html ⚡4email>`（或 `amp4email`），保留 `lang`、`dir`，**去掉** `xmlns`、`xmlns:v`、`xmlns:o`。
  3. `<head>` 顺序必须符合规范：
     - **第一子元素**：`<meta charset="utf-8">`（AMP 强制）
     - 之后：`<title>`、`<meta name="viewport" content="width=device-width,initial-scale=1">`
     - `<style amp4email-boilerplate>body{visibility:hidden}</style>`
     - `<script async src="https://cdn.ampproject.org/v0.js"></script>`
     - **单个** `<style amp-custom>`：内容由调用方传入（见下「Head 样式合并」）
     - headRaw（若有）
  4. **不再输出**：任何 `<!--[if mso]>`、`<!--[if !mso]>`、`<o:OfficeDocumentSettings>`、多份 `<style type="text/css">`（除 amp4email-boilerplate 与 amp-custom 外）。
- **Head 样式合并**（在 `packages/mjml-core/src/index.js`）：
  - 在调用 skeleton 前，将 `globalData.headStyle`、`componentsHeadStyle`、`style`、以及由 `buildMediaQueriesTags` / `buildStyleFromComponents` / `buildStyleFromTags` 等产生的 CSS 合并成**一段**字符串（不再输出多个 `<style>` 标签）。
  - 将该字符串作为参数传入 AMP skeleton，由 skeleton 写入**唯一**的 `<style amp-custom>`。
- **mergeOutlookConditionnals**：
  - 在 `index.js` 中**不再调用** `mergeOutlookConditionnals`，或改为空实现，避免在 body 内注入 Outlook 条件注释。

## 涉及文件

- `packages/mjml-core/src/helpers/skeleton.js`（保留或改名为默认 AMP 实现）
- 新建：`packages/mjml-core/src/helpers/skeletonAmp.js`（若保留原 skeleton 作参考）
- `packages/mjml-core/src/index.js`（默认使用 AMP skeleton、合并 head 样式为单段、去掉 mergeOutlookConditionnals 调用）
- `packages/mjml-core/src/helpers/styles.js`、`mediaQueries.js`、`fonts.js`：由 index 在合并时调用，输出内容进 amp-custom，不再直接产出多组 `<style>`。

## 潜在问题与不能解决的

- **AMP 对 CSS 的限制**：仅允许在 `<style amp-custom>` 或内联 style 中写样式；且禁止部分 at-rule（如某些 `@media` 用法）、禁止 `!important` 在部分场景等。当前 `buildMediaQueriesTags` 会产出多份 `<style>` 和 OWA/Thunderbird 专用块，合并进 amp-custom 后，若包含 AMP 不支持的语法，校验会报错，需在合并层做过滤或简化，**无法完全保留原版「多客户端 hack」行为**。
- **字体**：原 `buildFontsTags` 可能输出 `<link>` 或 `@import`；AMP Email 对字体加载方式有限制，需对照 [AMP 文档](https://amp.dev/documentation/guides-and-tutorials/learn/email-spec/amp-email-format/) 调整，**可能无法与现有字体用法 100% 一致**。
- **单 style 标签 50KB 限制**：AMP 规定 `<style amp-custom>` 总大小上限（如 50,000 字节），复杂模板可能超限，需压缩或删减样式，**无法在超大样式中保持与原版一致**。
- **body 由 mj-body 产出**：skeleton 只负责包裹；若 mj-body 产出带 Outlook 条件或非 AMP 允许属性，需在 mj-body 或后处理中处理，skeleton 本身**不负责**修正 body 内部。
