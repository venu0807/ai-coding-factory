#!/usr/bin/env bash
set -euo pipefail

echo "=== AI Coding Factory — Local Dev ==="

# Start backend
echo "[backend] Installing deps..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q

echo "[backend] Starting API server on :8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "[frontend] Installing deps..."
cd "$(dirname "$0")/frontend"
npm install --silent

echo "[frontend] Starting dev server..."
npx vite --port 5173 &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  Docs:     http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
