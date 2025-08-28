# 🎭 Playwright Unsplash Downloader Integration

This guide explains how to integrate this Playwright-based Unsplash image downloader into another project. It reflects the actual functionality and scripts provided by this repository.

## 🔄 Integration Options

You can integrate this tool into your main project in one of the following ways:

1) tools/ subfolder (recommended)
- Add this repo to your main project's tools/ directory (via copy or git submodule)
- Useful when you want full control over the code

2) Git submodule
- git submodule add https://github.com/nicholasadamou/playwright-unsplash-downloader tools/playwright-image-downloader
- Keeps the tool versioned separately and easy to update

3) Monorepo/workspace
- Include this project as a workspace package and run its scripts from the root

## 🧩 Wiring It Into Your Main Project

Add a script to your main project's package.json that calls this tool:

```json
{
  "scripts": {
    "download:images:playwright": "cd tools/playwright-image-downloader && pnpm run download"
  }
}
```

Then run from your main project root:

```bash
pnpm run download:images:playwright
```

This will build the TypeScript sources and execute the CLI exposed by this project.

## 📁 Suggested File Structure

```
<your-project>/
├── tools/
│   └── playwright-image-downloader/
│       ├── src/
│       ├── package.json
│       ├── playwright.config.js
│       ├── .env.example
│       └── README.md
└── public/
    ├── unsplash-manifest.json         # Source manifest (shared)
    └── images/unsplash/               # Download directory (shared)
```

Notes:
- The manifest and output directory can be customized via CLI flags or environment variables.
- If your project does not use public/, choose any path and pass it via --manifest-path/--download-dir.

## ⚙️ Environment Setup

From the tool directory:

```bash
cd tools/playwright-image-downloader
pnpm install
pnpm run install-browsers
cp .env.example .env
# Edit .env with your Unsplash credentials and preferences
```

Relevant environment variables supported by this project:

```bash
# Required
UNSPLASH_ACCESS_KEY=your_access_key_here

# Optional (enables auto-login)
UNSPLASH_EMAIL=your_email@example.com
UNSPLASH_PASSWORD=your_password_here

# Optional configuration overrides
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_RETRIES=3
PLAYWRIGHT_PREFERRED_SIZE=original
PLAYWRIGHT_LIMIT=0
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_DEBUG=false
```

## 🚀 Running the Downloader

From your main project (via the added script):

```bash
pnpm run download:images:playwright
```

Or directly inside the tool:

```bash
# Build and run
pnpm run download

# Development mode with hot reload
pnpm run download:dev

# Visible browser (helpful for manual login or debugging)
pnpm run download -- --no-headless
pnpm run download:dev -- --no-headless

# Environment check and list-only modes
pnpm run download -- check
pnpm run download -- list
```

## 🎛️ CLI Options

The CLI supports the following options (see README for full details):

```bash
pnpm run download -- \
  --timeout 45000 \
  --retries 5 \
  --limit 10 \
  --manifest-path ./public/unsplash-manifest.json \
  --download-dir ./public/images/unsplash \
  --no-headless \
  --debug
```

## 🧠 Smart Path Resolution

The tool tries to find your manifest and output folders in common locations if not explicitly provided. You can always override with --manifest-path and --download-dir.

## 🤖 CI/CD Integration

Example GitHub Actions step:

```yaml
- name: Download images with Playwright
  run: |
    cd tools/playwright-image-downloader
    pnpm install
    pnpm run install-browsers
    pnpm run download
  env:
    UNSPLASH_EMAIL: ${{ secrets.UNSPLASH_EMAIL }}
    UNSPLASH_PASSWORD: ${{ secrets.UNSPLASH_PASSWORD }}
    UNSPLASH_ACCESS_KEY: ${{ secrets.UNSPLASH_ACCESS_KEY }}
```

Tips:
- In CI, consider running with --headless (default) and increasing --timeout for large downloads.
- Ensure your pipeline caches pnpm and Playwright browsers where possible for speed.

## 🧩 Programmatic Usage (Optional)

You can also use the downloader as a library inside a Node.js script within your main project:

```ts
import { PlaywrightImageDownloader } from "./tools/playwright-image-downloader/src/index.js";

const downloader = new PlaywrightImageDownloader({
  headless: true,
  timeout: 45000,
});

const result = await downloader.run();
console.log("Downloaded:", result.stats.downloaded);
```

Adjust the import path based on where you place this tool in your project.

## 🔧 Troubleshooting Integration

Common issues and fixes:

- "Manifest not found"
  - Pass --manifest-path explicitly or place the file in a common location like ./public/unsplash-manifest.json
- "Browser installation failed"
  - Run pnpm run install-browsers and ensure your build agents have necessary system dependencies
- "Permission denied"
  - Ensure the download directory exists and your process can write to it
- "Login failed"
  - Verify UNSPLASH_EMAIL/UNSPLASH_PASSWORD or run with --no-headless for manual login

Use debug mode to diagnose:

```bash
cd tools/playwright-image-downloader
pnpm run download -- --no-headless --debug --concurrency 1
```

## 📊 Example Output (Playwright Service)

```
🎭 Playwright Unsplash Downloader
🚀 Initializing Playwright Unsplash Downloader...
✅ Browser initialized
📄 Loading manifest...
✅ Loaded N images from manifest
📊 Configuration:
   • Download directory: /path/to/images
   • Concurrency: 3
   • Timeout: 30000ms
   • Retries: 3
   • Headless: true
🚀 Starting downloads...

📥 [1/3] Downloading: ZV_64LdGoao
✅ Downloaded: ZV_64LdGoao.jpg (2.34 MB)
⏭️  Skipped (exists): NZYgKwRA4Cg

📊 Download Results:
   ✅ Successfully downloaded: 15
   ⏭️  Skipped (already exist): 2
   ❌ Failed to download: 1
   ⏱️  Total time: 45.2s
   💾 Storage used: 45.67 MB
   📄 Local manifest: public/images/unsplash/local-manifest.json
🎉 Download process complete!
```

## 📞 Support

- See this repository's README for full documentation
- Run in debug mode for visual troubleshooting
- Verify your Unsplash account and API access key
