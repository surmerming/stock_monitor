# -*- coding: utf-8 -*-
"""生成 个股复盘-腾讯控股-20261022.html（按 stock-intraday-review skill 模板，21 占位符全替换）"""
import json, re, os

TPL = open('/Users/aiming/.workbuddy/skills/stock-intraday-review/assets/report_template.html', encoding='utf-8').read()
OUT = '/Users/aiming/Documents/workspace/code/mine/stock_monitor/daily_review/个股复盘-腾讯控股-20261022.html'

# ---------- 分时序列 ----------
def load_pts(fp, code):
    d = json.load(open(fp))
    rows = d['data'][code]['data']['data']
    pts = []
    for r in rows:
        p = r.split()
        pts.append((p[0], float(p[1]), int(p[2]), float(p[3])))
    return pts

tx = load_pts('/tmp/tencent_minute.json', 'hk00700')
hsi = load_pts('/tmp/hsi_minute.json', 'hkHSI')
hst = load_pts('/tmp/hstech_minute.json', 'hkHSTECH')

def series_js(pts, prev_close, step=2):
    times, prices = [], []
    for i in range(0, len(pts), step):
        times.append(pts[i][0])
        prices.append(round(pts[i][1], 2))
    if times[-1] != pts[-1][0]:
        times.append(pts[-1][0]); prices.append(round(pts[-1][1], 2))
    return times, prices

tx_t, tx_p = series_js(tx, 393.8, 2)
hsi_t, hsi_p = series_js(hsi, 23651.871, 4)
hst_t, hst_p = series_js(hst, 3994.77, 4)

# 归一化（昨收=100），按腾讯时间轴对齐
def norm_at(pts, prev):
    m = {}
    for t, p, v, a in pts:
        m[t] = p / prev * 100
    return m

n_tx, n_hsi, n_hst = norm_at(tx, 393.8), norm_at(hsi, 23651.871), norm_at(hst, 3994.77)
rs_t = []
rs_tx, rs_hsi, rs_hst = [], [], []
for t in tx_t:
    if t in n_tx and t in n_hsi and t in n_hst:
        rs_t.append(t)
        rs_tx.append(round(n_tx[t], 3))
        rs_hsi.append(round(n_hsi[t], 3))
        rs_hst.append(round(n_hst[t], 3))

# ---------- 占位符内容 ----------
TITLE = '个股日内复盘 — 腾讯控股 00700 — 2026年10月22日'
H1 = '个股日内复盘 — 腾讯控股 00700 — 2026年10月22日'
META1 = '市场：港股（已收盘） · 分时 332 根全覆盖 · 收盘价三源交叉定稿（分时末点 382.4 / 腾讯行情页 / 新华社收评）'
META2 = '生成时间：2026-10-22 21:50（GMT+8）'
META3 = '数据缺口：港股 K 线接口失效 → 技术指标全「—」；做空/特大单分层未授权 → 「—」；期权 IV/ADR 溢价/人民币柜台恒「—」'

TLDR = (
    '<strong>低开 1.7% 后单边阴跌，13:51 刺穿 378.4 创 52 周新低</strong>，'
    '收盘竞价买盘将收盘价从 381.6 拉至 382.4（-2.89%），收在全天区间下沿 31% 位置。'
    '<strong>量比 2.53 显著放量、成交 232.4 亿港元，属放量下跌</strong>，'
    '但恒生科技暴跌 5.03% 背景下腾讯超额收益 +2.14pp、跑赢全部五大同业，属「被拖累·相对抗跌」。'
    '<strong>最关键的背离信号：南向资金今日逆势净买入腾讯 4.89 亿港元（居全市场之首）</strong>，'
    '与股价下跌方向相反——恐慌盘里有内资承接。明日为财报前窗口（11/18 三季报）的第 N 个交易日，'
    '52 周新低是否有效守住 378.4 是多空分水岭。'
)

