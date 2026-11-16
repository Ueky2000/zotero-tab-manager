<img src="icon-96.png" width="64" alt="Tab Manager icon">

# Tab Manager

Your tabs, in order.

Organize Zotero reader tabs into colorful, collapsible groups. Add personal tab notes, find open papers, and revisit tabs you haven't read recently.

## 安装

下载 [tab-manager-0.5.0.xpi](https://raw.githubusercontent.com/Ueky2000/zotero-tab-manager/main/dist/tab-manager-0.5.0.xpi)，在 Zotero「工具 → 插件 → 齿轮 → 从文件安装插件」中选择它。部分版本菜单名称为「附加组件」。可以直接覆盖旧版；必要时重启 Zotero。

## 兼容性

同一个 XPI 面向 **Zotero 6.0–10.0.x**，包含旧版与新版两套安装声明和兼容入口。没有宣称支持未来的大版本。

2026-11-16 在 Windows 上，使用独立配置、独立数据库和实际 XPI 完成以下验证：

| Zotero | 安装及核心功能检查 | 状态 |
| --- | ---: | --- |
| 6.0.36 | 20 项 | 通过 |
| 7.0.32 | 20 项，另有 130 项功能回归检查 | 通过 |
| 8.0.4 | 20 项 | 通过 |
| 9.0.6 | 20 项 | 通过 |
| 10.0.8 | 20 项 | 通过 |

最新版 [Zotero 10.0.9](https://www.zotero.org/support/changelog) 仅面向 macOS，Windows 最新版为 10.0.8。macOS、Linux 以及未列出的各补丁版本尚未实机验证；发布范围不等于逐个版本、逐个平台测试过。测试结果见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 使用

- **分组**：点击「+」新建分组；拖动文献标签到组名，或右键文献加入分组。组名和文献位于同一行。
- **折叠**：点击组名折叠或展开，未分组也支持。折叠状态、颜色和组序会保存。
- **拖动**：拖组名调整组序；拖文献时会区分加入分组与在文献前后插入。悬停折叠组约 600 毫秒后临时展开，取消拖动后恢复。
- **颜色**：右键组名 → 分组颜色，可选预设色或输入十六进制颜色；未分组也可设置。
- **备注**：右键文献 → 设置备注。可以选择显示原文件名、备注或两者；右键组名 → 组内标签显示，可统一设置已有和新加入的文献。
- **搜索**：点击右侧「搜索文献」，搜索已打开文献的备注、原文件名或原标题，包括折叠组。点击结果展开分组并切换到文献。
- **建议关闭**：最右侧按钮列出一段时间没有重新查看的文献，默认 7 天，可调整。只提供建议，由你决定是否关闭。
- **关闭分组文献**：右键组名 → 关闭分组下所有文献。关闭阅读标签，不删除文献或附件，保留分组归属。

分组右键顺序为：重命名此分组、解散该分组、分组颜色、组内标签显示、关闭分组下所有文献。

## 数据与更新

设置按文献库 ID 和附件 key 保存在本机 Zotero 配置中，不修改文件名、文献标题或 Zotero 笔记，不随文献库同步。停用插件会恢复原生标签栏，保留设置。

插件 ID `tab-groups@local.zotero` 和配置键 `extensions.tabGroups.state` 保持不变，旧版分组、备注与查看记录可继续使用。查看间隔从插件开始记录时计算，不推测启用之前的历史。

运行功能不上传文献信息；Zotero 自身会按照其插件更新设置访问本仓库托管的更新清单和安装包。若维护者更换仓库，需要同时修改两个安装声明与 `build.py` 中的地址，再重新打包。

## Build

Requires Node.js and Python 3. The generated legacy module is committed, so packaging alone needs only Python:

```sh
python build.py
```

After editing `core.js`, regenerate the Firefox 60 module and package:

```sh
npm install --ignore-scripts --no-audit --no-fund
npm run build
```

Outputs: `dist/tab-manager-0.5.0.xpi`, `dist/SHA256SUMS`, and `updates.json`. The XPI has deterministic ZIP timestamps. The update manifest supports Zotero 6's Firefox version checks and Zotero 7–10's application version checks.

The GitHub build workflow verifies syntax, rebuilds the package, and checks that generated files match the committed files. Runtime tests require Zotero Desktop; see [tests/README.md](tests/README.md). Edit `core.js`, never `core-legacy.js` directly.

## License

[MIT](LICENSE).

