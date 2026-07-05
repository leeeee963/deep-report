---
name: deep-report
description: 把一个调研问题做成带引用的中文深度报告，html+docx+pdf 三格式落到 ~/Documents/<主题>/。多路并行联网取证（每路一个 sonnet 子代理），主打「问题一句话进，成品报告出」。触发：「调研一下X，出个报告」「深调X」「X在国内谁能做」这类要成品报告的调研请求。不适用：快速查证几个事实（会话内搜索即可）、要进 ~/Research 发布体系的调研（用 deep-research）。
---

# Deep Report：一句问题 → 并行取证 → 中文成品报告

沉淀自 2026-06-29 ~ 07-03 的 Palantir 系列调研（4 篇报告实跑验证）。核心分工：**取证全部在 Workflow 子代理里做，主会话只做拆题、汇总、渲染**。

## 流程

### 1. 选模式

- **模式A 全流程**（`templates/workflow-full.js`）：5-8 节，每节一对 agent（调研→撰写），最后出执行摘要。报告 = 各节 HTML 拼装。
- **模式B 取证**（`templates/workflow-evidence.js`）：4-6 路并行取证只收事实清单，**报告由主会话（你）自己写**——问题需要跨面判断时，综合和判断留给主模型做质量更高。

判断标准：报告要从多个独立维度铺开成体系论述（背景/产品/机制/经济性/竞争/风险，通常 5 节以上）→ A；本质是回答一个具体问题（谁在做/有几家/能不能成）→ B。"调研XX公司的YY业务模式"这类拆商业逻辑的题目默认 A。

### 2. 拆面，写 workflow

从问题拆出互相独立的取证面。拆得越具体，回来的料越硬——点名公司、点名文件、点名"逐家给：定位/走到哪一步/卡在哪"的格式。模式B 留一路给**反方观点**。子代理一律 `model: 'sonnet'`，联网用 WebSearch/WebFetch。

执行方式：照模板填好占位符后，把整段脚本作为 `script` 参数传给 **Workflow 工具**（`agent()/pipeline()/parallel()` 的语义见该工具自带说明）。它后台运行，完成后以 task-notification 通知。

### 3. 拿结果，只补缺口

结果在通知指向的 output 文件里，脚本 return 的对象**包在顶层 `result` 键下**——先读几行确认字段结构再写提取逻辑，不要凭记忆假设字段名（踩过坑：假设错字段名拿到全空结果白跑一轮）。

Workflow 回来后**不要重查已覆盖的内容**。模式A 看各路 `gaps` 字段；模式B 的返回是文本清单，把其中标「未核实」的条目视同缺口。只对真正的缺口做少量补查。

### 4. 组装报告

- 模式A：把 chapters 按 n 排序填进 `templates/report-shell.html`。
- 模式B：先自己把报告写成章节（风格见铁律），再填壳。

壳的占位符：`{{TITLE}}` `{{SUB}}` `{{META}}` `{{NAV}}` `{{SECTIONS}}`。

```html
<!-- NAV：每章一条，编号两位补零 -->
<a href="#ch0"><span class="nn">00</span>执行摘要</a>
<a href="#ch1"><span class="nn">01</span>第一节标题</a>

<!-- SECTIONS：每章一个 section，章内引用编号独立 -->
<section id="chN">
  ...正文，引用为 <sup class="cite"><a href="#chN-sK">K</a></sup>...
  <ol class="src">
    <li id="chN-sK"><a href="URL" target="_blank" rel="noopener">来源标题</a> <span class="pub">出处 · 日期</span></li>
  </ol>
</section>
```

分工：子代理返回的 html 里引用是纯文本 `<sup>[k]</sup>`，**由你在拼装时**替换成上面的链接形式（正则 `<sup>\[(\d+)\]</sup>` → `<sup class="cite"><a href="#ch{n}-s\1">\1</a></sup>`）；`<ol class="src">` 也由你按该章 sources 数组生成，不是子代理输出的一部分。

META 格式参考：`深度调研 · 8 节 · 联网一手来源 · 2026.06 · 共 103 条引用`。

落盘：先 `mkdir -p ~/Documents/<主题>`，写 `<报告名>.html`。报告名用能当标题念的问题（"谁能做中国Palantir"），别叫"报告v2"。

### 5. 转三格式

```bash
cd ~/Documents/<主题>
pandoc <报告名>.html -f html -t docx -o <报告名>.docx && echo "docx ok"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --print-to-pdf="<报告名>.pdf" --no-pdf-header-footer "<报告名>.html"
```

pandoc 后面别接 `| head` 之类会吞退出码的管道（踩过坑：docx 静默生成失败没被发现）。

### 6. 质检，然后 open

```bash
python3 - "<报告名>.html" <<'PY'
import re, sys
html = open(sys.argv[1], encoding='utf-8').read()
linked = len(re.findall(r'<sup class="cite"><a ', html))
unlinked = len(re.findall(r'<sup>\[\d+\]</sup>', html))
raw_lt = html.count('&lt;')
print(f'linked={linked} unlinked={unlinked} raw_lt={raw_lt}')
assert linked > 0 and unlinked == 0 and raw_lt == 0, '质检未通过'
PY
ls -la <报告名>.html <报告名>.docx <报告名>.pdf   # 三个文件都在且非零才算齐
```

过了就 `open <报告名>.html`，告诉用户三个文件在哪。docx 是硬需求（用户要转发）。

## 铁律

- **不编造**：来源、数字、客户名、合同——查不到就标「未核实」，宁缺毋假。
- **自述与可核实分开**：官网/IR/创始人言论 ≠ 第三方核实；关键数字以一手文件为准。
- **原生中文**：财新/晚点研报腔，不翻译腔，结论先行短句为主。
- **洞见不堆情绪**：每个数据点落到判断句，收尾给冷静判断（真本事 vs 叙事）。
