#!/usr/bin/env bash
# ── Prompty MCP server deploy ─────────────────────────────────────────────────
# Usage: bash server/deploy.sh
#
# Prerequisites (local):  rsync, ssh
# Prerequisites (remote): Node 18+, npm
# Optional (remote):      ngrok (for HTTPS tunneling so Grok can connect)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIGURE THESE ───────────────────────────────────────────────────────────
SSH_HOST="sterl@172.30.185.55"
REMOTE_DIR="\$HOME/prompty-mcp"  # where to install on the server
PORT=3000                         # port the MCP server listens on
SERVICE_NAME="prompty-mcp"
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Copying server files to $SSH_HOST:$REMOTE_DIR"
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  "$SCRIPT_DIR/" "$SSH_HOST:$REMOTE_DIR/"

echo "==> Installing dependencies on remote"
ssh "$SSH_HOST" "cd $REMOTE_DIR && npm install --omit=dev"

echo "==> Setting up systemd service"
ssh "$SSH_HOST" bash -s -- "$REMOTE_DIR" "$PORT" "$SERVICE_NAME" << 'REMOTE'
REMOTE_DIR="$1"
PORT="$2"
SERVICE_NAME="$3"
NODE_BIN="$(which node)"

cat > /tmp/${SERVICE_NAME}.service << UNIT
[Unit]
Description=Prompty MCP Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}
ExecStart=${NODE_BIN} ${REMOTE_DIR}/index.js
Restart=on-failure
RestartSec=5
Environment=PORT=${PORT}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

sudo mv /tmp/${SERVICE_NAME}.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "Service status:"
sudo systemctl status "$SERVICE_NAME" --no-pager -l | head -20
REMOTE

SERVER_IP="${SSH_HOST#*@}"

echo ""
echo "✓  Deployed successfully"
echo ""
echo "Your MCP server is running at:"
echo "  http://$SERVER_IP:$PORT"
echo ""
echo "─────────────────────────────────────────────────────"
echo "Grok requires HTTPS. Use ngrok to get a public URL:"
echo ""
echo "  1. Install ngrok on the server (one-time):"
echo "     ssh $SSH_HOST 'curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc && echo \"deb https://ngrok-agent.s3.amazonaws.com buster main\" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok'"
echo ""
echo "  2. Authenticate (first time only):"
echo "     ssh $SSH_HOST 'ngrok config add-authtoken YOUR_NGROK_TOKEN'"
echo "     Get your token at: https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""
echo "  3. Start the tunnel (runs in background):"
echo "     ssh $SSH_HOST 'nohup ngrok http $PORT > /tmp/ngrok.log 2>&1 &'"
echo ""
echo "  4. Get the public URL:"
echo "     ssh $SSH_HOST 'curl -s http://localhost:4040/api/tunnels | python3 -c \"import sys,json; print(json.load(sys.stdin)[\\\"tunnels\\\"][0][\\\"public_url\\\"])\"'"
echo ""
echo "  5. Add that URL + /sse to Grok Connectors:"
echo "     https://xxxxxxxx.ngrok-free.app/sse"
echo "─────────────────────────────────────────────────────"
echo ""
echo "Useful commands:"
echo "  Logs:    ssh $SSH_HOST 'journalctl -u $SERVICE_NAME -f'"
echo "  Restart: ssh $SSH_HOST 'sudo systemctl restart $SERVICE_NAME'"
echo "  Update skills:"
echo "    1. Export skills from the browser app (↓ Export button)"
echo "    2. cp ~/Downloads/prompty-skills-*.json server/skills.json"
echo "    3. bash server/deploy.sh   (re-runs this script)"
echo ""
