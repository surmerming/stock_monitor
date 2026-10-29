# -*- coding: utf-8 -*-
"""生成小红书图文风格的大盘复盘卡片（1080x1440, 2x 输出 2160x2880），并用 Chrome headless 截图渲染为 PNG。"""
import os, subprocess

OUT_DIR = '/Users/aiming/Documents/workspace/code/mine/stock_monitor/outputs/xhs_20261022'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# ---------- 数据 ----------
DATE = '2026.10.22'
TITLE = '黑色星期四'
SUBTITLE = 'A股·港股全线大跌，科技重挫'

A_INDEX = [
    ('上证指数', '3658.03', '-1.48%', '跌破3700 · 创1年新低'),
    ('深证成指', '11357.32', '-2.96%', '创14个月新低'),
    ('创业板指', '2576.90', '-4.37%', '领跌 · 光头光脚阴线'),
    ('科创50', '1305.87', '-2.78%', '成长股实质重挫'),
    ('沪深300', '4036.30', '-1.84%', '权重相对抗跌'),
    ('北证50', '966.74', '-0.93%', '小微盘略强'),
]
HK_INDEX = [
    ('恒生指数', '22934.68', '-3.03%', '失守23000关口'),
    ('恒生科技', '3793.93', '-5.03%', '创2年多新低'),
    ('国企指数', '7689.19', '-3.20%', '中资股普跌'),
]

UP_BOARD = [('电机制造', '人形机器人 · 马斯克放话'), ('工程机械', '9月挖掘机内销+7.16%'), ('医疗美容', '逆市避险'), ('地面兵装', '军工反弹'), ('电信运营', '高股息护盘')]
DOWN_BOARD = [('通信', '-6.17%'), ('传媒', '-4.78%'), ('电子', '-3.60%'), ('光模块/CPO', 'AI算力链领跌'), ('PCB/元件', '算力硬件杀跌')]

MSG_LI = [
    '🤖 马斯克：人形机器人将成全球最大产业，机器人数量将超人类',
    '🚜 9月挖掘机内销同比+7.16%（较8月+3.24pct），1-9月累计+16.3%',
    '🛡️ 尾盘沪深300ETF放量：嘉实全天105亿，尾盘15分钟68.5亿',
]
MSG_LK = [
    '🇺🇸 美国通胀回升 → 长期高利率预期，全球科技股承压',
    '📉 AI资本开支增速或由2026约90%骤降至2027约36%，头部厂商增长放缓担忧升温',
    '💸 主力资金净流出540.55亿，连续12个交易日净流出',
    '🇭🇰 南向资金单日净卖出92.18亿港元，加速减持半导体/硬件',
]

ADVICE = {
    'tone': '防守（3~5成内）',
    'tone_note': '反弹不追高，逢高减仓',
    'focus': ['机器人·电机', '工程机械', '高股息(银行/电信)'],
    'avoid': ['AI算力/光模块/CPO/PCB', '半导体', '传媒影视(AI应用)'],
    'risk': [
        '创业板/恒科若继续破位，警惕情绪踩踏',
        '今晚美股科技股若续跌，明日两地低开',
        '涨跌停倒挂后修复易反复，右侧确认再加',
    ],
    'plan': [
        ('高开冲高', '不追，逢高减仓'),
        ('低开急杀', '不割肉，看宽基ETF承接力度'),
        ('平开震荡', '观望，等情绪与量能确认'),
    ],
}

# ---------- 共享 CSS ----------
CSS = '''
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1440px;overflow:hidden;}
body{
  font-family:"PingFang SC",-apple-system,"Microsoft YaHei",sans-serif;
  background:#FBF6F0;color:#1F1F1F;
  position:relative;
}
.card{width:1080px;height:1440px;padding:64px 56px 96px;display:flex;flex-direction:column;}
.bg-deco{position:absolute;top:-140px;right:-140px;width:440px;height:440px;border-radius:50%;background:radial-gradient(circle,#FFE3E8 0%,rgba(255,227,232,0) 70%);z-index:0;}
.inner{position:relative;z-index:1;display:flex;flex-direction:column;flex:1;}
.tag{display:inline-flex;align-items:center;gap:10px;background:#FF2442;color:#fff;font-size:24px;font-weight:600;padding:10px 22px;border-radius:999px;align-self:flex-start;letter-spacing:1px;}
h1{font-size:84px;font-weight:800;line-height:1.06;margin-top:32px;letter-spacing:2px;}
.sub{font-size:34px;color:#6B6B6B;margin-top:22px;font-weight:500;}
.h2{font-size:46px;font-weight:800;margin:0 0 10px;display:flex;align-items:center;gap:14px;}
.h2 .bar{width:9px;height:38px;background:#FF2442;border-radius:5px;display:inline-block;}
.h2note{font-size:26px;color:#9A9A9A;margin-bottom:26px;font-weight:400;}
.panel{background:#fff;border-radius:24px;padding:30px 34px;box-shadow:0 8px 24px rgba(0,0,0,0.05);margin-bottom:24px;}
.up{color:#E23C3C;}
.dn{color:#16A34A;}
.footer{position:absolute;bottom:0;left:0;right:0;height:76px;background:#1F1F1F;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:600;letter-spacing:2px;z-index:2;}
.footer b{color:#FF2442;margin:0 6px;}
'''

