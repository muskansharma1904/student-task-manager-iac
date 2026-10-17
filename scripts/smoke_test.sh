#!/usr/bin/env bash
# Deployed app ka CRUD test (Step 19 ke screenshots ke liye).
# Usage: ./scripts/smoke_test.sh https://student-task-manager.<subdomain>.workers.dev
set -euo pipefail
BASE="${1:?Usage: $0 <app-url>}"
BASE="${BASE%/}"
echo "== Test 1: CREATE =="
CREATED=$(curl -sS -X POST "$BASE/api/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Prepare Final Year Project Presentation","priority":"High","status":"Pending"}')
echo "$CREATED"
ID=$(echo "$CREATED" | sed -E 's/.*"id":"([^"]+)".*/\1/')
echo; echo "== Test 2: READ ($ID) =="; curl -sS "$BASE/api/tasks/$ID"
echo; echo "== Test 3: UPDATE Pending -> Completed =="
curl -sS -X PUT "$BASE/api/tasks/$ID" -H 'Content-Type: application/json' -d '{"status":"Completed"}'
echo; echo "== Test 4: DELETE =="; curl -sS -X DELETE "$BASE/api/tasks/$ID"
echo; echo "== Verify deleted (expect 404) =="; curl -sS -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/tasks/$ID"
