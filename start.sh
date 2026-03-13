#!/bin/bash
# Start backend + frontend in parallel

echo "Starting RIA Advisor Copilot..."
echo ""

# Backend
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID → http://localhost:8000"

# Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID → http://localhost:5173"

echo ""
echo "Both running. Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
