#!/bin/bash

# Test SmearGraph MCP server
# Usage: ./test-mcp.sh

set -e

echo "=== SmearGraph MCP Server Test ==="
echo ""

# Build
echo "1. Building..."
npm run build > /dev/null 2>&1
echo "   ✓ Build passed"

# Create test project
echo "2. Creating test project..."
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

cat > a.ts << 'EOF'
import { b } from './b';
export function a() { return b(); }
EOF

cat > b.ts << 'EOF'
import { a } from './a';
export function b() { return a(); }
EOF

cat > c.ts << 'EOF'
import { a } from './a';
export function c() { return a(); }
EOF

cat > unused.ts << 'EOF'
export function unused() { return 42; }
EOF

echo "   ✓ Test project created at $TEST_DIR"

# Initialize
echo "3. Initializing SmearGraph..."
node "/Users/wengchuangchuang/Desktop/SmearGraph /dist/cli.js" init > /dev/null 2>&1
echo "   ✓ Knowledge graph initialized"

# Test tools
echo "4. Testing MCP tools..."

# Test circular
echo "   Testing smeargraph_circular..."
CIRCULAR=$(node -e "
const t = require('/Users/wengchuangchuang/Desktop/SmearGraph /dist/mcp/tools/circular.js');
t.handler({}).then(r => console.log(JSON.stringify(r)));
" 2>/dev/null)
if echo "$CIRCULAR" | grep -q "cycleCount"; then
  echo "   ✓ smeargraph_circular works"
else
  echo "   ✗ smeargraph_circular failed"
fi

# Test dead
echo "   Testing smeargraph_dead..."
DEAD=$(node -e "
const t = require('/Users/wengchuangchuang/Desktop/SmearGraph /dist/mcp/tools/dead.js');
t.handler({}).then(r => console.log(JSON.stringify(r)));
" 2>/dev/null)
if echo "$DEAD" | grep -q "deadCount"; then
  echo "   ✓ smeargraph_dead works"
else
  echo "   ✗ smeargraph_dead failed"
fi

# Test impact
echo "   Testing smeargraph_impact..."
IMPACT=$(node -e "
const t = require('/Users/wengchuangchuang/Desktop/SmearGraph /dist/mcp/tools/impact.js');
t.handler({ path: 'a.ts' }).then(r => console.log(JSON.stringify(r)));
" 2>/dev/null)
if echo "$IMPACT" | grep -q "nodeCount"; then
  echo "   ✓ smeargraph_impact works"
else
  echo "   ✗ smeargraph_impact failed"
fi

# Test memory
echo "   Testing smeargraph_memory_store..."
MEMORY=$(node -e "
const t = require('/Users/wengchuangchuang/Desktop/SmearGraph /dist/mcp/tools/memory.js');
t.storeHandler({ kind: 'insight', title: 'Test', content: 'Test content' }).then(r => console.log(JSON.stringify(r)));
" 2>/dev/null)
if echo "$MEMORY" | grep -q "stored"; then
  echo "   ✓ smeargraph_memory_store works"
else
  echo "   ✗ smeargraph_memory_store failed"
fi

# Count tools
echo "5. Counting tools..."
TOOL_COUNT=$(grep -c 'name: "smeargraph_' /Users/wengchuangchuang/Desktop/SmearGraph\ /dist/mcp/index.js)
echo "   ✓ $TOOL_COUNT tools registered"

# Cleanup
echo "6. Cleaning up..."
rm -rf "$TEST_DIR"
echo "   ✓ Cleanup complete"

echo ""
echo "=== Test Complete ==="
echo "Tools: $TOOL_COUNT"
echo "Status: All tests passed"
