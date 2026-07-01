#!/usr/bin/env bash
set -euo pipefail

# Build frontend, copy dist into backend, commit, push.
# Usage: ./deploy.sh "Your commit message"

if [[ -z "${1:-}" ]]; then
  echo "Commit message required!"
  echo "Usage: $0 \"Your commit message\""
  exit 1
fi

COMMIT_MSG="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Starting deployment..."

# 1. Delete old dist folders
echo "Removing old dist folders..."
rm -rf frontend/dist backend/dist

# 2. Git add deletions
echo "Staging deletions in Git..."
git add .

# 3. Build frontend
echo "Building frontend..."
(
  cd frontend
  npm run build
)

# 4. Copy dist to backend
echo "Copying new dist to backend..."
rm -rf backend/dist
cp -r frontend/dist backend/dist

# 5. Add new files
echo "Adding build files..."
git add .

# 6. Commit
echo "Committing changes..."
git commit -m "$COMMIT_MSG"

# 7. Push to main
echo "Pushing to main..."
git push origin main

echo "Deployment complete!"
