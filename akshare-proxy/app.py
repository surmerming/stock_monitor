import json
import time
import requests
import akshare as ak
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CACHE = {}
MARKET_DATA_CACHE = {}
CACHE_TTL = 60
MARKET_DATA_TTL = 30

requests.adapters.DEFAULT_RETRIES = 3

def get_cache(key):
    entry = CACHE.get(key)
    if entry and time.time() - entry['timestamp'] < CACHE_TTL:
        return entry['data']
    return None

def set_cache(key, data):
    CACHE[key] = {'data': data, 'timestamp': time.time()}
    if len(CACHE) > 1000:
        oldest = min(CACHE.keys(), key=lambda k: CACHE[k]['timestamp'])
        del CACHE[oldest]

def get_market_data(market):
    cache_key = f'market_{market}'
    entry = MARKET_DATA_CACHE.get(cache_key)
    if entry and time.time() - entry['timestamp'] < MARKET_DATA_TTL:
        return entry['data']
    return None

def set_market_data(market, data):
    cache_key = f'market_{market}'
    MARKET_DATA_CACHE[cache_key] = {'data': data, 'timestamp': time.time()}

def normalize_symbol(symbol):
    symbol = symbol.strip().upper()
    if symbol.startswith('SH'):
        return {'market': 'a_share', 'code': symbol[2:], 'prefix': 'sh'}
    if symbol.startswith('SZ'):
        return {'market': 'a_share', 'code': symbol[2:], 'prefix': 'sz'}
    if symbol.startswith('BJ'):
        return {'market': 'a_share', 'code': symbol[2:], 'prefix': 'bj'}
    if symbol.startswith('HK'):
        code = symbol[2:]
        if len(code) < 5:
            code = code.zfill(5)
        return {'market': 'hk', 'code': code, 'prefix': 'hk'}
    if symbol.endswith('.SS'):
        return {'market': 'a_share', 'code': symbol[:-3], 'prefix': 'sh'}
    if symbol.endswith('.SZ'):
        return {'market': 'a_share', 'code': symbol[:-3], 'prefix': 'sz'}
    if symbol.endswith('.BJ'):
        return {'market': 'a_share', 'code': symbol[:-3], 'prefix': 'bj'}
    if symbol.endswith('.HK'):
        code = symbol[:-3]
        if len(code) < 5:
            code = code.zfill(5)
        return {'market': 'hk', 'code': code, 'prefix': 'hk'}
    if len(symbol) == 6:
        return {'market': 'a_share', 'code': symbol, 'prefix': 'sh'}
    if len(symbol) == 5 and symbol[0].isdigit():
        return {'market': 'hk', 'code': symbol, 'prefix': 'hk'}
    if len(symbol) == 4 and symbol[0].isdigit():
        return {'market': 'hk', 'code': symbol.zfill(5), 'prefix': 'hk'}
    return {'market': 'us', 'code': symbol, 'prefix': 'us'}

def safe_float(val, default=0.0):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_int(val, default=0):
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

def parse_gtimg_data(line):
    if not line or '=' not in line:
        return None
    try:
        parts = line.split('=')[1].strip().strip('"')
        data = parts.split('~')
        if len(data) < 50:
            return None
        
        turnover = 0.0
        if data[35] and '/' in data[35]:
            parts35 = data[35].split('/')
            if len(parts35) >= 3:
                turnover = safe_float(parts35[2])
        
        result = {
            'symbol': data[2],
            'name': data[1],
            'current_price': safe_float(data[3]),
            'prev_close': safe_float(data[4]),
            'open_price': safe_float(data[5]),
            'volume': safe_int(data[6]),
            'day_high': safe_float(data[33]),
            'day_low': safe_float(data[34]),
            'turnover': turnover,
            'change': safe_float(data[31]),
            'change_percent': safe_float(data[32]),
        }
        
        if data[45]:
            result['market_cap'] = safe_float(data[45]) * 100000000
        if data[46]:
            result['pe_ratio'] = safe_float(data[46])
        
        return result
    except Exception as e:
        app.logger.error(f'Parse gtimg data failed: {e}')
        return None

