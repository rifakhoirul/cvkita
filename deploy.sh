#!/usr/bin/env bash
# Deploy CVKita API Worker ke Cloudflare.
# Token dibaca dari environment CLOUDFLARE_API_TOKEN (JANGAN di-commit).
set -euo pipefail

cd "$(dirname "$0")/worker"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if [ -f /home/agentuser/.cvkita_cloudflare_token ]; then
    export CLOUDFLARE_API_TOKEN="$(cat /home/agentuser/.cvkita_cloudflare_token)"
  else
    echo "❌ CLOUDFLARE_API_TOKEN belum diset." >&2
    exit 1
  fi
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  if [ -f /home/agentuser/.cvkita_gemini_key ]; then
    export GEMINI_API_KEY="$(cat /home/agentuser/.cvkita_gemini_key)"
  fi
fi

echo "==> 1/4 Membuat KV namespace (pelacakan kuota)..."
KV_OUT="$(npx wrangler kv:namespace create CVKITA_KV 2>&1 || true)"
echo "$KV_OUT"

KV_ID="$(echo "$KV_OUT" | grep -oE 'id = "[a-f0-9]{32}"' | head -1 | grep -oE '[a-f0-9]{32}')"
if [ -n "$KV_ID" ]; then
  # Tulis binding KV ke wrangler.toml
  python3 - <<PY
import re
p = 'wrangler.toml'
s = open(p).read()
s = re.sub(r'#\s*\[\[kv_namespaces\]\][\s\S]*?\n\n?', '', s)
if '[[kv_namespaces]]' not in s:
    s = s.rstrip() + f'\n\n[[kv_namespaces]]\nbinding = "KV"\nid = "{KV_ID}"\n'
open(p,'w').write(s)
print("KV binding ditulis:", KV_ID)
PY
else
  echo "⚠️  KV id tidak terbaca (mungkin sudah ada). Lanjut tanpa perubahan binding."
fi

echo "==> 2/4 Mengatur secret GEMINI_API_KEY..."
if [ -n "${GEMINI_API_KEY:-}" ]; then
  printf '%s' "$GEMINI_API_KEY" | npx wrangler secret put GEMINI_API_KEY
else
  echo "⚠️  GEMINI_API_KEY belum ada, dilewati. Set dengan:"
  echo "    printf 'KEY' > /home/agentuser/.cvkita_gemini_key && ./deploy.sh"
fi

echo "==> 3/4 Deploy worker..."
npx wrangler deploy

echo "==> 4/4 Selesai. Catat URL worker di atas."
