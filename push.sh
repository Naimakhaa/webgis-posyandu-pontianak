#!/bin/bash
# Pemakaian: ./push.sh https://github.com/USERNAME/NAMA-REPO.git
set -e
if [ -z "$1" ]; then echo "Isi URL repo: ./push.sh <url-repo>"; exit 1; fi
[ -d .git ] || git init
git branch -M main
git add .
git commit -m "SK-3: Backend API Node.js + Express" || true
git remote remove origin 2>/dev/null || true
git remote add origin "$1"
git push -u origin main