def fetch_quote_from_gtimg(symbol, prefix):
    try:
        url = f'http://qt.gtimg.cn/q={prefix}{symbol}'
        response = requests.get(url, timeout=10)
        response.encoding = 'gbk'
        data = parse_gtimg_data(response.text)
        if data:
            return data
    except Exception as e:
        app.logger.error(f'Fetch from gtimg failed: {e}')
    return None

def fetch_a_share_data():
    try:
        url = 'http://qt.gtimg.cn/q=sh000001,sh000002,sh600000,sh600519,sh601318,sh600036,sh600030,sh601398,sh601988,sh600048,sz000001,sz000002,sz000858,sz002594,sz300750,sz300059'
        response = requests.get(url, timeout=10)
        response.encoding = 'gbk'
        lines = response.text.strip().split('\n')
        result = []
        for line in lines:
            data = parse_gtimg_data(line)
            if data:
                result.append(data)
        return result if result else None
    except Exception as e:
        app.logger.error(f'Failed to fetch A share data: {e}')
        return None

def fetch_hk_data():
    try:
        url = 'http://qt.gtimg.cn/q=hk00001,hk00002,hk00003,hk00005,hk00006,hk00016,hk00017,hk00088,hk00101,hk00175,hk00267,hk00285,hk00669,hk00700,hk00772,hk00857,hk00883,hk00939,hk01066,hk01109,hk01177,hk01211,hk01299,hk01318,hk01398,hk01810,hk01928,hk01997,hk02007,hk02018,hk02282,hk02318,hk02382,hk02628,hk02800,hk02828,hk02888,hk03328,hk03808,hk03888,hk06098,hk06618,hk06881,hk06885,hk09988,hk10246,hk10992,hk12999,hk18100,hk300750'
        response = requests.get(url, timeout=10)
        response.encoding = 'gbk'
        lines = response.text.strip().split('\n')
        result = []
        for line in lines:
            data = parse_gtimg_data(line)
            if data:
                result.append(data)
        return result if result else None
    except Exception as e:
        app.logger.error(f'Failed to fetch HK data: {e}')
        return None

def fetch_us_data():
    try:
        url = 'http://qt.gtimg.cn/q=usAAPL,usMSFT,usGOOGL,usAMZN,usMETA,usNVDA,usTSLA,usBABA,usJD,usPDD,usNIO,usXPEV,usLI,usBYDDY,usNVAX,usBIDU,usNTES,usMCD,usJPM,usV,usMA,usJNJ,usWMT,usKO,usPEP,usDIS,usNKE,usADBE,usCRM,usORCL,usSAP,usCSCO,usINTC,usAMD,usQCOM,usMU,usAVGO,usTXN,usNVST,usLRCX'
        response = requests.get(url, timeout=10)
        response.encoding = 'gbk'
        lines = response.text.strip().split('\n')
        result = []
        for line in lines:
            data = parse_gtimg_data(line)
            if data:
                result.append(data)
        return result if result else None
    except Exception as e:
        app.logger.error(f'Failed to fetch US data: {e}')
        return None

