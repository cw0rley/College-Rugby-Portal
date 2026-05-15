# College Rugby Portal — Brand Kit

## Brand specs
- **Navy** `#0A1F44` (primary)
- **Lime** `#00FF00` (accent)
- **White** `#FFFFFF`
- **Typeface**: Montserrat ExtraBold (weight 800), Bold (weight 700)
- **Tagline**: "Explore. Connect. Play."

## Files

### `svg/` — primary working files (require Montserrat installed in the rendering context)

**With CRP letters:**
- `badge.svg` — primary badge (filled navy box, posts + CRP + grass)
- `badge-outlined.svg` — alternate badge with white fill and navy outline
- `favicon.svg` — true 1:1 square version of the badge for browser tabs / app icons

**Goal-posts only (no letters):**
- `badge-icon.svg` — same shape as `badge.svg` but without the CRP letters
- `favicon-icon.svg` — true 1:1 square version of the no-letters badge

**Header:**
- `header.svg` — website header with goal-posts badge + "COLLEGE RUGBY PORTAL" wordmark and lime "Explore. Connect. Play." tagline

### `svg-outlined/` — font-independent versions (text baked to vector paths)
Same files as `svg/` but all text is converted to SVG paths. Use these for print, email signatures, third-party tools, or anywhere Montserrat may not be installed.

### `png/` — raster exports
- `favicon-{16,32,48,64,192,512}.png` — favicon WITH CRP letters
- `favicon-icon-{16,32,48,64,192,512}.png` — favicon WITHOUT letters (goal-posts only)
- `badge-{256,512,1024}.png` — primary badge with CRP
- `badge-icon-{256,512,1024}.png` — badge without letters
- `header-{800,1600,2400}.png` — header lockup at 1x, 2x, 3x for high-DPI screens

### `favicon.ico` / `favicon-icon.ico`
Multi-resolution Windows/browser icons (16/32/48/64). Drop one at `/favicon.ico` on your web server. The `-icon` version is the no-letters variant.

## Quick use

**Website header:** `<img src="/brand-kit/svg/header.svg" alt="College Rugby Portal">`

**Browser tab icon (with letters):**
```html
<link rel="icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/brand-kit/svg/favicon.svg">
<link rel="apple-touch-icon" href="/brand-kit/png/favicon-192.png">
```

**Browser tab icon (no letters):**
```html
<link rel="icon" href="/favicon-icon.ico">
<link rel="icon" type="image/svg+xml" href="/brand-kit/svg/favicon-icon.svg">
<link rel="apple-touch-icon" href="/brand-kit/png/favicon-icon-192.png">
```

**Social/OG preview:** use `png/badge-1024.png` or `png/header-2400.png`