TIMELINE_HTML = '''<table>
<tr><th>时段</th><th>时间</th><th>价格路径</th><th>量能</th><th>事件</th><th>资金动作</th></tr>
<tr><td>开盘竞价</td><td>09:00-09:30</td><td>开 387.0（低开 <span class="dn">-1.73%</span>）</td><td>—</td><td>隔夜纳斯达克中国金龙指数收跌 2.35%</td><td>跳空缺口 387.0-393.8 未回补</td></tr>
<tr><td>早盘</td><td>09:30-12:00</td><td>387.0 → 388.0（分时高）→ 380.6</td><td>第一小时 1274 万股，占全天 21%</td><td>10:30 触 380.8 后低位震荡</td><td>放量下杀，出逃为主</td></tr>
<tr><td>午盘</td><td>13:00-15:30</td><td>380.6 → <span class="dn">378.4（52 周新低）</span> → 381.4</td><td>13 时段 1116 万股，恐慌盘</td><td>13:51 探底 378.4/378.6，创 52 周新低</td><td>恐慌抛售后出现承接</td></tr>
<tr><td>尾盘</td><td>15:30-16:00</td><td>381.4 → 381.6</td><td>缩量 408 万股</td><td>窄幅横盘，跌不动也涨不动</td><td>观望</td></tr>
<tr><td><strong>收盘竞价</strong></td><td>16:00-16:08</td><td>381.6 → <span class="up">382.4</span></td><td>256 万股 / 9.78 亿港元</td><td>竞价拉高 0.8 元定格收盘</td><td>竞价买盘主导，把收盘拉回 VWAP 上方</td></tr>
</table>
<div class="news warn">⚠️ 收盘价口径说明：新浪盘后快照 16:06 停在竞价前的 382.0，真实收盘为分时末点 16:08 竞价定格 <strong>382.4</strong>（腾讯行情页、新华社收评一致），涨跌幅 -2.89%。</div>'''

PIVOT_HTML = '''<table class="ft">
<tr><th>时间</th><th>价格</th><th>动作</th><th>触发因素</th><th>归因置信度</th></tr>
<tr><td>09:30-10:30</td><td>387.0 → 380.8</td><td>首波放量杀跌 <span class="dn">-1.6%</span></td><td>隔夜中概金龙 -2.35% 传导；昨日（10/21）南向净卖出腾讯 17.06 亿港元居首</td><td><span class="badge bw">疑似</span>（板块同步异动，无分钟级消息）</td></tr>
<tr><td>13:14-13:51</td><td>380.8 → <span class="dn">378.4</span></td><td>午后加速探底，创 52 周新低</td><td>恒生科技跌破 3800 关口触发技术卖盘；市场「卖股交税」传闻扰动</td><td><span class="badge bw">疑似</span>（盘后稿事后提及）</td></tr>
<tr><td>13:51-15:30</td><td>378.6 → 381.4</td><td>低点回升 <span class="up">+0.7%</span></td><td>南向资金全天净买入 4.89 亿港元托底（收盘稿口径）</td><td><span class="badge bw">疑似</span>（资金行为 + 盘后数据印证）</td></tr>
<tr><td><strong>16:00-16:08</strong></td><td>381.6 → <span class="up">382.4</span></td><td><strong>收盘竞价拉高</strong>，成交 9.78 亿港元</td><td>无消息（资金行为 / 被动资金与竞价买盘）</td><td><span class="badge bi">无消息</span></td></tr>
</table>'''

VOL_CARDS = '''<div class="sc"><div class="lb">成交额</div><div class="vl">232.41 亿港元</div><div class="sb">6079 万股 · 换手 0.67%</div></div>
<div class="sc"><div class="lb">量比</div><div class="vl" style="color:var(--o)">2.53</div><div class="sb">显著放量（&gt;2 倍）</div></div>
<div class="sc"><div class="lb">振幅</div><div class="vl">3.25%</div><div class="sb">高 391.2 / 低 378.4</div></div>
<div class="sc"><div class="lb">VWAP</div><div class="vl">382.30</div><div class="sb">收盘 382.4 = 买盘保本</div></div>'''