def render(body_html, footer='每日大盘复盘 · 关注不迷路'):
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>%s</style></head><body><div class="bg-deco"></div><div class="card"><div class="inner">%s</div></div><div class="footer">%s</div></body></html>' % (CSS, body_html, footer)

def index_bars(items):
    """指数行：名称 + 收盘 + 涨跌幅 + 备注"""
    rows = []
    for name, close, chg, note in items:
        color = '#16A34A' if chg.startswith('-') else '#E23C3C'
        rows.append(
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid #F2ECE4;">'
            '<div style="font-size:30px;font-weight:700;width:180px;">%s</div>'
            '<div style="font-size:29px;width:200px;text-align:right;font-variant-numeric:tabular-nums;">%s</div>'
            '<div style="font-size:32px;font-weight:800;width:150px;text-align:right;color:%s;">%s</div>'
            '<div style="font-size:22px;color:#A39A90;width:270px;text-align:right;">%s</div>'
            '</div>' % (name, close, color, chg, note)
        )
    return '<div class="panel" style="padding:14px 34px;">' + ''.join(rows) + '</div>'

# ---------- 卡片1：封面 ----------
def card1():
    kpis = [
        ('上证指数', '-1.48%'), ('创业板指', '-4.37%'),
        ('恒生指数', '-3.03%'), ('恒生科技', '-5.03%'),
    ]
    grid = ''.join(
        '<div style="background:#fff;border-radius:22px;padding:34px 20px;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,0.05);">'
        '<div style="font-size:26px;color:#8A8A8A;margin-bottom:12px;">%s</div>'
        '<div style="font-size:52px;font-weight:800;color:#16A34A;">%s</div>'
        '</div>' % (k[0], k[1])
        for k in kpis
    )
    body = (
        '<span class="tag">📊 每日大盘复盘 · %s</span>' % DATE +
        '<h1>%s</h1>' % TITLE +
        '<div class="sub">%s</div>' % SUBTITLE +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:48px;">%s</div>' % grid +
        '<div class="panel" style="margin-top:26px;display:flex;justify-content:space-between;align-items:center;padding:34px;">'
        '<div style="text-align:center;"><div style="font-size:24px;color:#8A8A8A;">两市成交额</div><div style="font-size:44px;font-weight:800;margin-top:8px;">1.53万亿</div></div>'
        '<div style="width:1px;height:70px;background:#EFE7DC;"></div>'
        '<div style="text-align:center;"><div style="font-size:24px;color:#8A8A8A;">跌停 vs 涨停</div><div style="font-size:44px;font-weight:800;margin-top:8px;"><span class="dn">55</span> : <span class="up">33</span></div></div>'
        '<div style="width:1px;height:70px;background:#EFE7DC;"></div>'
        '<div style="text-align:center;"><div style="font-size:24px;color:#8A8A8A;">主力净流出</div><div style="font-size:44px;font-weight:800;margin-top:8px;" class="dn">540亿</div></div>'
        '</div>' +
        '<div style="margin-top:auto;background:#1F1F1F;color:#fff;border-radius:22px;padding:30px 34px;">'
        '<div style="font-size:26px;font-weight:800;margin-bottom:10px;">📌 今日一句话</div>'
        '<div style="font-size:27px;line-height:1.55;color:#E8E2DA;">权重护盘掩盖不了成长杀跌：近5000股下跌、跌停反超涨停，恒生科技创2年新低，情绪降至冰点。</div>'
        '</div>' +
        '<div style="text-align:center;font-size:27px;color:#B0A8A0;padding:22px 0 4px;">右滑查看完整复盘 →</div>'
    )
    return render(body, '每日大盘复盘 · 关注不迷路')

