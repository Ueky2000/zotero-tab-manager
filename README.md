<p align="center">
  <img src="src/icons/icon-128.png" width="88" height="88" alt="Tab Manager 图标">
</p>

<h1 align="center">Tab Manager</h1>

<p align="center">Your tabs, in order.</p>
<p align="center"><strong>让 Zotero 打开的文献井井有条。</strong></p>

<p align="center">
  <a href="#兼容性"><img src="https://img.shields.io/badge/Zotero-6-e05d66?style=flat-square&amp;logo=zotero&amp;logoColor=CC2936&amp;labelColor=555555" alt="Zotero 6"></a>
  <a href="#兼容性"><img src="https://img.shields.io/badge/Zotero-7-ed8b45?style=flat-square&amp;logo=zotero&amp;logoColor=CC2936&amp;labelColor=555555" alt="Zotero 7"></a>
  <a href="#兼容性"><img src="https://img.shields.io/badge/Zotero-8-d9ab3c?style=flat-square&amp;logo=zotero&amp;logoColor=CC2936&amp;labelColor=555555" alt="Zotero 8"></a>
  <a href="#兼容性"><img src="https://img.shields.io/badge/Zotero-9-6ba753?style=flat-square&amp;logo=zotero&amp;logoColor=CC2936&amp;labelColor=555555" alt="Zotero 9"></a>
  <a href="#兼容性"><img src="https://img.shields.io/badge/Zotero-10-24a698?style=flat-square&amp;logo=zotero&amp;logoColor=CC2936&amp;labelColor=555555" alt="Zotero 10"></a>
</p>

<p align="center">
  <a href="https://github.com/Ueky2000/zotero-tab-manager/releases/latest"><img src="https://img.shields.io/github/v/release/Ueky2000/zotero-tab-manager?style=flat-square&amp;logo=github&amp;logoColor=white&amp;label=Release&amp;labelColor=555555&amp;color=7868c9" alt="最新发布版本"></a>
  <a href="https://github.com/Ueky2000/zotero-tab-manager/releases"><img src="https://img.shields.io/github/downloads/Ueky2000/zotero-tab-manager/total?style=flat-square&amp;label=Downloads&amp;labelColor=555555&amp;color=24a698" alt="GitHub Release 附件总下载量"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-ed8b45?style=flat-square&amp;labelColor=555555" alt="MIT 许可证"></a>
  <a href="https://github.com/Ueky2000/zotero-tab-manager/actions/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/Ueky2000/zotero-tab-manager/build.yml?branch=main&amp;style=flat-square&amp;logo=githubactions&amp;logoColor=white&amp;label=Build&amp;labelColor=555555&amp;color=6ba753" alt="构建状态"></a>
</p>

<p align="center">
  <a href="https://zotero-chinese.com/plugins/"><img src="https://zotero-chinese.com/badges/listed.svg" alt="Zotero 中文社区 · 已收录"></a>
</p>

<p align="center"><strong>📝 其他语言 / Other Languages</strong></p>

<p align="center">
  <a href="docs/i18n/README.en.md">English</a> |
  <a href="docs/i18n/README.ja.md">日本語</a> |
  <a href="docs/i18n/README.ko.md">한국어</a> |
  <a href="docs/i18n/README.it.md">Italiano</a> |
  <a href="docs/i18n/README.fr.md">Français</a>
</p>

> **Note:** These translations are AI-generated and may contain inaccuracies. For the authoritative version, please refer to this Chinese README.

<p align="center">
  <strong>📦 下载最新版本：</strong>
  <a href="https://github.com/Ueky2000/zotero-tab-manager/releases/latest">Zotero 插件 XPI</a> ·
  <a href="https://github.com/Ueky2000/zotero-tab-manager/releases">历史版本</a> ·
  <a href="#使用指南">使用文档</a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#使用指南">使用指南</a> ·
  <a href="docs/CHANGELOG.md">更新日志</a> ·
  <a href="https://github.com/Ueky2000/zotero-tab-manager/issues">反馈问题</a>
</p>

<p align="center">
  <img src="docs/assets/tab-manager-overview.svg" width="100%" alt="Tab Manager 功能示意：研究主题分组与文献标签位于同一行，颜色区分分组，备注标记阅读重点，右侧可搜索或查看建议关闭的文献。">
</p>

## 为什么做 Tab Manager

读文献时，我们经常同时打开十几篇甚至几十篇论文：标签挤在顶部，标题显示不全，切换时找不到想看的那篇，也容易忘记每篇论文为什么打开。

Tab Manager 把顶部拥挤的标签，整理成有主题、有颜色、有阅读线索的工作区。

| 功能 | 帮你解决什么 |
| --- | --- |
| 🗂️ **按主题分组** | 把同一课题、方法或阅读任务放在一起；完成后，一键关闭组内文献。 |
| 🎨 **颜色与折叠** | 用自定义颜色区分研究主题，折叠暂时不看的组；未分组也支持。 |
| ✍️ **文献备注** | 用“重点看实验”“这篇有代码”标记论文；按组统一选择标题、备注或同时显示。 |
| 🔎 **搜索已打开文献** | 通过备注、文件名或原标题查找，折叠组里的文献也能找到并跳转。 |
| 🕒 **建议关闭** | 找出长期挂着、没有重新查看的文献，显示间隔天数，由你决定是否关闭。 |
| 💾 **延续阅读现场** | 保存分组、颜色、组序、备注和折叠状态，重启后继续使用。 |