@app.route('/quote', methods=['GET'])
def get_quote():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': 'symbol is required'}), 400

    cache_key = f'quote_{symbol}'
    cached = get_cache(cache_key)
    if cached:
        return jsonify(cached)

    try:
        normalized = normalize_symbol(symbol)
        data = fetch_quote_from_gtimg(normalized['code'], normalized['prefix'])
        if data:
            data['market'] = 'A股' if normalized['market'] == 'a_share' else '港股' if normalized['market'] == 'hk' else '美股'
            data['currency'] = 'CNY' if normalized['market'] == 'a_share' else 'HKD' if normalized['market'] == 'hk' else 'USD'
            data['symbol'] = symbol
            set_cache(cache_key, data)
            return jsonify(data)
        return jsonify({'error': f'No data for {symbol}'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/quotes', methods=['POST'])
def get_quotes_batch():
    symbols = request.json.get('symbols', [])
    if not symbols:
        return jsonify([])

    grouped = {'a_share': [], 'hk': [], 'us': []}
    for symbol in symbols:
        try:
            normalized = normalize_symbol(symbol)
            grouped[normalized['market']].append({'symbol': symbol, 'code': normalized['code'], 'prefix': normalized['prefix']})
        except:
            pass

    results = {}
    errors = {}

    for market, items in grouped.items():
        if not items:
            continue
        
        try:
            df = get_market_data(market)
            if df is None:
                if market == 'a_share':
                    df = fetch_a_share_data()
                elif market == 'hk':
                    df = fetch_hk_data()
                elif market == 'us':
                    df = fetch_us_data()
            
            if df is not None:
                set_market_data(market, df)
                df_map = {d['symbol']: d for d in df}
                
                for item in items:
                    if item['code'] in df_map:
                        data = df_map[item['code']]
                        data['market'] = 'A股' if market == 'a_share' else '港股' if market == 'hk' else '美股'
                        data['currency'] = 'CNY' if market == 'a_share' else 'HKD' if market == 'hk' else 'USD'
                        data['symbol'] = item['symbol']
                        set_cache(f'quote_{item["symbol"]}', data)
                        results[item['symbol']] = data
                    else:
                        single_data = fetch_quote_from_gtimg(item['code'], item['prefix'])
                        if single_data:
                            single_data['market'] = 'A股' if market == 'a_share' else '港股' if market == 'hk' else '美股'
                            single_data['currency'] = 'CNY' if market == 'a_share' else 'HKD' if market == 'hk' else 'USD'
                            single_data['symbol'] = item['symbol']
                            set_cache(f'quote_{item["symbol"]}', single_data)
                            results[item['symbol']] = single_data
                        else:
                            errors[item['symbol']] = 'Not found'
            else:
                for item in items:
                    single_data = fetch_quote_from_gtimg(item['code'], item['prefix'])
                    if single_data:
                        single_data['market'] = 'A股' if market == 'a_share' else '港股' if market == 'hk' else '美股'
                        single_data['currency'] = 'CNY' if market == 'a_share' else 'HKD' if market == 'hk' else 'USD'
                        single_data['symbol'] = item['symbol']
                        set_cache(f'quote_{item["symbol"]}', single_data)
                        results[item['symbol']] = single_data
                    else:
                        errors[item['symbol']] = 'Market data unavailable'
        except Exception as e:
            for item in items:
                errors[item['symbol']] = str(e)

    output = []
    for symbol in symbols:
        if symbol in results:
            output.append({'symbol': symbol, 'data': results[symbol], 'error': None})
        else:
            output.append({'symbol': symbol, 'data': None, 'error': errors.get(symbol, 'Unknown error')})
    return jsonify(output)

def fetch_with_retry(url, max_retries=3, timeout=15):
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            return response
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise e

def fetch_chart_from_sina(symbol, prefix, period):
    try:
        sina_symbol = f'{prefix}{symbol}'
        scale_map = {'daily': 240, 'weekly': 60, 'monthly': 120}
        scale = scale_map.get(period, 240)
        
        url = f'http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol={sina_symbol}&scale={scale}&ma=no&datalen=300'
        response = requests.get(url, timeout=15)
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            quotes = []
            for item in data:
                quotes.append({
                    'date': item.get('day', ''),
                    'open': safe_float(item.get('open', 0)),
                    'close': safe_float(item.get('close', 0)),
                    'high': safe_float(item.get('high', 0)),
                    'low': safe_float(item.get('low', 0)),
                    'volume': safe_int(item.get('volume', 0)),
                })
            return quotes
    except Exception as e:
        app.logger.error(f'Sina chart failed: {e}')
    return None

def fetch_chart_from_eastmoney(code, prefix, period):
    klt = 101 if period == 'daily' else 102 if period == 'weekly' else 103
    url = f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={prefix}.{code}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt={klt}&fqt=1'
    
    try:
        response = fetch_with_retry(url)
        data = response.json()
        
        if data.get('data') and data['data'].get('klines'):
            quotes = []
            for line in data['data']['klines']:
                parts = line.split(',')
                quotes.append({
                    'date': parts[0],
                    'open': float(parts[1]),
                    'close': float(parts[2]),
                    'high': float(parts[3]),
                    'low': float(parts[4]),
                    'volume': int(parts[5]),
                })
            return quotes
    except Exception as e:
        app.logger.error(f'Eastmoney chart failed: {e}')
    return None

def fetch_chart_from_akshare(symbol, market):
    try:
        if market == 'us':
            df = ak.stock_us_daily(symbol=symbol)
        elif market == 'hk':
            df = ak.stock_hk_daily(symbol=symbol)
        else:
            return None
            
        if df is None or df.empty:
            return None
            
        quotes = []
        for idx, row in df.iterrows():
            quotes.append({
                'date': str(idx)[:10] if isinstance(idx, (datetime,)) else str(idx),
                'open': safe_float(row.get('开盘', row.get('open', 0))),
                'close': safe_float(row.get('收盘', row.get('close', 0))),
                'high': safe_float(row.get('最高', row.get('high', 0))),
                'low': safe_float(row.get('最低', row.get('low', 0))),
                'volume': safe_int(row.get('成交量', row.get('volume', 0))),
            })
        return quotes if len(quotes) > 0 else None
    except Exception as e:
        app.logger.error(f'AkShare chart failed: {e}')
    return None

@app.route('/chart', methods=['GET'])
def get_chart():
    symbol = request.args.get('symbol')
    period = request.args.get('period', 'daily')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not symbol:
        return jsonify({'error': 'symbol is required'}), 400

    try:
        normalized = normalize_symbol(symbol)
        
        if normalized['market'] == 'a_share':
            quotes = fetch_chart_from_eastmoney(normalized['code'], normalized['prefix'], period)
            if quotes:
                return jsonify({'symbol': symbol, 'quotes': quotes})
            
            sina_quotes = fetch_chart_from_sina(normalized['code'], normalized['prefix'], period)
            if sina_quotes:
                return jsonify({'symbol': symbol, 'quotes': sina_quotes})
                
        elif normalized['market'] == 'hk':
            akshare_quotes = fetch_chart_from_akshare(normalized['code'], 'hk')
            if akshare_quotes:
                return jsonify({'symbol': symbol, 'quotes': akshare_quotes})
                
        elif normalized['market'] == 'us':
            akshare_quotes = fetch_chart_from_akshare(normalized['code'], 'us')
            if akshare_quotes:
                return jsonify({'symbol': symbol, 'quotes': akshare_quotes})
        
        return jsonify({'error': 'Chart data unavailable'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/moneyflow', methods=['GET'])
def get_moneyflow():
    symbol = request.args.get('symbol')
    date = request.args.get('date')

    if not symbol:
        return jsonify({'error': 'symbol is required'}), 400

    try:
        normalized = normalize_symbol(symbol)
        if normalized['market'] == 'a_share':
            url = f'https://push2.eastmoney.com/api/qt/stock/trends2/get?secid={normalized["prefix"]}.{normalized["code"]}&fields=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65'
            response = requests.get(url, timeout=15)
            data = response.json()
            
            if data.get('data') and data['data'].get('trends'):
                latest = data['data']['trends'][-1]
                parts = latest.split(',')
                return jsonify({
                    'symbol': symbol,
                    'date': parts[0],
                    'net_flow': float(parts[11]) if len(parts) > 11 else 0,
                    'large_inflow': float(parts[9]) if len(parts) > 9 else 0,
                    'large_outflow': float(parts[10]) if len(parts) > 10 else 0,
                    'medium_inflow': float(parts[7]) if len(parts) > 7 else 0,
                    'medium_outflow': float(parts[8]) if len(parts) > 8 else 0,
                    'small_inflow': float(parts[5]) if len(parts) > 5 else 0,
                    'small_outflow': float(parts[6]) if len(parts) > 6 else 0,
                })
        
        return jsonify({'error': 'Moneyflow only available for A shares'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/moneyflow_timeline', methods=['GET'])
def get_moneyflow_timeline():
    symbol = request.args.get('symbol')
    date = request.args.get('date')

    if not symbol:
        return jsonify({'error': 'symbol is required'}), 400

    try:
        normalized = normalize_symbol(symbol)
        if normalized['market'] == 'a_share':
            url = f'https://push2.eastmoney.com/api/qt/stock/trends2/get?secid={normalized["prefix"]}.{normalized["code"]}&fields=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65'
            response = requests.get(url, timeout=15)
            data = response.json()
            
            if data.get('data') and data['data'].get('trends'):
                timeline = []
                for line in data['data']['trends']:
                    parts = line.split(',')
                    if len(parts) > 4:
                        timeline.append({
                            'time': parts[0],
                            'inflow': float(parts[3]) if len(parts) > 3 else 0,
                            'outflow': float(parts[4]) if len(parts) > 4 else 0,
                            'net_flow': float(parts[2]) if len(parts) > 2 else 0,
                        })
                return jsonify({'symbol': symbol, 'timeline': timeline})
        
        return jsonify({'error': 'Timeline only available for A shares'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/sector', methods=['GET'])
def get_sector():
    market = request.args.get('market', 'a_share')

    try:
        if market == 'a_share':
            url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
            response = requests.get(url, timeout=15)
            data = response.json()
            
            if data.get('data') and data['data'].get('diff'):
                sectors = []
                for item in data['data']['diff'][:50]:
                    sectors.append({
                        'name': item.get('f14', ''),
                        'change': float(item.get('f3', 0)),
                        'volume': int(item.get('f5', 0)),
                        'turnover': float(item.get('f6', 0)),
                        'leading_stock': '',
                    })
                return jsonify({'market': market, 'sectors': sectors})
        
        return jsonify({'error': 'Sector data unavailable'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/gainers', methods=['GET'])
def get_gainers():
    market = request.args.get('market', 'a_share')

    try:
        if market == 'a_share':
            url = 'http://qt.gtimg.cn/q=sh000001,sz399001,sz399006'
            response = requests.get(url, timeout=10)
            response.encoding = 'gbk'
            lines = response.text.strip().split('\n')
            
            result = {}
            for line in lines:
                data = parse_gtimg_data(line)
                if data:
                    if data['symbol'] == '000001':
                        result['上证指数'] = data
                    elif data['symbol'] == '399001':
                        result['深证成指'] = data
                    elif data['symbol'] == '399006':
                        result['创业板指'] = data
            
            return jsonify({
                'market': market,
                'gainers': sum(1 for d in result.values() if d['change'] > 0),
                'losers': sum(1 for d in result.values() if d['change'] < 0),
                'indices': result,
            })
        
        return jsonify({'error': 'Only A share gainers/losers available'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/market_overview', methods=['GET'])
def get_market_overview():
    try:
        url = 'http://qt.gtimg.cn/q=sh000001,sz399001,sz399006,hk00001,us^GSPC,us^IXIC,us^DJI'
        response = requests.get(url, timeout=10)
        response.encoding = 'gbk'
        lines = response.text.strip().split('\n')
        
        result = {}
        for line in lines:
            data = parse_gtimg_data(line)
            if data:
                name = data['name']
                result[name] = {
                    'price': data['current_price'],
                    'change': data['change'],
                    'change_percent': data['change_percent'],
                }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/financial', methods=['GET'])
def get_financial():
    symbol = request.args.get('symbol')
    report_type = request.args.get('type', 'income')

    if not symbol:
        return jsonify({'error': 'symbol is required'}), 400

    try:
        normalized = normalize_symbol(symbol)
        if normalized['market'] == 'a_share':
            return jsonify({
                'symbol': symbol,
                'type': report_type,
                'data': [],
                'error': 'Financial data API temporarily unavailable',
            })
        else:
            return jsonify({'error': 'Financial data only available for A shares'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
