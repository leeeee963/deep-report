# deep-report

一个 Claude Code skill：把一个调研问题做成带引用的中文深度报告，html + docx + pdf 三格式，落到 `~/Documents/<主题>/`。

一句话进（"调研一下X，出个报告"），成品报告出。取证由多路并行的联网子代理完成，每条关键事实带真实来源链接，查不到的标「未核实」。

沉淀自 2026 年 6-7 月一组 Palantir 调研的实跑过程（4 篇报告验证过全流程）。

## 安装

```bash
git clone https://github.com/leeeee963/deep-report.git ~/.claude/skills/deep-report
```

下个 Claude Code 会话自动生效。对 Claude 说「调研一下X，出个报告」或 `/deep-report` 即可。

## 文件

```
SKILL.md                        流程主文件（Claude 读这个干活）
templates/workflow-full.js      模式A：成体系深调（5-8 节，每节调研+撰写各一个子代理）
templates/workflow-evidence.js  模式B：回答具体问题（N 路并行取证，主会话成稿）
templates/report-shell.html     报告壳（左侧目录、进度条、章内引用角标）
```

## 依赖与边界

- **Claude Code**：并行取证靠 Claude Code 的 Workflow 工具。其他 agent（Codex、OpenClaw 等）能读懂 SKILL.md 的流程，但没有这个执行器，取证阶段会退化成串行。
- **pandoc**：转 docx（`brew install pandoc`）。
- **Chrome**：转 pdf，模板里是 macOS 路径，其他系统自行替换。

## 产出长什么样

单文件 HTML 报告：左侧固定目录 + 阅读进度条，正文每个关键事实带可点角标，跳到该章末尾的来源列表（标题 / 出处 / 日期 / 原文链接）。同目录下配 docx（可编辑转发）和 pdf。

## 移植到其他框架（Hermes、Dify、自建多 agent 等）

不用 Claude Code 也能拿走大部分东西。这套 skill 拆开是三层：

1. **流程与提示词——直接搬**。SKILL.md 的拆面方法（怎么把一个问题拆成 4-8 个互相独立的取证面、留一路给反方观点）、两个模板里每路取证 prompt 的写法（点名拆法、"不编造/查不到标未核实"的公共尾巴、返回 schema）、成稿铁律，全是纯文本。把 prompt 拆出来映射成你自己框架里的检索/撰写节点即可。
2. **执行器——换成你自己的**。模板里 `agent()/pipeline()/parallel()` 这套调度是 Claude Code 的 Workflow 工具，其他框架用自己的并行编排替代这一层。
3. **产出层——直接搬**。`report-shell.html` 是纯 HTML/CSS 报告壳，谁填都一样；pandoc / Chrome 转 docx、pdf 是普通命令行。

一句话：Claude Code 独占的只有并行执行器，方法论、prompt 素材和报告壳都是通用资产。