# ---------- 卡片2：A股指数 ----------
def card2():
    body = (
        '<div class="h2"><span class="bar"></span>A股：权重抗跌，成长重挫</div>'
        '<div class="h2note">创业板 -4.37% 领跌，上证跌破3700创一年新低</div>'
        + index_bars(A_INDEX) +
        '<div class="panel" style="display:flex;justify-content:space-around;align-items:center;text-align:center;padding:34px;">'
        '<div><div style="font-size:25px;color:#8A8A8A;">两市成交额</div><div style="font-size:42px;font-weight:800;margin-top:8px;">1.53万亿</div><div style="font-size:22px;color:#9A9A9A;margin-top:6px;">较昨日放量约1000亿</div></div>'
        '<div style="width:1px;height:70px;background:#EFE7DC;"></div>'
        '<div><div style="font-size:25px;color:#8A8A8A;">涨 / 跌家数</div><div style="font-size:42px;font-weight:800;margin-top:8px;"><span class="up">535</span> / <span class="dn">4999</span></div><div style="font-size:22px;color:#9A9A9A;margin-top:6px;">上涨占比仅 9.6%</div></div>'
        '</div>' +
        '<div class="panel">'
        '<div style="font-size:27px;font-weight:800;margin-bottom:14px;">🔍 盘面三大特征</div>'
        '<div style="font-size:26px;line-height:1.9;color:#4A4A4A;">'
        '① 银行/电信等权重护盘，上证跌幅收窄至 -1.48%<br>'
        '② 创业板/科创50 实质杀跌，成长股伤口最深<br>'
        '③ 尾盘宽基ETF急剧放量，护盘资金已在承接'
        '</div></div>'
    )
    return render(body)

# ---------- 卡片3：港股指数 ----------
def card3():
    hits = [('联想集团','-10%'),('华虹宏力','-9.5%'),('信达生物','-8.4%'),('药明生物','-8.4%'),
            ('中际旭创','-7.3%'),('中芯国际','-6.2%'),('阿里巴巴','-6.1%'),('小米','-3.7%'),
            ('长飞光纤','-11.8%'),('伟禄科技','-89.8%')]
    hits_html = ''.join('<span style="background:#F6F1EA;border-radius:12px;padding:12px 18px;font-size:25px;">%s <b class="dn">%s</b></span>' % t for t in hits)
    body = (
        '<div class="h2"><span class="bar"></span>港股：恒生科技创2年新低</div>'
        '<div class="h2note">恒指失守23000，科技/半导体/医药全线重挫</div>'
        + index_bars(HK_INDEX) +
        '<div class="panel" style="display:flex;justify-content:space-between;align-items:center;padding:36px 34px;">'
        '<div><div style="font-size:25px;color:#8A8A8A;">南向资金</div><div style="font-size:42px;font-weight:800;margin-top:10px;" class="dn">净卖出 92.18亿</div></div>'
        '<div style="text-align:right;"><div style="font-size:25px;color:#8A8A8A;">恒科较去年10月高点</div><div style="font-size:42px;font-weight:800;margin-top:10px;" class="dn">回撤 43%</div></div>'
        '</div>' +
        '<div class="panel">'
        '<div style="font-size:28px;font-weight:800;margin-bottom:18px;">💥 重挫个股一览</div>'
        '<div style="display:flex;flex-wrap:wrap;gap:16px;">' + hits_html + '</div>'
        '<div style="font-size:23px;color:#A39A90;margin-top:18px;">港股无涨跌停限制，伟禄科技等个股异常暴跌属个股风险事件</div>'
        '</div>' +
        '<div class="panel" style="background:#F6F1EA;">'
        '<div style="font-size:26px;font-weight:800;margin-bottom:10px;">🗣️ 机构观点</div>'
        '<div style="font-size:25px;line-height:1.65;color:#4A4A4A;">东吴证券：恒指疲软主因美国通胀回升、海外科技股调整拖累；恒科回到"924"附近，但基本面支撑不强，对港股保持谨慎观察。</div>'
        '</div>'
    )
    return render(body)

