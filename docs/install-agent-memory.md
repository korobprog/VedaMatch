# Task: Install agentMemory Extension

## Overview
Clone, build, and install the `agentMemory` VS Code extension from `https://github.com/webzler/agentMemory`.

## Status
- [x] Clone repository
- [x] Install dependencies
- [x] Compile and package
- [x] Install extension (Completed by User)

## Steps

### 1. Clone Repository
```bash
git clone https://github.com/webzler/agentMemory /Users/mamu/Documents/agentMemory
```

### 2. Install Dependencies
```bash
cd /Users/mamu/Documents/agentMemory && npm install
```

### 3. Build Package
```bash
npm run compile
npm run package
```

### 4. Install
```bash
code --install-extension agentmemory-0.1.0.vsix
```
*Note: If `code` is not found, user will need to install manually via VS Code UI.*