VOL_JUDGE_HTML = '''<div class="al"><strong>形态定性：放量下跌（早盘出货）+ 尾盘竞价承接。</strong>
量比 2.53 属显著放量，价格 -2.89%，教科书口径是「放量下跌 = 出货/恐慌」。但结构上量能高度集中在两个时段：
早盘第一小时（1274 万股，占全天 21%）与 13 时段探底（1116 万股）——对应恐慌盘与出逃盘；
而收盘竞价放量 256 万股、拉高 0.8 元，把收盘价从 VWAP 下方拉回 +0.10，全天买盘收盘时是保本状态而非被套。
结论：<strong>有出货、也有承接，不是单边逃命</strong>。5 日均量倍数「—」（港股 K 线接口失效，无法回溯均量序列），量比 2.53 为行情页实测值可替代。</div>'''

FLOW_HTML = '''<div class="news imp"><strong>南向资金（港股通）：全天净卖出 92.18 亿港元（近 7 周新高），但腾讯获净买入 4.89 亿港元，居全市场之首。</strong>
这是今日最重要的资金背离信号：市场整体恐慌性卖出中，内资选择逆势吸筹腾讯。对比：阿里巴巴遭净卖出 16.77 亿、中芯国际 9.11 亿、药明生物 6.42 亿。
腾讯成交额 128.38 亿港元居港股通成交榜首（沪 78.21 亿 + 深 50.17 亿），深市渠道净买入 7.06 亿、沪市净卖出 2.17 亿。前 5 日南向累计加仓 339 万股。</div>
<table>
<tr><th>资金层</th><th>今日净流向</th><th>说明</th></tr>
<tr><td>南向资金（内资）</td><td><span class="up">+4.89 亿港元</span></td><td>逆势净买入，居全市场之首（财联社/证券时报，收盘口径）</td></tr>
<tr><td>特大单 / 大单</td><td>—</td><td>westock 未授权，分层数据缺口</td></tr>
<tr><td>中单 / 小单</td><td>—</td><td>同上</td></tr>
<tr><td>内外盘</td><td>—</td><td>同上</td></tr>
<tr><td>委比</td><td><span class="up">+6.57%</span></td><td>盘口挂单小幅偏买（腾讯行情页）</td></tr>
</table>
<div class="hl"><strong>主力 vs 散户判断：</strong>特大单明细缺失，无法直接分层。但可从两条硬数据推断——
① 南向（机构+大户为主）净买入 4.89 亿与股价下跌背离，说明承接方以内资机构为主；
② 委比 +6.57% 说明尾盘盘口偏买。
综合看：<strong>今日下跌更像外资/被动盘抛售 + 内资承接</strong>，而非主力一致性出货。明日若南向继续净买入，则承接逻辑延续；若转为净卖出，背离失效。</div>'''

SHORT_HTML = '''<table>
<tr><th>指标</th><th>数值</th><th>口径</th></tr>
<tr><td>今日沽空金额</td><td>—</td><td>westock 未授权，今日数据缺口</td></tr>
<tr><td>今日沽空比率</td><td>—</td><td>同上</td></tr>
<tr><td>10/20 半日沽空（可参考）</td><td>沽空额 13.6 亿港元 · 比率 21.7%</td><td>AASTOCKS 半日口径（非今日，仅作水位参考）</td></tr>
<tr><td>结构性偏差说明</td><td colspan="2">腾讯为港股+ADR 三地上市标的，沽空数据含做市套利盘与 ADR 对冲盘，纯空头意图需剔除套利成分后判断</td></tr>
</table>
<div class="news warn">⚠️ 缺口声明：今日沽空金额/比率无法自动获取，不做推测。从 10/20 半日水位看（21.7%）沽空活跃度偏高，叠加今日放量下跌，空头参与度大概率不低，但具体数字以港交所次日披露为准。</div>'''

