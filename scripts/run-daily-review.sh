#!/usr/bin/env bash
# ============================================================================
# run-daily-review.sh — 每日复盘 runner（WorkBuddy CLI 适配层）
#
# 用途：被 stock_monitor 后端 spawn 调用，根据当日日期 + 用户模板/持仓
#      调 workbuddy（或其他 AI CLI）生成 HTML 报告，并 PUT 回 MySQL。
#
# 调用方式（由后端 service.triggerRun spawn）：
#   run-daily-review.sh \
#     --run-id <id> --date <YYYY-MM-DD> --user-id <id> \
#     --base-url <api url> --token <jwt> \
#     --prompt-file <md> --holdings-file <md> \
#     [--output-file <html>]
#
# 环境变量（可覆盖默认 workbuddy CLI 调用方式）：
#   WORKBUDDY_GENERATE_CMD   自定义生成命令；模板中可用 $PROMPT $HOLDINGS
#                            $DATE $OUTPUT_FILE（脚本已 export 出来）
#                           默认：claude -p（需要先 `claude login`）
#
# 依赖：bash 4+, curl, python3, mktemp, base64
# 退出码：0=成功, 1=参数缺失, 2=生成失败, 3=上传失败
# ============================================================================

set -euo pipefail

# ---------- 参数解析 ----------
# 预处理：把 --name=value 拆成 --name value，方便 case 匹配
PARSED=()
for _arg in "$@"; do
  if [[ "$_arg" == --*=* ]]; then
    PARSED+=("${_arg%%=*}" "${_arg#*=}")
  else
    PARSED+=("$_arg")
  fi
done
set -- "${PARSED[@]}"

RUN_ID="" DATE="" USER_ID="" BASE_URL="" TOKEN=""
PROMPT_FILE="" HOLDINGS_FILE="" OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)       RUN_ID="$2";       shift 2 ;;
    --date)         DATE="$2";         shift 2 ;;
    --user-id)      USER_ID="$2";      shift 2 ;;
    --base-url)     BASE_URL="$2";     shift 2 ;;
    --token)        TOKEN="$2";        shift 2 ;;
    --prompt-file)  PROMPT_FILE="$2";  shift 2 ;;
    --holdings-file) HOLDINGS_FILE="$2"; shift 2 ;;
    --output-file)  OUTPUT_FILE="$2";  shift 2 ;;
    -h|--help)
      sed -n '2,28p' "$0"; exit 0 ;;
    *)
      echo "[runner] unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$RUN_ID" || -z "$DATE" || -z "$BASE_URL" || -z "$TOKEN" \
      || -z "$PROMPT_FILE" || -z "$HOLDINGS_FILE" ]]; then
  echo "[runner] missing required args" >&2
  sed -n '2,28p' "$0" >&2
  exit 1
fi

# ---------- 工具函数 ----------
log()  { echo "[runner run#${RUN_ID} ${DATE}] $*" >&2; }
fail() {
  local msg="$*"
  log "FAILED: $msg"
  curl -fsS -X POST "${BASE_URL}/api/daily-review/runs/${RUN_ID}/fail" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"runner failed: ${msg}\"}" >/dev/null 2>&1 || true
  exit 2
}

API_HEADERS=(
  -H "Authorization: Bearer ${TOKEN}"
  -H "Content-Type: application/json"
)

# ---------- 准备临时目录 ----------
TMPDIR_RUN=$(mktemp -d -t daily-review-XXXXXX)
trap 'rm -rf "$TMPDIR_RUN"' EXIT
STDERR_LOG="${TMPDIR_RUN}/stderr.log"
PROMPT_CONTENT_FILE="${TMPDIR_RUN}/prompt.txt"
HOLDINGS_CONTENT_FILE="${TMPDIR_RUN}/holdings.txt"

# 读 prompt / holdings 内容
if [[ ! -f "$PROMPT_FILE" ]]; then
  fail "prompt 文件不存在: $PROMPT_FILE"
fi
if [[ ! -f "$HOLDINGS_FILE" ]]; then
  fail "holdings 文件不存在: $HOLDINGS_FILE"
fi