拖动文献就能加入分组，右键也能操作；关闭组内标签不会删除文献或附件。

适合经常同时阅读多篇论文、并行推进多个课题，以及习惯把文献一直开着的人。

插件目前面向 **Zotero 6–10** 做了适配性优化，兼容多个版本。

## 快速开始

1. 前往 [最新版本](https://github.com/Ueky2000/zotero-tab-manager/releases/latest)，下载 **`.xpi`** 安装包。
2. 在 Zotero 中打开「**工具 → 插件 → 齿轮 → 从文件安装插件**」，选择下载的文件。部分版本菜单名称为「附加组件」。
3. 打开几篇文献，点击标签栏的「**+**」新建分组，再把文献标签拖到组名上。

已有旧版可直接覆盖安装；必要时重启 Zotero。

> 同一个安装包面向 Zotero 6–10，具体验证范围见下方兼容性说明。

<details>
<summary>最近更新 · v0.5.1：大量标签也能顺畅切换</summary>

修复打开大量文献时，标签栏把右侧原生下拉列表、搜索和“建议关闭”按钮挤出窗口的问题。文献标签现在只在可用区域内横向滚动，鼠标滚轮可左右浏览；切换到溢出的文献时，会自动将对应标签滚入可见区域。分组、备注等已有设置保持不变。

</details>

## 使用指南

- **分组**：点击「+」新建分组；拖动文献标签到组名，或右键文献加入分组。组名和文献位于同一行。
- **折叠**：点击组名折叠或展开，未分组也支持。折叠状态、颜色和组序会保存。
- **拖动**：拖组名调整组序；拖文献时会区分加入分组与在文献前后插入。
- **颜色**：右键组名 → 分组颜色，可选预设色或输入十六进制颜色；未分组也可设置。
- **备注**：右键文献 → 设置备注。可以选择显示原文件名、备注或两者；右键组名 → 组内标签显示，可统一设置已有和新加入的文献。
- **搜索**：点击右侧「搜索文献」，搜索已打开文献的备注、原文件名或原标题，包括折叠组。点击结果展开分组并切换到文献。
- **建议关闭**：最右侧按钮列出一段时间没有重新查看的文献，默认 7 天，可调整。只提供建议，由你决定是否关闭。
- **关闭分组文献**：右键组名 → 关闭分组下所有文献。关闭阅读标签，不删除文献或附件，保留分组归属。

## 兼容性

目前已面向 **Zotero 6.0–10.0.x**做了适配性优化，兼容多个版本。

<details>
<summary>查看已验证版本与测试范围</summary>

2026-11-17 在 Windows 上，使用独立配置、独立数据库和实际 XPI 完成以下验证：

| Zotero | 安装及核心功能检查 | 状态 |
| --- | ---: | --- |
| 6.0.36 | 34 项 | 通过 |
| 7.0.32 | 38 项，另有 130 项功能回归检查 | 通过 |
| 8.0.4 | 38 项 | 通过 |
| 9.0.6 | 38 项 | 通过 |
| 10.0.8 | 38 项 | 通过 |

macOS、Linux 以及未列出的各补丁版本尚未实机验证。完整记录见 [兼容性与测试说明](docs/COMPATIBILITY.md)。

</details>

## 常见问题

**关闭分组下所有文献，会删除附件吗？**  
不会。只关闭阅读标签，不删除文献或附件，并保留分组归属。

**“建议关闭”会自动关掉文献吗？**  
不会。它只列出建议，默认以 7 天未重新查看为条件，可调整；是否关闭由你决定。查看间隔从插件开始记录时计算。

**分组和备注会同步到其他设备吗？**  
目前保存在本机 Zotero 配置中，不随文献库同步，也不修改原文件名、文献标题或 Zotero 笔记。停用插件会恢复原生标签栏并保留设置。

<details>
<summary>数据存储与插件更新说明</summary>

设置按文献库 ID 和附件 key 保存在本机 Zotero 配置中，不修改文件名、文献标题或 Zotero 笔记，不随文献库同步。停用插件会恢复原生标签栏，保留设置。

插件 ID `tab-groups@local.zotero` 和配置键 `extensions.tabGroups.state` 保持不变，旧版分组、备注与查看记录可继续使用。查看间隔从插件开始记录时计算，不推测启用之前的历史。

运行功能不上传文献信息；Zotero 自身会按照其插件更新设置访问本仓库托管的更新清单和安装包。若维护者更换仓库，需要同时修改两个安装声明与 `scripts/build.py` 中的地址，再重新打包。

</details>

## 开发与文档

- [更新日志](docs/CHANGELOG.md)
- [兼容性与测试记录](docs/COMPATIBILITY.md)
- [构建与目录说明](docs/DEVELOPMENT.md)

欢迎通过 [Issues](https://github.com/Ueky2000/zotero-tab-manager/issues) 反馈问题或提出建议。报告问题时，请附上 Zotero 版本、操作系统、复现步骤和截图。

---

<p align="center">Made for a more focused reading workflow.<br>开源许可 · <a href="LICENSE">MIT</a></p>
