#!/bin/bash
# Creates a deployment tarball from the project (excludes node_modules, .git, build artifacts)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT="/mnt/d/nih-deploy.tar.gz"

echo "Creating deployment package from: $PROJECT_DIR"
cd "$PROJECT_DIR"

tar \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='*/node_modules' \
  --exclude='*/.next' \
  --exclude='./.git' \
  --exclude='./dist' \
  --exclude='./.pnpm-store' \
  --exclude='./deploy/pack.sh' \
  -czf "$OUTPUT" \
  .

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo ""
echo "Done! Created: $OUTPUT ($SIZE)"
echo ""
echo "Next steps:"
echo "  1. Upload $OUTPUT to your server via MobaXterm SFTP"
echo "  2. On the server, run:"
echo "       mkdir ~/nih && cd ~/nih && tar -xzf ~/nih-deploy.tar.gz"
echo "       bash deploy/server-setup.sh"
