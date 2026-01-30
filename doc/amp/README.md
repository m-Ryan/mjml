# AMP Email 转换文档（按 Block）

本目录下每个 Markdown 对应一个「转换块」，说明：**怎么从当前 MJML 输出改为 AMP Email 输出**，以及**潜在问题与不能解决的点**。

| 文件 | 块 |
|------|-----|
| [01-core-skeleton.md](01-core-skeleton.md) | 核心 Skeleton、文档结构、Head 合并、mergeOutlookConditionnals |
| [02-mjml-image.md](02-mjml-image.md) | mjml-image → amp-img |
| [03-mjml-accordion.md](03-mjml-accordion.md) | mjml-accordion → amp-accordion（含 AccordionElement / AccordionTitle / AccordionText） |
| [04-mjml-carousel.md](04-mjml-carousel.md) | mjml-carousel → amp-carousel（Carousel + CarouselImage） |
| [05-mjml-social.md](05-mjml-social.md) | mjml-social（SocialElement 图标 → amp-img） |
| [06-mjml-navbar.md](06-mjml-navbar.md) | mjml-navbar（菜单与可选 img） |
| [07-mjml-body-and-head.md](07-mjml-body-and-head.md) | mjml-body 与 mj-head 相关（body、head 合并为 amp-custom） |
| [08-layout-and-other-components.md](08-layout-and-other-components.md) | section / column / text / button / divider / spacer / table / wrapper / group / hero / raw |

整体计划见项目根目录或 `.cursor/plans` 下的「MJML 转 AMP Email」计划；本库为 **AMP 专用**，不提供 format 选项，普通 HTML 请使用原版 MJML。
