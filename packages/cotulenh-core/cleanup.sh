#!/bin/bash
set -e

echo "🗑️  CoTuLenh Legacy Cleanup Script"
echo "===================================="
echo ""

# Safety check
read -p "This will DELETE all legacy code. Create git backup first? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git tag "legacy-backup-$(date +%Y-%m-%d-%H%M%S)" 2>/dev/null || echo "⚠️  Could not create git tag (not a git repo or no changes)"
    echo "✅ Backup tag created"
fi

echo ""
read -p "Proceed with cleanup? This CANNOT be undone easily! (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🗑️  Removing legacy implementation..."
rm -rf src/legacy/ && echo "   ✅ src/legacy/ removed"

echo "🗑️  Removing legacy tests..."
rm -rf __tests__/legacy/ && echo "   ✅ __tests__/legacy/ removed"

echo "🗑️  Removing stub files..."
rm -f src/cotulenh.ts && echo "   ✅ src/cotulenh.ts removed"
rm -f src/deploy-move.ts && echo "   ✅ src/deploy-move.ts removed"

echo "🗑️  Removing obsolete documentation..."
rm -rf docs/implementation-tracking/ && echo "   ✅ docs/implementation-tracking/ removed"
rm -f docs/MIGRATION_STATUS.md && echo "   ✅ docs/MIGRATION_STATUS.md removed"

echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "📊 Remaining structure:"
echo ""
echo "src/"
ls -1 src/ 2>/dev/null || echo "  (directory exists)"
echo ""
echo "__tests__/"
ls -1 __tests__/ 2>/dev/null || echo "  (directory exists)"
echo ""
echo "🚀 Ready to start Phase 1: Core Foundation"
echo "   See: docs/COMPLETE_REBUILD_PLAN.md"
