<a name="smeargraph"></a>
<p align="center">
  <img src="assets/banner.png" alt="SmearGraph banner" width="100%">
</p>

<p align="center">
  <h1 align="center">🖌️ SmearGraph</h1>
  <p align="center">
    <strong>代码架构分析、可视化与 MCP 服务</strong><br>
    <em>像图图犬一样绘制你的代码库——扫描、建图、追踪、可视化</em>
  </p>
  <p align="center">
    <a href="#-功能特性">功能特性</a> •
    <a href="#-快速开始">快速开始</a> •
    <a href="#-mcp-服务">MCP 服务</a> •
    <a href="#%EF%B8%8F-cli-参考">CLI</a> •
    <a href="#-工具列表-18-个">工具列表</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/node-18+-yellow?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/MCP-ready-8B5CF6?style=flat-square" alt="MCP">
  <img src="https://img.shields.io/badge/AI--agent-就绪-00C9A7?style=flat-square" alt="AI Agent">
  <img src="https://img.shields.io/github/stars/GetIT-Sunday/SmearGraph?style=social" alt="Stars">
</p>

<p align="center">
  <a href="README.md">English</a> | <strong>中文</strong>
</p>

---

## ✨ 功能特性

<table>
  <tr>
    <td width="50%">
      <h3>🔍 深度代码分析</h3>
      <ul>
        <li>扫描源文件、提取符号、追踪调用链</li>
        <li>构建基于 SQLite 的代码库知识图谱</li>
        <li>发现循环依赖、死代码和变更影响范围</li>
        <li>"改了 X 会影响哪里？"——即时回答</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🗺️ 架构可视化</h3>
      <ul>
        <li>ASCII 图——在任意终端直接显示</li>
        <li>交互式 HTML 仪表盘——组件浏览器</li>
        <li>JSON 导出——接入任意数据管道</li>
        <li>运行时追踪（Python）</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🤖 MCP 服务（AI Agent 就绪）</h3>
      <ul>
        <li>18 个 MCP 工具，支持 Claude Code、Codex、OpenCode</li>
        <li>零配置：只需添加到 <code>claude.json</code></li>
        <li>跨会话记忆：存储决策和模式</li>
        <li>LLM 增强：自动生成节点摘要</li>
      </ul>
    </td>
    <td width="50%">
      <h3>⚡ 开发者体验</h3>
      <ul>
        <li>零配置——<code>smeargraph init</code> 一键完成</li>
        <li>Node 18+，TypeScript，tree-sitter 解析器</li>
        <li><code>chokidar</code> 文件监听增量同步</li>
        <li>为 Claude Code、Codex、OpenCode 提供 Agent 指令</li>
      </ul>
    </td>
  </tr>
</table>

<div align="right"><a href="#smeargraph">↑ 返回顶部</a></div>

---

## 🚀 快速开始

**① 安装**

```bash
npm install -g smeargraph
# 或直接通过 npx 使用
npx smeargraph init
```

**② 初始化项目**

```bash
cd your-project
smeargraph init      # 构建知识图谱 + SQLite 索引
```

**③ 可视化架构**

```bash
smeargraph analyze . -f ascii    # 终端 ASCII 图
smeargraph analyze . -f html     # 交互式 HTML 仪表盘
smeargraph analyze . -f json     # JSON 导出
```

**④ 可选：LLM 增强**

```bash
smeargraph enrich    # 为所有节点自动生成摘要
```

<div align="right"><a href="#smeargraph">↑ 返回顶部</a></div>

---

## 🤖 MCP 服务

将 SmearGraph 作为 Claude Code MCP 服务器，用自然语言直接提问代码问题。

**配置**（`claude.json`）：

```json
{
  "mcpServers": {
    "smeargraph": {
      "command": "npx",
      "args": ["smeargraph", "serve"],
      "timeout": 300000
    }
  }
}
```

**在 Claude Code 中的示例提问：**

```
processPayment 函数是谁调用的？
重命名 UserService 会影响哪些地方？
有没有循环依赖？
展示整体架构
找出所有死代码
分析这次 PR 的 diff 影响
```

<div align="right"><a href="#smeargraph">↑ 返回顶部</a></div>

---

## 🛠️ 工具列表（18 个）

<details>
<summary><strong>完整 MCP 工具参考 — 点击展开</strong></summary>
<br>

**主要工具**

| 工具 | 用途 |
|------|------|
| `smeargraph_explore` | **首先调用** — 返回任何代码问题的源码原文 |

**代码分析**

| 工具 | 用途 |
|------|------|
| `smeargraph_search` | 按名称查找符号（比 grep 更快） |
| `smeargraph_impact` | "改了 X 会影响什么？" |
| `smeargraph_callers` | "谁调用了这个？" |
| `smeargraph_callees` | "这个调用了什么？" |
| `smeargraph_traverse` | 带过滤条件的通用图遍历 |
| `smeargraph_circular` | 找循环依赖 |
| `smeargraph_dead` | 找死代码 |
| `smeargraph_pr_context` | 分析 git diff 影响 |

**架构**

| 工具 | 用途 |
|------|------|
| `smeargraph_architecture` | 完整架构概览 |
| `smeargraph_component` | 组件详情 |
| `smeargraph_trace` | 运行时追踪（仅 Python） |
| `smeargraph_summary` | 节点摘要 |

**跨会话记忆**

| 工具 | 用途 |
|------|------|
| `smeargraph_memory_store` | 存储决策/洞察/模式 |
| `smeargraph_memory_search` | 搜索记忆 |
| `smeargraph_memory_list` | 列出所有记忆 |
| `smeargraph_memory_stats` | 记忆统计 |

**元信息**

| 工具 | 用途 |
|------|------|
| `smeargraph_status` | 检查索引健康状态 |

</details>

<div align="right"><a href="#smeargraph">↑ 返回顶部</a></div>

---

## 🖥️ CLI 参考

<details>
<summary><strong>所有 CLI 命令 — 点击展开</strong></summary>
<br>

```bash
smeargraph init                          # 初始化知识图谱 + SQLite 索引
smeargraph analyze [dir] -f ascii        # ASCII 架构图
smeargraph analyze [dir] -f html         # 交互式 HTML 仪表盘
smeargraph analyze [dir] -f json         # JSON 导出
smeargraph trace --cmd "node app.js"     # 运行时追踪
smeargraph serve                         # 启动 MCP 服务（stdin/stdout）
smeargraph enrich                        # LLM 增强节点摘要
```

</details>

<div align="right"><a href="#smeargraph">↑ 返回顶部</a></div>

---

## 🧪 开发

```bash
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd SmearGraph
npm install
npm run build   # 编译 TypeScript
npm start       # 启动 CLI
```

<div align="right"><a href="#smeargraph">↑ 返回顶部</a></div>

---

## 📄 许可证

MIT — 详见 [LICENSE](LICENSE)

---

<p align="center">
  <strong>⭐ 如果 SmearGraph 帮助你读懂了代码库，请给一个 Star！</strong>
</p>

<p align="center">
  <a href="https://star-history.com/#GetIT-Sunday/SmearGraph&Date">
    <img src="https://api.star-history.com/svg?repos=GetIT-Sunday/SmearGraph&type=Date" alt="Star History Chart" width="600">
  </a>
</p>

<p align="center">
  <sub>Made with ✨ by <a href="https://github.com/GetIT-Sunday">GetIT-Sunday</a> using <a href="https://github.com/GetIT-Sunday/ReadmeMagic-github-readme-design-skill">ReadmeMagic</a></sub>
</p>