# ---------- 卡片4：板块题材 ----------
def card4():
    up_rows = ''.join(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F2ECE4;">'
        '<div style="font-size:28px;font-weight:700;">%s</div>'
        '<div style="font-size:23px;color:#A39A90;">%s</div></div>' % (n, r)
        for n, r in UP_BOARD
    )
    dn_rows = ''.join(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F2ECE4;">'
        '<div style="font-size:28px;font-weight:700;">%s</div>'
        '<div style="font-size:26px;font-weight:800;" class="dn">%s</div></div>' % (n, r)
        for n, r in DOWN_BOARD
    )
    body = (
        '<div class="h2"><span class="bar"></span>板块：机器人逆市，AI算力崩</div>'
        '<div class="h2note">31个申万一级行业仅1个上涨，资金高度集中避险</div>'
        '<div class="panel" style="margin-bottom:20px;"><div style="font-size:28px;font-weight:800;margin-bottom:6px;" class="up">📈 逆市领涨</div>' + up_rows + '</div>'
        '<div class="panel" style="margin-bottom:20px;"><div style="font-size:28px;font-weight:800;margin-bottom:6px;" class="dn">📉 领跌重灾区</div>' + dn_rows + '</div>'
        '<div class="panel">'
        '<div style="font-size:27px;font-weight:800;margin-bottom:12px;">💰 主力资金流向</div>'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;">'
        '<b class="up">净流入：</b>全市场仅家电、美容护理2个行业为正（东财口径）'
        '</div>'
        '<div style="font-size:25px;line-height:1.7;color:#4A4A4A;margin-top:8px;">'
        '<b class="dn">净流出：</b>电子 -137亿居首、通信 -83亿次之；光模块/电路板流出超40亿'
        '</div></div>'
    )
    return render(body)

# ---------- 卡片5：情绪 / 涨停跌停 ----------
def card5():
    body = (
        '<div class="h2"><span class="bar"></span>情绪冰点：跌停反超涨停</div>'
        '<div class="h2note">近5000股下跌，涨跌停倒挂，恐慌杀跌（A股专属口径）</div>'
        '<div class="panel" style="display:flex;justify-content:space-around;align-items:center;text-align:center;padding:56px 38px;">'
        '<div><div style="font-size:27px;color:#8A8A8A;">涨停(含ST)</div><div style="font-size:96px;font-weight:800;" class="up">33</div></div>'
        '<div style="font-size:70px;color:#C9C0B6;font-weight:800;">:</div>'
        '<div><div style="font-size:27px;color:#8A8A8A;">跌停(含ST)</div><div style="font-size:96px;font-weight:800;" class="dn">55</div></div>'
        '</div>' +
        '<div class="panel" style="padding:40px 34px;">'
        '<div style="display:flex;justify-content:space-between;padding:18px 0;font-size:27px;border-bottom:1px solid #F2ECE4;"><span style="color:#6B6B6B;">涨幅超5%</span><b class="up">41 家</b></div>'
        '<div style="display:flex;justify-content:space-between;padding:18px 0;font-size:27px;border-bottom:1px solid #F2ECE4;"><span style="color:#6B6B6B;">跌幅超5%</span><b class="dn">799 家</b></div>'
        '<div style="display:flex;justify-content:space-between;padding:18px 0;font-size:27px;border-bottom:1px solid #F2ECE4;"><span style="color:#6B6B6B;">主力净流出</span><b class="dn">540.55亿（连续12日）</b></div>'
        '<div style="display:flex;justify-content:space-between;padding:18px 0;font-size:27px;"><span style="color:#6B6B6B;">涨停题材聚集</span><b class="up">电机制造 · 机器人链</b></div>'
        '</div>' +
        '<div class="panel" style="background:#FFF7F7;">'
        '<div style="font-size:28px;font-weight:800;color:#E23C3C;margin-bottom:14px;">🧊 冰点信号 · 但别只看空</div>'
        '<div style="font-size:26px;line-height:1.75;color:#4A4A4A;">跌停家数近期首次反超涨停，高位股情绪补跌；但尾盘沪深300ETF放量——嘉实全天成交105亿，最后15分钟就成交68.5亿（约为昨日全天3.6倍），护盘资金已进场承接。历史上涨跌停倒挂后，往往临近情绪转折。</div>'
        '</div>'
    )
    return render(body)

