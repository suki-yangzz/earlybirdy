#!/usr/bin/env bash
# ============================================================
# dev-iphone.sh —— iPhone（Expo Go）一键联调
#   1) 取 en0 局域网 IP
#   2) 以 0.0.0.0 启动 mock 内容服务（真机可访问）
#   3) 注入 EXPO_PUBLIC_CONTENT_URL 后启动 npx expo start（非 --web）
#
# 用法：
#   scripts/dev-iphone.sh                  # 正常启动
#   scripts/dev-iphone.sh --check          # 只做预检（起 mock → 验证 → 退出）
#   CONTENT_PORT=8790 scripts/dev-iphone.sh
#   EXPO_PORT=8082 scripts/dev-iphone.sh
#   scripts/dev-iphone.sh --tunnel         # Metro 走 ngrok（需 @expo/ngrok）
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTENT_PORT="${CONTENT_PORT:-8787}"
EXPO_PORT="${EXPO_PORT:-8081}"
CHECK_ONLY=0
TUNNEL=0
MOCK_PID=""
REUSED_MOCK=0

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    --tunnel) TUNNEL=1 ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "未知参数: ${arg}（可用：--check / --tunnel / -h）" >&2
      exit 2
      ;;
  esac
done

info()  { printf '\033[36m[dev-iphone]\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m[dev-iphone]\033[0m %s\n' "$*"; }
fail()  { printf '\033[31m[dev-iphone]\033[0m %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [ -n "$MOCK_PID" ] && [ "$REUSED_MOCK" = "0" ]; then
    kill "$MOCK_PID" 2>/dev/null || true
    wait "$MOCK_PID" 2>/dev/null || true
    info "已停止 mock 内容服务 (pid $MOCK_PID)"
  fi
}
trap cleanup EXIT INT TERM

# ---------- 1) 局域网 IP ----------
lan_ip() {
  local ip=""
  ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
  [ -z "$ip" ] && ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
  if [ -z "$ip" ]; then
    local iface
    iface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}' || true)"
    [ -n "$iface" ] && ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  fi
  printf '%s' "$ip"
}

LAN_IP="${LAN_IP_OVERRIDE:-$(lan_ip)}"
if [ -z "$LAN_IP" ]; then
  fail "取不到局域网 IP。请先连上 Wi-Fi（en0），或用『系统设置 → Wi-Fi → 详情』查看 IP；也可手动指定：LAN_IP_OVERRIDE=192.168.1.23 scripts/dev-iphone.sh"
fi
info "局域网 IP: $LAN_IP"

# ---------- 2) mock 内容服务 ----------
port_pid() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }
port_is_all_interfaces() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $NF}' | grep -qE '\*:'"$1"'|0\.0\.0\.0:'"$1"
}

if PID="$(port_pid "$CONTENT_PORT")" && [ -n "$PID" ]; then
  if curl -fsS "http://127.0.0.1:$CONTENT_PORT/" 2>/dev/null | grep -q '"ok"'; then
    if port_is_all_interfaces "$CONTENT_PORT"; then
      REUSED_MOCK=1
      warn "内容端口 $CONTENT_PORT 上已有一个可复用的 mock 服务（pid ${PID}，监听所有网卡），直接复用"
    else
      fail "内容端口 $CONTENT_PORT 被 pid $PID 占用，且只监听 127.0.0.1 —— 真机访问不到。
  处理方式之一：
    kill $PID                      # 停掉旧 mock
    CONTENT_PORT=8790 scripts/dev-iphone.sh   # 或换个端口"
    fi
  else
    fail "内容端口 $CONTENT_PORT 被其他程序占用（pid ${PID}，端口不是本项目的 mock）。
  请执行：kill $PID  或  CONTENT_PORT=8790 scripts/dev-iphone.sh"
  fi
fi

if [ "$REUSED_MOCK" = "0" ]; then
  LOG_FILE="${TMPDIR:-/tmp}/earlybirdy-mock-$CONTENT_PORT.log"
  HOST=0.0.0.0 PORT="$CONTENT_PORT" node "$ROOT/shared/mock/server.js" >"$LOG_FILE" 2>&1 &
  MOCK_PID=$!
  ok=0
  for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:$CONTENT_PORT/" >/dev/null 2>&1; then ok=1; break; fi
    if ! kill -0 "$MOCK_PID" 2>/dev/null; then
      echo "mock 启动失败，日志：$LOG_FILE" >&2
      tail -n 20 "$LOG_FILE" >&2 || true
      exit 1
    fi
    sleep 0.25
  done
  [ "$ok" = "1" ] || { echo "mock 服务在 10s 内未就绪，日志：$LOG_FILE" >&2; tail -n 20 "$LOG_FILE" >&2 || true; exit 1; }
  info "mock 内容服务已启动: 0.0.0.0:$CONTENT_PORT (pid $MOCK_PID, 日志 $LOG_FILE)"
fi

CONTENT_URL="http://$LAN_IP:$CONTENT_PORT/manifest.json"
export EXPO_PUBLIC_CONTENT_URL="$CONTENT_URL"
info "EXPO_PUBLIC_CONTENT_URL = $CONTENT_URL"

# 从局域网 IP 侧验证一次（iOS/真机走的就是这条路）
if curl -fsS --max-time 5 "$CONTENT_URL" >/dev/null 2>&1; then
  info "局域网可达性验证通过: $CONTENT_URL"
else
  warn "从 $LAN_IP 访问 manifest 失败。常见原因：macOS 防火墙拦截 node（系统设置 → 网络 → 防火墙，允许 node 或暂时关闭）、手机与 Mac 不在同一 Wi-Fi"
  [ "$CHECK_ONLY" = "1" ] && exit 1
fi

if [ "$CHECK_ONLY" = "1" ]; then
  info "预检完成（未启动 Expo）。真机上把这条 URL 配进 EXPO_PUBLIC_CONTENT_URL 即可。"
  exit 0
fi

# ---------- 3) Expo ----------
cd "$ROOT/app-mobile" || fail "找不到目录 $ROOT/app-mobile"

pick_expo_port() {
  local p="$EXPO_PORT" i=0
  while [ "$i" -lt 20 ]; do
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then printf '%s' "$p"; return 0; fi
    p=$((p + 1)); i=$((i + 1))
  done
  printf '%s' "$EXPO_PORT"
}

ACTUAL_PORT="$(pick_expo_port)"
if [ "$ACTUAL_PORT" != "$EXPO_PORT" ]; then
  warn "Expo 端口 $EXPO_PORT 已被占用，改用 ${ACTUAL_PORT}（扫码用新端口即可；旧端口的 Metro 可能是其他会话，不要混用）"
fi

info "启动 Expo（LAN 模式，端口 ${ACTUAL_PORT}）…"
info "手机：App Store 装 Expo Go → 与 Mac 同 Wi-Fi → 扫下面二维码"
EXPO_ARGS=(start --port "$ACTUAL_PORT")
[ "$TUNNEL" = "1" ] && EXPO_ARGS+=(--tunnel) && warn "已启用 --tunnel：Metro 走公网；内容服务仍是局域网地址，手机仍需与 Mac 同一 Wi-Fi"
env -u CI npx expo "${EXPO_ARGS[@]}"
