// 模式A 模板（选择逻辑见 SKILL.md）。按主题现拆 SECTIONS（5-8 节），改 researchPrompt 里的主题与来源方向，其余骨架照抄。
// 来源：2026-06-29 palantir-research 实跑脚本，验证过。

export const meta = {
  // slug 用主体英文名/拼音简写：宁德时代换电 → catl-battery-swap-research
  name: '<slug>-research',
  description: '深调 <主题>：<切面概述>——并行联网调研→原生中文',
  phases: [
    { title: '调研', detail: '分面联网检索一手来源', model: 'sonnet' },
    { title: '撰写', detail: '原生中文写成带引用的小节', model: 'sonnet' },
    { title: '执行摘要', detail: '综合成第0节', model: 'sonnet' },
  ],
}

const STYLE = `文风(硬性):
- 原生中文,像财新/晚点/券商深度研报。资料多为英文,但必须写成地道中文,绝不要翻译腔(不照搬英文句式、不滥用破折号插入语、不"换句话说""值得注意的是")。结论先行、短句为主。
- 区分"当事方自述(官网/IR/创始人言论/宣传材料)"与"第三方可核实(财报、政府文件、独立媒体、分析师)"。关键数字以一手文件为准。`

const CITE = `引用:每个关键事实和数字带 <sup>[k]</sup>,k 对应 sources 里的 id。绝不编造来源或数字。`

const HTMLSPEC = `输出 HTML:只返回本节 inner HTML,从 <h2>小节标题</h2> 开始。可用 <h2>/<h3>/<p>/<ul>/<ol>/<li>/<table>/<strong>。不要外壳、style、class。表格用 <table><thead><tbody>。`

const RSCHEMA = {
  type: 'object',
  properties: {
    sources: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'integer' }, title: { type: 'string' }, url: { type: 'string' },
      publisher: { type: 'string' }, date: { type: 'string' } }, required: ['id','title','url'] } },
    findings: { type: 'string', description: '按要点组织的事实清单,每条带[id];自述与可核实分开;核不到标(待核)' },
    gaps: { type: 'string', description: '没查到可靠来源的关键问题' }
  }, required: ['sources','findings']
}
const WSCHEMA = {
  type: 'object',
  properties: {
    n: { type:'integer' }, title: { type:'string' }, html: { type:'string' },
    sources: { type:'array', items: { type:'object', properties: {
      id:{type:'integer'},title:{type:'string'},url:{type:'string'},publisher:{type:'string'},date:{type:'string'} }, required:['id','title','url'] } }
  }, required: ['n','title','html','sources']
}

// guide：本节要讲/查透什么，调研和撰写两个 agent 都会读；research：来源方向，只给调研 agent。
// 好的节标题是问题不是名词："产品到底是什么" 好过 "产品介绍"。
const SECTIONS = [
  { n:1, title:'<第一节标题>', guide:'<本节要讲透什么、区分什么>', research:'<来源方向：一手文件/官方库/权威媒体>' },
  // ... 5-8 节，最后一节通常是"虚实判断/镜鉴"式收尾
]

const researchPrompt = (s) => `你在为一篇关于 <主题> 的中文深度调研报告,做【${s.title}】这一面的联网检索。

本面要查:
${s.guide}

来源方向:${s.research}

要求:
- 用 WebSearch / WebFetch 真实联网检索(若未加载,先 ToolSearch "select:WebSearch,WebFetch")。一手来源为主,覆盖到最新进展。
- 只采用真实打开核对过的页面,给真实 URL。绝不编造来源、数字、客户或合同。
- 区分当事方自述与第三方可核实信息。

返回:sources(从1连续编号,id/title/url/publisher/date,10-16 条)、findings(按要点,每条带[id],自述与事实分开,核不到标(待核))、gaps。`

const writePrompt = (s, res) => `你在撰写关于 <主题> 的中文深度调研报告第 ${s.n} 节《${s.title}》。只用下面已核事实,不新增未列出的数字或名字。

事实清单:
${res.findings}
${res.gaps ? `\n未能核实(可在文中点明缺口):\n${res.gaps}` : ''}

来源(id 固定):
${res.sources.map(x => `[${x.id}] ${x.title} — ${x.url}`).join('\n')}

${STYLE}

${CITE}

${HTMLSPEC}

本节要点:
${s.guide}

篇幅 1500-2400 字。返回:n(=${s.n})、title、html、sources(最终从1连续编号,正文 <sup>[k]</sup> 与之一致)。`

const written = await pipeline(
  SECTIONS,
  (s) => agent(researchPrompt(s), { label: `调研·${s.n}`, phase: '调研', agentType: 'general-purpose', model: 'sonnet', effort: 'high', schema: RSCHEMA }),
  (res, s) => res ? agent(writePrompt(s, res), { label: `撰写·${s.n}`, phase: '撰写', agentType: 'general-purpose', model: 'sonnet', effort: 'high', schema: WSCHEMA }) : null
)

const valid = written.filter(Boolean).slice().sort((a, b) => a.n - b.n)
log(`已完成小节:${valid.map(c => c.n).join(',')}`)

const summaryPrompt = `为一篇关于 <主题> 的中文深度调研报告写"执行摘要"(第0节)。

各节:
${valid.map(c => `第${c.n}节 ${c.title}`).join('\n')}

${STYLE}
${HTMLSPEC}

写半页执行摘要:开篇一句话说清 <主题> 是什么;然后速答报告回答的几个核心问题;最后一句冷静判断。不需脚注。返回 n=0、title="执行摘要"、html、sources=[]。`

const summary = await agent(summaryPrompt, { label: '执行摘要', phase: '执行摘要', agentType: 'general-purpose', model: 'sonnet', effort: 'high', schema: WSCHEMA })

return { title: '<报告主标题>', chapters: [summary, ...valid] }