LEVEL_HTML = '''<table>
<tr><th>价位</th><th>依据</th><th>今日测试结果</th></tr>
<tr><td>393.80</td><td>昨收</td><td>未触及（低开后全天未收复）→ <strong>全天压制</strong></td></tr>
<tr><td>391.20</td><td>今日官方最高（竞价段）</td><td>竞价触及后即回落，连续交易未再上探 → 得而复失</td></tr>
<tr><td>390.00</td><td>整数关口</td><td>仅竞价段短暂触及，连续交易未守住 → <span class="dn">失守</span></td></tr>
<tr><td>387.00</td><td>今开 / 跳空缺口下沿</td><td>开盘即最高开盘价，随后跌破 → <span class="dn">跌破，缺口 387-393.8 未回补</span></td></tr>
<tr><td>382.30</td><td>VWAP（当日均价线）</td><td>全天多数时间在下方，收盘竞价收复 → <span class="up">险守</span></td></tr>
<tr><td>380.00</td><td>整数关口</td><td>13:51 跌破（378.4）后收复 → <span class="up">盘中假破位后收回</span></td></tr>
<tr><td><strong>378.40</strong></td><td><strong>52 周低点</strong></td><td>盘中触及并刷新 → <span class="dn"><strong>击破，创 52 周新低</strong></span></td></tr>
</table>
<div class="al"><strong>关键位结论：</strong>378.4 是今日新创的 52 周低点，也是明日的多空分水岭。
收盘 382.4 站回 380 整数关与 VWAP 上方，属于「创新低后被拉回」的弱平衡形态——不是止跌确认，只是没在最低点趴着。</div>'''

POS_CARDS = '''<div class="sc"><div class="lb">收盘位置</div><div class="vl">31.2%</div><div class="sb">(382.4-378.4)/(391.2-378.4)，偏下沿</div></div>
<div class="sc"><div class="lb">收盘 vs VWAP</div><div class="vl" style="color:var(--r)">+0.10</div><div class="sb">全天买盘收盘保本（收盘 382.4 &gt; VWAP 382.3）</div></div>
<div class="sc"><div class="lb">距 52 周高 656.35</div><div class="vl" style="color:var(--g)">-41.7%</div><div class="sb">距 52 周低 378.4 仅 1.06%</div></div>
<div class="sc"><div class="lb">区间涨跌</div><div class="vl" style="color:var(--g)">-2.89%</div><div class="sb">5 日 -9.68% · 20 日 -15.32% · 年初至今 -35.59%</div></div>'''

RS_HTML = '''<div class="hl"><strong>判定：被拖累（相对抗跌），风险相对可控。</strong>
腾讯 -2.89% vs 恒生指数 -3.03%（超额 +0.14pp）vs 恒生科技 -5.03%（超额 <strong>+2.14pp</strong>）vs 板块（数码解决方案服务）-3.09%（+0.20pp）。
对五大同业全面跑赢：阿里巴巴 -6.17%（+3.28pp）、中芯国际 -6.49%（+3.60pp）、美团 -4.55%（+1.66pp）、京东 -4.53%（+1.64pp）、小米 -4.18%（+1.29pp），同业均值 -5.18%，超额 +2.29pp。
<strong>但必须加一句：相对抗跌 ≠ 止跌。</strong>腾讯今日绝对价格仍创 52 周新低——它只是这轮科技杀跌里跌得最温柔的那个，方向上没有任何转强信号。
结合南向净买入 4.89 亿居首，相对抗跌的来源是内资定价权上升，而非基本面利好。</div>'''

