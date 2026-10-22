#!/usr/bin/env bash
# DEPRECATED — Worker CVKita TIDAK lagi dideploy dari repo publik ini.
#
# Kode Worker (API AI, pembayaran, lisensi) sekarang ada di repo PRIVATE
# github.com/rifakhoirul/cvkita-api (clone lokal: /home/agentuser/cvkita-api).
# Salinan lama di ./worker sudah DIHAPUS supaya tidak ada yang tanpa sengaja
# menimpa Worker produksi dengan kode usang (mis. versi Gemini).
#
# Deploy yang benar:
#   cd /home/agentuser/cvkita-api
#   CLOUDFLARE_API_TOKEN=$(cat /home/agentuser/.cvkita_cloudflare_token) npx wrangler deploy
#
# Secret (set sekali, bukan di file repo):
#   printf 'sk-...' | npx wrangler secret put DEEPSEEK_API_KEY
set -euo pipefail

echo "❌ Deploy Worker dari repo ini sudah tidak didukung." >&2
echo "   Kode Worker ada di repo private: /home/agentuser/cvkita-api" >&2
echo "   Jalankan: cd /home/agentuser/cvkita-api && npx wrangler deploy" >&2
exit 1
