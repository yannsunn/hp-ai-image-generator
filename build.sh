#!/bin/bash

# Frontend build
cd frontend

# Create a temporary index.html for build
cat > index.build.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI画像生成システム - ホームページ制作用</title>
  <meta name="description" content="ホームページ制作に特化したAI画像生成・編集システム">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.jsx"></script>
</body>
</html>
EOF

# Use the build index
mv index.html index.dev.html
mv index.build.html index.html

# Run build
npm run build

# Restore dev index
mv index.html index.build.html
mv index.dev.html index.html

# Clean up
rm -f index.build.html