# -*- coding: utf-8 -*-
"""腾讯控股 00700 个股复盘 · 小红书图文卡片（1080x1440, 2x 输出 2160x2880）"""
import os, subprocess, json

OUT_DIR = '/Users/aiming/Documents/workspace/code/mine/stock_monitor/outputs/xhs_tencent_20261022'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
os.makedirs(OUT_DIR, exist_ok=True)

DATE = '2026.10.22'
NAME = '腾讯控股 00700'

# ---------- 分时 SVG 路径（生成内嵌 sparkline） ----------
d = json.load(open('/tmp/tencent_minute.json'))
rows = d['data']['hk00700']['data']['data']
pts = []
for r in rows:
    p = r.split()
    pts.append((p[0], float(p[1])))
# 采样每 3 分钟
samp = pts[::3]
if samp[-1][0] != pts[-1][0]:
    samp.append(pts[-1])
W, H = 920, 300
prices = [p[1] for p in samp]
pmin, pmax = min(prices) - 0.8, max(prices) + 0.8
def sx(i): return 20 + i * (W - 40) / (len(samp) - 1)
def sy(v): return 24 + (pmax - v) / (pmax - pmin) * (H - 48)
poly = ' '.join('%.1f,%.1f' % (sx(i), sy(p[1])) for i, p in enumerate(samp))
# VWAP 382.3 水平线 + 52周低 378.4 参考线（昨收 393.8 在图外，另注文字）
y_vwap = sy(382.3); y_low = sy(378.4)
area = poly + ' %.1f,%.1f %.1f,%.1f' % (sx(len(samp)-1), H-20, sx(0), H-20)
lo_idx = next((i for i, p in enumerate(samp) if p[0] == '1351'), len(samp) // 2)
SPARK = (
    '<svg width="%d" height="%d" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg">'
    '<rect width="%d" height="%d" fill="#fff" rx="16"/>'
    '<line x1="20" y1="%.1f" x2="%d" y2="%.1f" stroke="#8A7A6A" stroke-width="1.5" stroke-dasharray="5 4"/>'
    '<line x1="20" y1="%.1f" x2="%d" y2="%.1f" stroke="#E23C3C" stroke-width="1.5" stroke-dasharray="4 4"/>'
    '<polygon points="%s" fill="rgba(46,139,87,0.10)"/>'
    '<polyline points="%s" fill="none" stroke="#16A34A" stroke-width="3" stroke-linejoin="round"/>'
    '<text x="%d" y="%.1f" font-size="15" fill="#8A7A6A" font-family="PingFang SC">VWAP 382.3</text>'
    '<text x="%d" y="%.1f" font-size="15" fill="#E23C3C" font-family="PingFang SC">52周低 378.4</text>'
    '<text x="%d" y="18" font-size="15" fill="#B0A8A0" font-family="PingFang SC">昨收 393.8 在图外（低开缺口 387-393.8 未回补）</text>'
    '<circle cx="%.1f" cy="%.1f" r="6" fill="#16A34A"/>'
    '<text x="%d" y="%d" font-size="15" fill="#16A34A" font-family="PingFang SC">13:51 低点 378.6 → 收盘竞价拉回 382.4</text>'
    '</svg>'
) % (W, H, W, H, W, H,
     y_vwap, W-20, y_vwap,
     y_low, W-20, y_low,
     area, poly,
     30, y_vwap - 8,
     W - 200, y_low + 22,
     26,
     sx(lo_idx), sy(378.6),
     30, H - 28)

# ---------- 共享 CSS（沿用大盘卡片视觉语言） ----------
CSS = '''
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1440px;overflow:hidden;}
body{font-family:"PingFang SC",-apple-system,"Microsoft YaHei",sans-serif;background:#FBF6F0;color:#1F1F1F;position:relative;}
.card{width:1080px;height:1440px;padding:64px 56px 96px;display:flex;flex-direction:column;}
.bg-deco{position:absolute;top:-140px;right:-140px;width:440px;height:440px;border-radius:50%;background:radial-gradient(circle,#FFE3E8 0%,rgba(255,227,232,0) 70%);z-index:0;}
.inner{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;}
.tag{display:inline-flex;align-items:center;gap:10px;background:#FF2442;color:#fff;font-size:24px;font-weight:600;padding:10px 22px;border-radius:999px;align-self:flex-start;letter-spacing:1px;}
h1{font-size:80px;font-weight:800;line-height:1.08;margin-top:30px;letter-spacing:2px;}
.sub{font-size:32px;color:#6B6B6B;margin-top:20px;font-weight:500;line-height:1.5;}
.h2{font-size:44px;font-weight:800;margin:0 0 10px;display:flex;align-items:center;gap:14px;}
.h2 .bar{width:9px;height:36px;background:#FF2442;border-radius:5px;display:inline-block;}
.h2note{font-size:25px;color:#9A9A9A;margin-bottom:24px;font-weight:400;}
.panel{background:#fff;border-radius:24px;padding:28px 32px;box-shadow:0 8px 24px rgba(0,0,0,0.05);margin-bottom:22px;}
.up{color:#E23C3C;}
.dn{color:#16A34A;}
.footer{position:absolute;bottom:0;left:0;right:0;height:76px;background:#1F1F1F;color:#fff;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:600;letter-spacing:2px;z-index:2;}
.footer b{color:#FF2442;margin:0 6px;}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.kpi{background:#fff;border-radius:20px;padding:28px 18px;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,0.05);}
.kpi .lb{font-size:24px;color:#8A8A8A;}
.kpi .vl{font-size:48px;font-weight:800;margin-top:8px;}
.row{display:flex;justify-content:space-between;align-items:center;padding:15px 0;border-bottom:1px solid #F2ECE4;}
.row:last-child{border-bottom:none;}
.row .k{font-size:26px;font-weight:700;width:210px;}
.row .v{font-size:25px;color:#4A4A4A;text-align:right;flex:1;}
.chip{display:inline-block;background:#F6F1EA;border-radius:12px;padding:10px 18px;font-size:24px;margin:6px 8px 6px 0;}
'''

def render(body, footer='个股复盘 · 腾讯控股 · 不构成投资建议'):
    return ('<!DOCTYPE html><html><head><meta charset="utf-8"><style>%s</style></head><body>'
            '<div class="bg-deco"></div><div class="card"><div class="inner">%s</div></div>'
            '<div class="footer">%s</div></body></html>') % (CSS, body, footer)

# ---------- 卡片 1 封面 ----------
def card1():
    # (标签, 数值, 颜色类, 副注)
    kpis = [
        ('收盘价', '382.4', 'dn', '−2.89%'),
        ('成交额', '232.4亿', '', '量比 2.53'),
        ('距52周高', '−41.7%', 'dn', '高点 656.35'),
        ('南向资金', '+4.89亿', 'up', '净买入居首'),
    ]
    grid = ''.join(
        '<div class="kpi"><div class="lb">%s</div><div class="vl %s">%s</div>'
        '<div style="font-size:22px;color:#A39A90;margin-top:8px;">%s</div></div>' % (lb, cls, vl, sb)
        for lb, vl, cls, sb in kpis
    )
    body = (
        '<span class="tag">📊 个股复盘 · %s · %s</span>' % (NAME, DATE) +
        '<h1>放量杀跌<br/>创 <span class="dn">52周新低</span></h1>' +
        '<div class="sub">但南向资金逆势净买入 4.89 亿居全市场之首<br/>恐慌盘里，有人在接</div>' +
        '<div class="kpi-grid" style="margin-top:44px;">%s</div>' % grid +
        '<div class="panel" style="margin-top:26px;display:flex;justify-content:space-between;align-items:center;padding:30px;">'
        '<div style="text-align:center;"><div style="font-size:23px;color:#8A8A8A;">恒生指数</div>'
        '<div style="font-size:40px;font-weight:800;margin-top:8px;" class="dn">-3.03%</div></div>'
        '<div style="width:1px;height:64px;background:#EFE7DC;"></div>'
        '<div style="text-align:center;"><div style="font-size:23px;color:#8A8A8A;">恒生科技</div>'
        '<div style="font-size:40px;font-weight:800;margin-top:8px;" class="dn">-5.03%</div></div>'
        '<div style="width:1px;height:64px;background:#EFE7DC;"></div>'
        '<div style="text-align:center;"><div style="font-size:23px;color:#8A8A8A;">腾讯超额</div>'
        '<div style="font-size:40px;font-weight:800;margin-top:8px;" class="up">+2.14pp</div></div>'
        '</div>' +
        '<div style="margin-top:auto;background:#1F1F1F;color:#fff;border-radius:22px;padding:28px 32px;">'
        '<div style="font-size:25px;font-weight:800;margin-bottom:10px;">📌 今日一句话</div>'
        '<div style="font-size:26px;line-height:1.6;color:#E8E2DA;">'
        '低开 1.7% 后单边阴跌，13:51 刺穿 378.4 创 52 周新低。量比 2.53 放量下跌，'
        '但跑赢恒生科技 2.14pp、跑赢全部同业——是「被拖累」不是「独立杀跌」。</div></div>' +
        '<div style="text-align:center;font-size:26px;color:#B0A8A0;padding:20px 0 4px;">右滑看完整复盘 →</div>'
    )
    return render(body, '腾讯 00700 日内复盘 · 关注不迷路')

# ---------- 卡片 2 时间轴 + 分时图 ----------
def card2():
    rows = [
        ('竞价', '387.0 低开 -1.73%', '缺口未回补'),
        ('早盘', '387 → 380.6', '第一小时占全天量 21%'),
        ('午盘', '探 378.4 52周新低', '13:51 触底后回升'),
        ('尾盘', '横盘 381.4-381.6', '缩量观望'),
        ('收盘竞价', '381.6 → 382.4', '竞价 9.78 亿拉高 0.8 元'),
    ]
    rows_html = ''.join(
        '<div class="row"><div class="k">%s</div><div class="v">%s<span style="color:#B0A8A0;font-size:21px;"> · %s</span></div></div>' % r
        for r in rows
    )
    body = (
        '<div class="h2"><span class="bar"></span>今日分时：一路阴跌</div>'
        '<div class="h2note">早盘放量杀跌 → 午后创52周新低 → 竞价拉回收盘</div>'
        '<div class="panel" style="padding:18px;">%s</div>' % SPARK +
        '<div class="panel">%s</div>' % rows_html +
        '<div class="panel" style="background:#FFF7F7;">'
        '<div style="font-size:26px;font-weight:800;color:#E23C3C;margin-bottom:10px;">⚠️ 收盘价口径</div>'
        '<div style="font-size:24px;line-height:1.65;color:#4A4A4A;">'
        '新浪盘后快照停在竞价前 382.0，真实收盘是 16:08 竞价定格 <b>382.4</b>（腾讯行情页/新华社收评一致），'
        '涨跌幅 <b class="dn">-2.89%</b>。</div></div>'
    )
    return render(body)

# ---------- 卡片 3 量价 + 资金背离 ----------
def card3():
    # (标签, 数值, 颜色类)
    kpis = [
        ('成交额', '232.4亿', ''), ('量比', '2.53', 'up'),
        ('VWAP', '382.30', ''), ('收盘位置', '31.2%', 'dn'),
    ]
    grid = ''.join(
        '<div class="kpi"><div class="lb">%s</div><div class="vl %s">%s</div></div>' % (lb, cls, vl)
        for lb, vl, cls in kpis
    )
    body = (
        '<div class="h2"><span class="bar"></span>量价：放量下跌</div>'
        '<div class="h2note">但收盘竞价把价格拉回 VWAP 上方，买盘收盘保本</div>'
        '<div class="kpi-grid">%s</div>' % grid +
        '<div class="panel" style="margin-top:22px;">'
        '<div style="font-size:26px;font-weight:800;margin-bottom:12px;">形态定性</div>'
        '<div style="font-size:25px;line-height:1.75;color:#4A4A4A;">'
        '量比 2.53 显著放量 + 下跌 2.89%，教科书是「放量下跌＝出货」。<br/>'
        '但量能集中在<b>早盘第一小时</b>（占 21%）和<b>午后探底</b>；'
        '收盘竞价反而放量 256 万股把收盘拉高 0.8 元——<b>有出货、也有承接</b>。</div></div>' +
        '<div class="panel" style="background:#FFF7F7;">'
        '<div style="font-size:27px;font-weight:800;color:#E23C3C;margin-bottom:12px;">💰 最关键的资金背离</div>'
        '<div style="font-size:25px;line-height:1.75;color:#4A4A4A;">'
        '南向资金今日全市场<b class="dn">净卖出 92.18 亿</b>（近 7 周新高），'
        '但<b class="up">净买入腾讯 4.89 亿港元，居全市场之首</b>。<br/>'
        '对比：阿里被卖 16.77 亿、中芯被卖 9.11 亿。<br/>'
        '前 5 日南向累计加仓 339 万股。</div></div>' +
        '<div class="panel">'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '委比 <b class="up">+6.57%</b> · 换手 0.67% · 全天买盘收盘保本（收盘 382.4 &gt; VWAP 382.3）</div></div>'
    )
    return render(body)

# ---------- 卡片 4 关键位 + 相对强度 ----------
def card4():
    levels = [
        ('393.8 昨收', '未触及 · 全天压制', 'dn'),
        ('390 整数关', '竞价短暂触及即失守', 'dn'),
        ('387 今开/缺口', '跌破 · 缺口未回补', 'dn'),
        ('382.3 VWAP', '收盘竞价收复 · 险守', 'up'),
        ('380 整数关', '盘中跌破后收回', 'up'),
        ('378.4 52周低', '盘中刷新 · 创新低', 'dn'),
    ]
    lv_html = ''.join(
        '<div class="row"><div class="k">%s</div><div class="v %s">%s</div></div>' % (a, c, b)
        for a, b, c in levels
    )
    peers = [('阿里巴巴', '-6.17%'), ('中芯国际', '-6.49%'), ('美团', '-4.55%'),
             ('京东集团', '-4.53%'), ('小米集团', '-4.18%'), ('腾讯控股', '-2.89%')]
    peer_html = ''.join(
        '<div class="row"><div class="k" style="width:170px;">%s</div>'
        '<div class="v dn" style="font-weight:800;">%s</div></div>' % p for p in peers
    )
    body = (
        '<div class="h2"><span class="bar"></span>关键位 + 相对强度</div>'
        '<div class="h2note">378.4 是明日多空分水岭；相对抗跌 ≠ 止跌</div>'
        '<div class="panel">%s</div>' % lv_html +
        '<div class="panel">'
        '<div style="font-size:26px;font-weight:800;margin-bottom:8px;">⚖️ 同业跌幅对比（腾讯最抗跌）</div>'
        '%s</div>' % peer_html +
        '<div class="panel" style="background:#F0F7FF;">'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '判定：<b>被拖累（相对抗跌）</b>。超额 vs 恒生科技 <b class="up">+2.14pp</b>、'
        'vs 同业均值 <b class="up">+2.29pp</b>。'
        '但绝对价格仍创 52 周新低——只是这轮杀跌里跌得最温柔的那个。</div></div>'
    )
    return render(body)

# ---------- 卡片 5 为什么跌 ----------
def card5():
    body = (
        '<div class="h2"><span class="bar"></span>为什么跌？三重压力</div>'
        '<div class="h2note">利率 + AI 估值逻辑切换 + 资金面，港股科技共振杀跌</div>'
        '<div class="panel">'
        '<div style="font-size:27px;font-weight:800;margin-bottom:12px;">🇺🇸 ① 美债利率高企</div>'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '10 年期美债收益率仍在 5% 上方，30 年期处近 20 年高位。美国通胀回升巩固「长期高利率」预期，'
        '贴现率抬升直接压缩成长股远期现金流估值。</div></div>' +
        '<div class="panel">'
        '<div style="font-size:27px;font-weight:800;margin-bottom:12px;">🤖 ② AI 定价范式切换（核心）</div>'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '资金把科技股从「算力需求故事」重估为「资本回报约束」。'
        '腾讯 Q2 资本开支 <b>528 亿（+176%）</b>，自由现金流首次转负 <b class="dn">-138 亿</b>；'
        '中金测算 AI 七巨头 capex 增速将从 2026 约 90% 降至 2027 约 36%。'
        '市场把腾讯从「现金流牛 20x」下修到「烧钱成长 15-17x」。</div></div>' +
        '<div class="panel">'
        '<div style="font-size:27px;font-weight:800;margin-bottom:12px;">💸 ③ 资金面流出</div>'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '南向今日净卖出 92.18 亿创近 7 周新高；昨日南向净卖出腾讯 17.06 亿居首。'
        '回购金额从高峰缩水至每日约 1 亿港元，且财报临近静默期或暂停——'
        '「回购退场」成为空头叙事之一。</div></div>' +
        '<div class="panel" style="background:#F6F1EA;">'
        '<div style="font-size:24px;line-height:1.65;color:#4A4A4A;">'
        '大盘背景：恒指 -3.03% 失守 23000，恒生科技 -5.03% 创 2024 年 924 以来新低，'
        '阿里跌破 100、半导体重挫。腾讯是被板块拖下水的。</div></div>'
    )
    return render(body)

# ---------- 卡片 6 估值 + 事件 ----------
def card6():
    # (标签, 数值, 颜色类)
    vals = [
        ('PE (TTM)', '12.82', ''), ('PB', '2.68', ''),
        ('股息率', '1.39%', ''), ('总市值', '3.48万亿', ''),
    ]
    grid = ''.join(
        '<div class="kpi"><div class="lb">%s</div><div class="vl %s">%s</div></div>' % (lb, cls, vl)
        for lb, vl, cls in vals
    )
    body = (
        '<div class="h2"><span class="bar"></span>估值锚 + 关键事件</div>'
        '<div class="h2note">杀的是估值不是盈利 · 财报前窗口已开启</div>'
        '<div class="kpi-grid">%s</div>' % grid +
        '<div class="panel" style="margin-top:22px;">'
        '<div style="font-size:26px;font-weight:800;margin-bottom:12px;">📉 区间表现</div>'
        '<div class="row"><div class="k">5 日</div><div class="v dn">-9.68%</div></div>'
        '<div class="row"><div class="k">20 日</div><div class="v dn">-15.32%</div></div>'
        '<div class="row"><div class="k">年初至今</div><div class="v dn">-35.59%</div></div>'
        '<div class="row"><div class="k">距 52 周高</div><div class="v dn">-41.7%</div></div>'
        '</div>' +
        '<div class="panel" style="background:#FFF7F7;">'
        '<div style="font-size:27px;font-weight:800;color:#E23C3C;margin-bottom:12px;">⚠️ 财报前窗口</div>'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '<b>三季报 2026-11-18 发布</b>，距今约 4 周。上半年营收 4012 亿（+10%）、'
        '利润 1173.7 亿（+11%）基本盘仍稳。回购 10 月每日约 1 亿港元，'
        '累计已回购 5022 万股（占股本 0.55%），但静默期或已暂停。</div></div>' +
        '<div class="panel">'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '多家机构下调盈利预测；发行 18 亿美元 + 260 亿人民币票据补充弹药。'
        '市场在等三季报回答一个问题：<b>AI 烧掉的钱，什么时候能赚回来？</b></div></div>'
    )
    return render(body)

# ---------- 卡片 7 明日推演 ----------
def card7():
    plan = [
        ('高开 &gt; 383', '持有，看恒科能否同步企稳'),
        ('平开 380-383', '持有观察，盯 378.4 收盘确认'),
        ('低开 &lt; 380', '不割肉，看南向是否续买'),
        ('收盘 &lt; 378.4', '止损减仓（收盘价确认）'),
    ]
    plan_html = ''.join(
        '<div class="row"><div class="k" style="width:220px;">%s</div><div class="v">%s</div></div>' % p
        for p in plan
    )
    watch = [
        '竞价是否高开 383 上方',
        '早盘量能 vs 今日 1274 万股',
        '378.4 收盘价确认（振幅&gt;2% 一律收盘确认）',
        '南向资金是否连续第二日净买入',
        '恒生科技能否收回 3800',
        '回购公告是否恢复',
        '相对强度超额是否收敛（补跌信号）',
    ]
    watch_html = ''.join(
        '<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #F2ECE4;font-size:23px;line-height:1.45;">'
        '<span>🔍</span><span>%s</span></div>' % w for w in watch
    )
    body = (
        '<div class="h2"><span class="bar"></span>明日怎么应对？</div>'
        '<div class="h2note">持仓股情景推演 · 每条预案都带反向否决</div>'
        '<div class="panel" style="background:#FFF7F7;display:flex;align-items:center;justify-content:space-between;padding:22px 32px;margin-bottom:18px;">'
        '<div><div style="font-size:24px;color:#8A8A8A;">多空分水岭</div>'
        '<div style="font-size:42px;font-weight:800;color:#E23C3C;margin-top:6px;">378.4</div></div>'
        '<div style="text-align:right;font-size:24px;color:#4A4A4A;line-height:1.5;">52 周低点<br/>收盘价确认口径</div></div>'
        '<div class="panel" style="margin-bottom:18px;">%s</div>' % plan_html +
        '<div class="panel" style="margin-bottom:18px;"><div style="font-size:25px;font-weight:800;margin-bottom:6px;">📋 关键观察清单</div>%s</div>' % watch_html +
        '<div class="panel" style="background:#F0F7FF;padding:22px 30px;margin-bottom:0;">'
        '<div style="font-size:23px;line-height:1.65;color:#4A4A4A;">'
        '<b>反向否决原则：</b>加仓必配放弃条件（南向转卖出→放弃）；'
        '减仓必配取消条件（放量收复 385 且资金转净流入→取消）；'
        '破位不等反弹、不设「反弹至 X 才减」目标价；止损一律收盘价确认。</div></div>' +
        '<div style="font-size:21px;color:#B0A8A0;text-align:center;margin-top:8px;">'
        '数据截至 10/22 收盘 · 缺口：做空/特大单分层/技术指标（港股K线失效）· 不构成投资建议</div>'
    )
    return render(body, '数据来源：腾讯分时/新浪/财联社/港交所 · 不构成投资建议')

# ---------- 生成 + 截图 ----------
cards = [card1, card2, card3, card4, card5, card6, card7]
for i, fn in enumerate(cards, 1):
    html = fn()
    hp = os.path.join(OUT_DIR, 'card%d.html' % i)
    with open(hp, 'w', encoding='utf-8') as f:
        f.write(html)
    png = os.path.join(OUT_DIR, 'card%d.png' % i)
    cmd = [
        CHROME, '--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
        '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=1080,1440',
        '--user-data-dir=/tmp/chrome-xhs-tx-%d' % i,
        '--screenshot=%s' % png, 'file://%s' % hp,
    ]
    r = subprocess.run(cmd, check=True, capture_output=True, timeout=90)
    print('generated', png, os.path.getsize(png))

print('DONE')