cp "$PROMPT_FILE"  "$PROMPT_CONTENT_FILE"
cp "$HOLDINGS_FILE" "$HOLDINGS_CONTENT_FILE"

# 标 running
curl -fsS -X POST "${BASE_URL}/api/daily-review/runs/${RUN_ID}/start" \
  "${API_HEADERS[@]}" >/dev/null 2>&1 || log "warn: mark running failed"

# 准备输出文件
if [[ -z "$OUTPUT_FILE" ]]; then
  OUTPUT_FILE="${TMPDIR_RUN}/report.html"
fi

# ---------- 调用 workbuddy CLI 生成 HTML ----------
PROMPT=$(cat "$PROMPT_CONTENT_FILE")
HOLDINGS=$(cat "$HOLDINGS_CONTENT_FILE")
DATE_FOR_RUN="$DATE"
RUN_ID_FOR_RUN="$RUN_ID"
OUTPUT_FILE_FOR_RUN="$OUTPUT_FILE"
export PROMPT HOLDINGS DATE_FOR_RUN RUN_ID_FOR_RUN OUTPUT_FILE_FOR_RUN

# 默认生成命令：claude -p（单次回答模式）
# 自定义：通过环境变量覆盖，如：
#   export WORKBUDDY_GENERATE_CMD="node scripts/my-generator.js"
# 自定义脚本里直接读 process.env.PROMPT / .HOLDINGS / .DATE_FOR_RUN / .OUTPUT_FILE_FOR_RUN
DEFAULT_CMD='claude -p "$PROMPT" --output "$OUTPUT_FILE_FOR_RUN"'
GEN_CMD="${WORKBUDDY_GENERATE_CMD:-$DEFAULT_CMD}"

log "执行生成命令: $GEN_CMD"
log "  prompt 字节数: ${#PROMPT}, holdings 字节数: ${#HOLDINGS}, output: $OUTPUT_FILE"

# shellcheck disable=SC2086
if ! eval "$GEN_CMD" >"$OUTPUT_FILE" 2>"$STDERR_LOG"; then
  STDERR_TAIL=$(tail -c 800 "$STDERR_LOG" 2>/dev/null || echo "")
  fail "workbuddy CLI 退出码非 0; stderr: ${STDERR_TAIL}"
fi

if [[ ! -s "$OUTPUT_FILE" ]]; then
  STDERR_TAIL=$(tail -c 800 "$STDERR_LOG" 2>/dev/null || echo "")
  fail "workbuddy CLI 输出为空; stderr: ${STDERR_TAIL}"
fi

OUTPUT_SIZE=$(wc -c < "$OUTPUT_FILE")
log "HTML 已生成: ${OUTPUT_SIZE} 字节"

# ---------- 构造 PUT body 并上传 ----------
TITLE="每日复盘-$(echo "$DATE" | tr -d '-')"

BODY_FILE="${TMPDIR_RUN}/body.json"
python3 - "$OUTPUT_FILE" "$RUN_ID" "$DATE" "$TITLE" > "$BODY_FILE" <<'PY'
import json, sys, datetime
output_file, run_id, date, title = sys.argv[1:5]
with open(output_file, "r", encoding="utf-8") as f:
    html = f.read()
body = {
    "content": html,
    "title": title,
    "meta": {
        "source": "runner",
        "runnerCommand": "scripts/run-daily-review.sh",
        "generatedAt": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fileSize": len(html),
    },
    "runId": int(run_id),
}
print(json.dumps(body, ensure_ascii=False))
PY

log "上传 HTML 到 ${BASE_URL}/api/daily-review/by-date/${DATE}"
if ! curl -fsS -X PUT "${BASE_URL}/api/daily-review/by-date/${DATE}" \
    "${API_HEADERS[@]}" \
    --data-binary "@$BODY_FILE" >/dev/null 2>"$STDERR_LOG"; then
  STDERR_TAIL=$(tail -c 800 "$STDERR_LOG" 2>/dev/null || echo "")
  fail "上传 HTML 失败; stderr: ${STDERR_TAIL}"
fi

log "完成: run#${RUN_ID} ${DATE} HTML 已写入数据库"
exit 0
