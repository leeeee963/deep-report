// 模式B 模板（选择逻辑见 SKILL.md）。按问题现拆 4-6 路，每路一个互补的取证角度。
// 来源：2026-07-03 china-palantir-research 实跑脚本，验证过。

export const meta = {
  // slug 用主体英文名/拼音简写：宁德时代换电 → catl-battery-swap-research
  name: '<slug>-research',
  description: '深度调研：<要回答的问题>——N 路并行取证',
  phases: [{ title: 'research', detail: 'N 路并行：<角度1> / <角度2> / …' }],
}

phase('research')

// 公共尾巴：贴在每路 prompt 末尾，别改。
const common = '\n\n输出要求：只用公开信息,不推测;尽量取最新进展;公司名/产品名/政策名中英或全称并列;结构化分点;关键数字(营收、份额、合同额、时间)要带来源(媒体/官方/研报 + URL),找不到一手来源的标「未核实」,不要编造。多给可核实的事实和公开判断,少给空泛结论。你的最终回复就是数据本身,直接给结构化清单,不要寒暄。'

// 每路 prompt 开头一句定角色和目标，然后逐条点名要查的对象/问题。
const p1 = '你是联网调研 agent。调研 <角度1>,为一份中文深度调研报告提供素材。逐项拆：'
  + '(1) <点名对象一：要什么>；'
  + '(2) <点名对象二：要什么>；'
  + '(3) <…>。'
  + '另外找：<该角度的公开综述/研报> 的核心结论。' + common

const p2 = '你是联网调研 agent。调研 <角度2>,为一份中文深度调研报告提供素材。…' + common

const p5 = '你是联网调研 agent。调研 <反方角度>。…(5) 反方观点：也找「<相反判断>」的论据,保持平衡。' + common

const R = await parallel([
  () => agent(p1, { label: '<角度1-slug>', phase: 'research', model: 'sonnet' }),
  () => agent(p2, { label: '<角度2-slug>', phase: 'research', model: 'sonnet' }),
  // ...
  () => agent(p5, { label: 'counter-view', phase: 'research', model: 'sonnet' }),
])

// 有几路返回几路，别手写键名漏掉中间的路
return Object.fromEntries(R.map((r, i) => [i === R.length - 1 ? 'counter' : 'a' + (i + 1), r]))
