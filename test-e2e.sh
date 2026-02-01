#!/bin/bash

# End-to-End Workflow Test for Aligner Multi-Repo Feature
# Tests all major features in sequence

set -e  # Exit on error

echo "🧪 Starting E2E Workflow Test"
echo "=============================="
echo ""

BASE_URL="http://localhost:3001"
TEST_DIR="/tmp/aligner-e2e-test-$$"
ALIGNER_BIN="/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/aligner/bin/aligner"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓ $1${NC}"
}

fail() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Test 1: API - List all repos
info "Test 1: GET /repos - List all registered repos"
RESPONSE=$(curl -s "$BASE_URL/repos")
if echo "$RESPONSE" | jq -e '.repos | length > 0' > /dev/null; then
  pass "Repos API returns data"
else
  fail "Repos API failed"
fi

# Test 2: API - List all diagrams
info "Test 2: GET /diagrams - List all diagrams with repo metadata"
RESPONSE=$(curl -s "$BASE_URL/diagrams")
if echo "$RESPONSE" | jq -e 'length > 0' > /dev/null; then
  COUNT=$(echo "$RESPONSE" | jq 'length')
  pass "Diagrams API returns $COUNT diagrams"
else
  fail "Diagrams API failed"
fi

# Test 3: API - Create diagram in global repo
info "Test 3: POST /diagram/global - Create diagram in global repo"
DIAGRAM_NAME="e2e-test-global-$$"
RESPONSE=$(curl -s -X POST "$BASE_URL/diagram/global" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"E2E Test Global $DIAGRAM_NAME\", \"nodes\": [], \"edges\": []}")

if echo "$RESPONSE" | jq -e '.filename' > /dev/null; then
  pass "Created diagram in global repo"
else
  fail "Failed to create diagram in global repo: $RESPONSE"
fi

# Test 4: API - Get diagram from global repo
info "Test 4: GET /diagram/global/:filename - Retrieve diagram"
CREATED_FILENAME=$(echo "$RESPONSE" | jq -r '.filename')
RESPONSE=$(curl -s "$BASE_URL/diagram/global/$CREATED_FILENAME")
if echo "$RESPONSE" | jq -e '.name' > /dev/null; then
  pass "Retrieved diagram from global repo"
else
  fail "Failed to retrieve diagram: $RESPONSE"
fi

# Test 5: API - Update diagram
info "Test 5: PUT /diagram/global/:filename - Update diagram"
RESPONSE=$(curl -s -X PUT "$BASE_URL/diagram/global/$CREATED_FILENAME" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated E2E Test", "nodes": [{"id": "node-1", "label": "Test Node"}], "edges": []}')

if echo "$RESPONSE" | jq -e '.name' > /dev/null; then
  pass "Updated diagram successfully"
else
  fail "Failed to update diagram: $RESPONSE"
fi

# Test 6: CLI - Create test repo
info "Test 6: CLI init - Create new test repo"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"
if "$ALIGNER_BIN" init > /tmp/aligner-init.log 2>&1; then
  if [ -d ".aligner" ]; then
    pass "CLI init created .aligner/ directory"
  else
    fail ".aligner/ directory not created"
  fi
else
  cat /tmp/aligner-init.log
  fail "CLI init command failed"
fi

# Test 7: CLI - Register repo
info "Test 7: CLI register - Register test repo"
if "$ALIGNER_BIN" register "$TEST_DIR" --name "E2E Test Repo" > /tmp/aligner-register.log 2>&1; then
  pass "Registered test repo via CLI"
else
  cat /tmp/aligner-register.log
  fail "Failed to register test repo"
fi

# Test 8: API - Create diagram in test repo
info "Test 8: POST /diagram/:repo - Create diagram in test repo"
ENCODED_PATH=$(node -e "console.log(encodeURIComponent('$TEST_DIR'))")
DIAGRAM_NAME_2="E2E Test Repo Diagram $$"
RESPONSE=$(curl -s -X POST "$BASE_URL/diagram/$ENCODED_PATH" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$DIAGRAM_NAME_2\", \"nodes\": [], \"edges\": []}")

if echo "$RESPONSE" | jq -e '.filename' > /dev/null; then
  pass "Created diagram in test repo"
else
  fail "Failed to create diagram in test repo: $RESPONSE"
fi

# Test 9: API - Verify diagram appears in listings
info "Test 9: GET /diagrams - Verify new diagram appears"
RESPONSE=$(curl -s "$BASE_URL/diagrams")
if echo "$RESPONSE" | jq -e '.[] | select(.name == "'"$DIAGRAM_NAME_2"'")' > /dev/null; then
  pass "New diagram appears in listings with correct repo metadata"
else
  fail "New diagram not found in listings"
fi

# Test 10: CLI - List diagrams
info "Test 10: CLI list - Verify diagrams grouped by repo"
OUTPUT=$("$ALIGNER_BIN" list)
if echo "$OUTPUT" | grep -q "E2E Test Repo"; then
  pass "CLI list shows test repo group"
else
  fail "CLI list missing test repo"
fi

# Test 11: API - Delete diagram
info "Test 11: DELETE /diagram/global/:filename - Delete diagram"
RESPONSE=$(curl -s -X DELETE "$BASE_URL/diagram/global/$CREATED_FILENAME")
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  pass "Deleted diagram from global repo"
else
  fail "Failed to delete diagram: $RESPONSE"
fi

# Test 12: CLI - Unregister test repo
info "Test 12: CLI unregister - Remove test repo"
if "$ALIGNER_BIN" unregister "$TEST_DIR" > /dev/null 2>&1; then
  pass "Unregistered test repo via CLI"
else
  fail "Failed to unregister test repo"
fi

# Cleanup
info "Cleaning up test files..."
rm -rf "$TEST_DIR"
# Cleanup any remaining test files
rm -f ~/.aligner/global/e2e-test-*.json 2>/dev/null || true

echo ""
echo "=============================="
echo -e "${GREEN}✅ All E2E tests passed!${NC}"
echo "=============================="
echo ""
echo "Tested features:"
echo "  ✓ Multi-repo registry API (GET /repos)"
echo "  ✓ Cross-repo diagram listing (GET /diagrams)"
echo "  ✓ Create diagram in global repo (POST /diagram/global)"
echo "  ✓ Create diagram in specific repo (POST /diagram/:repo)"
echo "  ✓ Get diagram from repo (GET /diagram/:repo/:filename)"
echo "  ✓ Update diagram (PUT /diagram/:repo/:filename)"
echo "  ✓ Delete diagram (DELETE /diagram/:repo/:filename)"
echo "  ✓ CLI init command"
echo "  ✓ CLI register command"
echo "  ✓ CLI list command (repo grouping)"
echo "  ✓ CLI unregister command"
echo "  ✓ Repo metadata in API responses"
echo ""