TECH_HTML = '''<div class="al"><strong>数据缺口声明：港股 K 线接口全失效（三端点 404），MA / MACD / KDJ / RSI / BOLL 及 K 线形态全部无法自动计算，以下一律「—」，不做编造。</strong></div>
<table>
<tr><th>指标</th><th>状态</th><th>说明</th></tr>
<tr><td>K 线形态（十字星/锤子/吞没等）</td><td>—</td><td>无日 K 序列，仅知今日高开低走阴线（开 387 &gt; 收 382.4，上影 391.2，下影 378.4）</td></tr>
<tr><td>均线系统 MA5/10/20/60/250</td><td>—</td><td>港股 K 线接口失效</td></tr>
<tr><td>MACD</td><td>—</td><td>同上</td></tr>
<tr><td>KDJ (9,3,3)</td><td>—</td><td>同上</td></tr>
<tr><td>RSI</td><td>—</td><td>同上</td></tr>
<tr><td>BOLL (20,2)</td><td>—</td><td>同上</td></tr>
<tr><td>量价背离</td><td>今日量增价跌</td><td>量比 2.53 配 -2.89%，放量下跌，不构成底背离</td></tr>
</table>
<div class="news warn">可补录参考（人工口径）：行情页显示 5 日跌 9.68%、20 日跌 15.32%，均线系统大概率呈空头排列且股价位于所有常用均线下方；但此为推断，不作为指标结论使用。</div>'''

LINK_CARDS = '''<div class="sc"><div class="lb">恒生指数</div><div class="vl" style="color:var(--g)">-3.03%</div><div class="sb">22934.68，失守 23000</div></div>
<div class="sc"><div class="lb">恒生科技</div><div class="vl" style="color:var(--g)">-5.03%</div><div class="sb">3793.93，创 2024 年 924 以来新低</div></div>
<div class="sc"><div class="lb">ADR 溢价/折价</div><div class="vl">—</div><div class="sb">今日收盘口径数据缺口</div></div>
<div class="sc"><div class="lb">期权 IV / 人民币柜台</div><div class="vl">—</div><div class="sb">无自动源，恒缺口</div></div>
<div class="sc"><div class="lb">阿里巴巴</div><div class="vl" style="color:var(--g)">-6.17%</div><div class="sb">97.30，跌破 100 关口</div></div>
<div class="sc"><div class="lb">中芯国际</div><div class="vl" style="color:var(--g)">-6.49%</div><div class="sb">46.72，半导体重挫</div></div>'''

ANCHOR_HTML = '''<h3>估值锚</h3>
<table>
<tr><th>指标</th><th>当前值</th><th>水位判断</th></tr>
<tr><td>PE（TTM）</td><td>12.82</td><td>历史分位「—」；但市场定价叙事已从「现金流牛 20x」下修至「AI 烧钱成长 15-17x」（雷递网/机构口径）</td></tr>
<tr><td>PB</td><td>2.68</td><td>历史分位「—」</td></tr>
<tr><td>股息率</td><td>1.39%</td><td>回购贡献被计入股东回报</td></tr>
<tr><td>总市值</td><td>34,770 亿港元</td><td>年内市值蒸发约 35.6%</td></tr>
</table>
<h3>基本面事件锚</h3>
<div class="news imp"><strong>⚠️ 财报前窗口：三季报定于 2026-11-18 发布</strong>，距今约 4 周，本复盘处于财报前窗口内。</div>
<div class="news"><strong>回购动态：</strong>10 月 9-14 日连续每日回购约 1 亿港元（23.5-24.1 万股），自 5/13 授权以来累计回购约 5,022 万股、占已发行股本 0.55%。但报道称随财报临近进入静默期，回购或已暂停——「回购减少→股价失去托底」是 10 月以来的空头叙事之一，需关注后续翌日披露报表。</div>
<div class="news warn"><strong>AI 资本开支争议（本轮下跌的核心基本面）：</strong>2026Q2 单季 capex 528 亿元（同比 +176%），自由现金流首次转负至 -138 亿元；近期发行 18 亿美元 + 260 亿元人民币票据，多家机构下调盈利预测。中金测算美国 AI 七巨头 capex 增速将由 2026 年约 90% 降至 2027 年约 36%，整个 AI 链估值逻辑从「算力故事」切换为「资本回报约束」。上半年营收 4012 亿（+10%）、利润 1173.7 亿（+11%），基本盘仍稳——杀的是估值不是盈利。</div>'''