# ---------- 卡片6：消息面 ----------
def card6():
    li = ''.join('<div style="display:flex;gap:14px;padding:16px 0;border-bottom:1px solid #F2ECE4;font-size:26px;line-height:1.55;"><span>✅</span><span>%s</span></div>' % m for m in MSG_LI)
    lk = ''.join('<div style="display:flex;gap:14px;padding:16px 0;border-bottom:1px solid #F2ECE4;font-size:26px;line-height:1.55;"><span>⚠️</span><span>%s</span></div>' % m for m in MSG_LK)
    body = (
        '<div class="h2"><span class="bar"></span>为什么跌？三条主因</div>'
        '<div class="h2note">外围利率 + AI叙事降温 + 资金流出，三重共振压制</div>'
        '<div class="panel"><div style="font-size:28px;font-weight:800;margin-bottom:8px;" class="up">👍 盘面少数亮点</div>' + li + '</div>'
        '<div class="panel"><div style="font-size:28px;font-weight:800;margin-bottom:8px;" class="dn">👎 主导利空</div>' + lk + '</div>'
        '<div class="panel" style="background:#F6F1EA;">'
        '<div style="font-size:27px;font-weight:800;color:#1F1F1F;margin-bottom:10px;">🎯 今日情绪定级：偏空</div>'
        '<div style="font-size:25px;line-height:1.65;color:#4A4A4A;">消息面（海外利率+AI叙事降温）、资金面（连续12日净流出+南向卖出92亿）、赚钱效应（仅9.6%红盘）三者向下共振，暂无企稳信号。</div>'
        '</div>'
    )
    return render(body)

# ---------- 卡片7：明日操作 ----------
def card7():
    focus = ''.join('<span style="background:#EFF8F1;color:#16A34A;border-radius:12px;padding:10px 18px;font-size:25px;font-weight:700;">%s</span>' % f for f in ADVICE['focus'])
    avoid = ''.join('<span style="background:#FDF0F0;color:#E23C3C;border-radius:12px;padding:10px 18px;font-size:25px;font-weight:700;">%s</span>' % f for f in ADVICE['avoid'])
    risk = ''.join('<div style="display:flex;gap:14px;padding:10px 0;border-bottom:1px solid #F2ECE4;font-size:25px;line-height:1.5;"><span>⚠️</span><span>%s</span></div>' % r for r in ADVICE['risk'])
    plan = ''.join(
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F2ECE4;">'
        '<div style="font-size:27px;font-weight:800;width:190px;">%s</div>'
        '<div style="font-size:25px;color:#4A4A4A;text-align:right;">%s</div></div>' % (k, v)
        for k, v in ADVICE['plan']
    )
    body = (
        '<div class="h2"><span class="bar"></span>明日怎么应对？</div>'
        '<div class="h2note">情绪冰点+尾盘ETF护盘 → 短线或反抽，中期空头未改</div>'
        '<div class="panel" style="background:#FFF7F7;display:flex;align-items:center;justify-content:space-between;padding:28px 34px;margin-bottom:20px;">'
        '<div><div style="font-size:25px;color:#8A8A8A;">仓位基调</div><div style="font-size:40px;font-weight:800;color:#E23C3C;margin-top:6px;">%s</div></div>'
        '<div style="text-align:right;font-size:26px;color:#4A4A4A;">%s</div>'
        '</div>' % (ADVICE['tone'], ADVICE['tone_note']) +
        '<div class="panel" style="margin-bottom:20px;"><div style="font-size:27px;font-weight:800;margin-bottom:14px;" class="up">🎯 重点关注</div><div style="display:flex;flex-wrap:wrap;gap:14px;">%s</div></div>' % focus +
        '<div class="panel" style="margin-bottom:20px;"><div style="font-size:27px;font-weight:800;margin-bottom:14px;" class="dn">🚫 回避方向</div><div style="display:flex;flex-wrap:wrap;gap:14px;">%s</div></div>' % avoid +
        '<div class="panel" style="margin-bottom:20px;"><div style="font-size:27px;font-weight:800;margin-bottom:8px;">⚠️ 关键风险</div>%s</div>' % risk +
        '<div class="panel"><div style="font-size:27px;font-weight:800;margin-bottom:8px;">🧭 情景预案</div>%s</div>' % plan +
        '<div style="font-size:23px;color:#B0A8A0;text-align:center;margin-top:10px;">大盘口径 · 不构成个股买卖建议 · 股市有风险</div>'
    )
    return render(body, '数据来源：新浪行情 / 收盘稿交叉验证 · 不构成投资建议')

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
        '--user-data-dir=/tmp/chrome-xhs-%d' % i,
        '--screenshot=%s' % png, 'file://%s' % hp,
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=60)
    print('generated', png, os.path.getsize(png))

print('DONE')