PLAN_HTML = '''<div class="pl">
<h4>📌 持仓股情景决策矩阵（腾讯为持仓标的）</h4>
<p>前提：今日 52 周新低 378.4 是分水岭；日均振幅 3.25% &gt; 2%，<strong>一律收盘价确认</strong>（防盘中假破位卖在最低）。</p>
<table>
<tr><th>大盘/板块 \\ 个股状态</th><th>强势突破（收盘收复 390）</th><th>温和反弹（385-390）</th><th>横盘（380-385）</th><th>继续下跌（收盘 378.4-380）</th><th>破位（收盘 &lt; 378.4）</th></tr>
<tr><td>恒科企稳反弹</td><td>可加仓 1 成<br><span class="tg tg-g">否决：若南向转净卖出或恒科冲高回落收阴 → 放弃加仓</span></td><td>持有</td><td>持有</td><td>持有观察</td><td>减仓 1 成<br><span class="tg tg-r">否决：若当日放量收复 380 且南向净买入 → 取消减仓</span></td></tr>
<tr><td>恒科横盘震荡</td><td>可加仓 1 成<br><span class="tg tg-g">否决：若量比 &lt; 1（无量突破）或南向净卖出 → 放弃</span></td><td>持有</td><td>持有</td><td>减仓 1 成<br><span class="tg tg-r">否决：若收盘站回 380 且南向续买 → 取消</span></td><td>减仓 2 成<br><span class="tg tg-r">否决：若收盘收复 380 → 取消</span></td></tr>
<tr><td>恒科继续破位下跌</td><td>持有（个股独立强势）</td><td>减仓 1 成<br><span class="tg tg-r">否决：若腾讯相对强度仍 &gt; +2pp 且南向净买入 → 取消</span></td><td>减仓 1 成<br><span class="tg tg-r">否决：若南向净买入 &gt; 5 亿 → 取消</span></td><td>减仓 2 成<br><span class="tg tg-r">否决：若收盘收复 385 → 取消</span></td><td><strong>止损离场（收盘价确认）</strong><br><span class="tg tg-r">否决：不设否决，收盘价 &lt; 378.4 即执行</span></td></tr>
</table>
</div>
<div class="pl">
<h4>📋 明日开盘后关键观察清单（按时间顺序）</h4>
<ul>
<li><strong>09:00-09:30 竞价：</strong>是否高开于 383 上方。高开 + 恒科同步高开 → 短线情绪修复；低开于 380 下方 → 52 周低点面临二次考验。</li>
<li><strong>09:30-10:30 早盘量能：</strong>对比今日同时段 1274 万股。缩量下跌 = 抛压衰竭可持有；再度放量下杀且跌破 380 → 触发减仓预案。</li>
<li><strong>全天盯 378.4 收盘价确认：</strong>盘中破 378.4 不动作（振幅 &gt; 2% 防假破位），只有<strong>收盘价</strong>站上 378.4 才算守住。</li>
<li><strong>南向资金方向（收盘后复核）：</strong>今日 +4.89 亿是核心背离支撑。连续第二日净买入 → 承接逻辑延续；转净卖出 → 背离失效，降仓应对。</li>
<li><strong>恒生科技 3800 点：</strong>今日已跌破，若连续两日收不回 3800，板块 beta 压力继续压制腾讯反弹空间。</li>
<li><strong>回购公告（次日盘前）：</strong>若恢复回购（翌日披露报表出现购回），是托底信号；继续沉默则「回购退场」叙事延续。</li>
<li><strong>相对强度监测：</strong>若腾讯跌幅开始与同业趋同（超额收敛到 0 附近），说明补跌开始，「相对抗跌」逻辑失效 → 转入减仓节奏。</li>
</ul>
</div>
<div class="al"><strong>反向否决条款总原则：</strong>加仓必配放弃条件、减仓必配取消条件、减仓不设「反弹至 X 才减」目标价（今日已创新低，破位不等反弹）、止损一律收盘价确认。任何预案在南向资金方向反转时优先让位于资金面信号。</div>'''

FOOTER = (
    '数据来源：① 腾讯分时（web.ifzq.gtimg.cn minute/query，332 根，2026-10-22 实时拉取）；'
    '② 新浪快照（hq.sinajs.cn，含同业与指数，收盘价经分时末点/腾讯行情页/新华社收评三源交叉定稿）；'
    '③ 腾讯行情页 gu.qq.com/hk00700（量比/委比/换手/PE/PB/市值/52 周高低）；'
    '④ 财联社/证券时报（南向资金收盘口径）；⑤ 新华社/澎湃/界面/第一财经（收盘稿归因，仅采信收评类稿件）；'
    '⑥ 港交所翌日披露报表（回购数据）。'
    '数据时效：行情截至 2026-10-22 16:08 收盘竞价定格；南向/沽空为收盘后披露口径。'
    '缺口声明：港股 K 线接口失效 → 技术指标全「—」；westock 未授权 → 特大/大/中/小单分层与今日沽空「—」；'
    'ADR 溢价/期权 IV/人民币柜台/估值历史分位恒「—」。'
    '免责声明：本报告为个人盘面复盘记录，不构成任何投资建议；股市有风险，决策需结合自身风险承受能力。'
)

# ---------- 图表 JS ----------
def js_arr(vals):
    return '[' + ','.join(str(v) for v in vals) + ']'

def js_str_arr(vals):
    return '[' + ','.join("'" + str(v) + "'" for v in vals) + ']'

CHART_JS = (
    "// 图1 分时\n"
    "var c1 = echarts.init(document.getElementById('chart_intraday'));\n"
    "c1.setOption({\n"
    "  title:{text:'腾讯控股 00700 分时（2026-10-22）',left:0,textStyle:{fontSize:14}},\n"
    "  tooltip:{trigger:'axis'},\n"
    "  legend:{data:['价格','VWAP'],top:26},\n"
    "  grid:{left:50,right:20,top:60,bottom:30},\n"
    "  xAxis:{type:'category',data:" + js_str_arr(tx_t) + ",axisLabel:{fontSize:10}},\n"
    "  yAxis:{type:'value',scale:true,axisLabel:{fontSize:10}},\n"
    "  series:[\n"
    "    {name:'价格',type:'line',smooth:true,showSymbol:false,data:" + js_arr(tx_p) + ",\n"
    "     lineStyle:{width:2,color:'#3498db'},\n"
    "     markLine:{silent:true,symbol:'none',lineStyle:{type:'dashed',color:'#e74c3c'},\n"
    "       data:[{yAxis:393.8,name:'昨收 393.8'},{yAxis:382.3,name:'VWAP 382.3'},{yAxis:378.4,name:'52周低 378.4'}],\n"
    "       label:{fontSize:10,formatter:'{b}'}},\n"
    "     markPoint:{data:[{coord:['1351',378.6],name:'52周新低',itemStyle:{color:'#27ae60'}}],\n"
    "       label:{fontSize:10}}\n"
    "    }\n"
    "  ]\n"
    "});\n"
    "\n"
    "// 图2 资金（南向净流向，分层数据缺口）\n"
    "var c2 = echarts.init(document.getElementById('chart_flow'));\n"
    "c2.setOption({\n"
    "  title:{text:'南向资金今日净流向（亿港元）· 特大/大/中/小单分层数据缺口',left:0,textStyle:{fontSize:14}},\n"
    "  tooltip:{},\n"
    "  grid:{left:90,right:30,top:50,bottom:30},\n"
    "  xAxis:{type:'value',axisLabel:{fontSize:10}},\n"
    "  yAxis:{type:'category',data:['腾讯控股','南方恒生科技','伟禄科技','长飞光纤','药明生物','中芯国际','阿里巴巴'],axisLabel:{fontSize:11}},\n"
    "  series:[{type:'bar',barWidth:18,\n"
    "    data:[{value:4.89,itemStyle:{color:'#e74c3c'}},{value:1.92,itemStyle:{color:'#e74c3c'}},\n"
    "          {value:2.51,itemStyle:{color:'#e74c3c'}},{value:-3.83,itemStyle:{color:'#27ae60'}},\n"
    "          {value:-6.42,itemStyle:{color:'#27ae60'}},{value:-9.11,itemStyle:{color:'#27ae60'}},\n"
    "          {value:-16.77,itemStyle:{color:'#27ae60'}}],\n"
    "    label:{show:true,position:'right',fontSize:10,formatter:'{c}'}\n"
    "  }]\n"
    "});\n"
    "\n"
    "// 图3 归一化相对强度\n"
    "var c3 = echarts.init(document.getElementById('chart_rs'));\n"
    "c3.setOption({\n"
    "  title:{text:'归一化对比（昨收=100）',left:0,textStyle:{fontSize:14}},\n"
    "  tooltip:{trigger:'axis'},\n"
    "  legend:{data:['腾讯','恒生指数','恒生科技'],top:26},\n"
    "  grid:{left:50,right:20,top:60,bottom:30},\n"
    "  xAxis:{type:'category',data:" + js_str_arr(rs_t) + ",axisLabel:{fontSize:10}},\n"
    "  yAxis:{type:'value',scale:true,axisLabel:{fontSize:10}},\n"
    "  series:[\n"
    "    {name:'腾讯',type:'line',smooth:true,showSymbol:false,data:" + js_arr(rs_tx) + ",lineStyle:{width:2.2,color:'#e74c3c'}},\n"
    "    {name:'恒生指数',type:'line',smooth:true,showSymbol:false,data:" + js_arr(rs_hsi) + ",lineStyle:{width:1.6,color:'#7f8c8d'}},\n"
    "    {name:'恒生科技',type:'line',smooth:true,showSymbol:false,data:" + js_arr(rs_hst) + ",lineStyle:{width:1.6,color:'#3498db'}}\n"
    "  ]\n"
    "});\n"
    "window.addEventListener('resize',function(){c1.resize();c2.resize();c3.resize();});"
)

# ---------- 替换 ----------
repl = {
    '@@TITLE@@': TITLE, '@@H1@@': H1,
    '@@META1@@': META1, '@@META2@@': META2, '@@META3@@': META3,
    '@@TLDR@@': TLDR,
    '@@TIMELINE_HTML@@': TIMELINE_HTML, '@@PIVOT_HTML@@': PIVOT_HTML,
    '@@VOL_CARDS@@': VOL_CARDS, '@@VOL_JUDGE_HTML@@': VOL_JUDGE_HTML,
    '@@FLOW_HTML@@': FLOW_HTML, '@@SHORT_HTML@@': SHORT_HTML,
    '@@LEVEL_HTML@@': LEVEL_HTML, '@@POS_CARDS@@': POS_CARDS,
    '@@RS_HTML@@': RS_HTML, '@@TECH_HTML@@': TECH_HTML,
    '@@LINK_CARDS@@': LINK_CARDS, '@@ANCHOR_HTML@@': ANCHOR_HTML,
    '@@PLAN_HTML@@': PLAN_HTML, '@@FOOTER@@': FOOTER,
    '@@CHART_JS@@': CHART_JS,
}
h = TPL
for k, v in repl.items():
    h = h.replace(k, v)

# 港股 K 线失效时 chart_intraday 保留（有分时数据）——有数据无需替换容器
open(OUT, 'w', encoding='utf-8').write(h)
print('written', OUT, len(h))
