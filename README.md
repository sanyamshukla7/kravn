# Krav'n — Hyperlocal Offline Store Discovery, Reserve & Express Pickup

**Krav'n** is a complete, production-ready web application for hyperlocal offline store discovery, live 360° video & quality inspection, 15% token reservation, direct online purchase, and Express Counter Pickup via QR passes.

## 📁 Complete Project File Structure

```
kravn-project/
├── index.html              # Modular main application entry point (loads external CSS & JS)
├── styles.css              # Editorial theme variables, glassmorphism, animations & custom scrollbars
├── tailwind.config.js      # Custom Tailwind CSS palette (alabaster, sand, espresso, terracotta, sage, amber)
├── data.js                 # Initial stores, items, colour swatches, and embedded base64 studio photography
├── app.js                  # Interactive application controller + localStorage persistence + QR & 360° Canvas engine
├── kravn_app.html          # Single-file all-in-one production bundle (100% self-contained)
├── package.json            # NPM scripts for local development and static hosting
├── vercel.json             # Zero-config Vercel production routing configuration
├── netlify.toml            # Zero-config Netlify production routing configuration
├── manifest.json           # Web App Manifest for mobile home-screen installation
├── README.md               # Full architecture & step-by-step publishing guide
└── assets/                 # Extracted studio product & hero photography
    ├── hero.jpg            # Boutique storefront hero image
    ├── linen.jpg           # Artisanal Belgian Flax Linen Overshirt image
    ├── sneakers.jpg        # Hand-Stitched Suede Court Sneakers image
    └── ceramic.jpg         # Matte Terracotta Pour-Over Coffee Set image

```

## ✨ Key Working Features

1. **Mobile Number + 6-Digit Real SMS OTP Login (`authScreen`)**:

   * Switch between **Customer** and **Shop Owner (Merchant)** roles.

   * Dispatches genuine cellular SMS verification codes directly to mobile phones using Firebase Native Phone Authentication.

   * Secure invisible reCAPTCHA and 6-digit carrier verification.

2. **Hyperlocal Store ID Discovery (`KRV-XXXX`)**:

   * Search by **Unique Store ID** (e.g., `KRV-1042`, `KRV-2088`, `KRV-3105`, `KRV-4019`), shop name, or item keyword.

   * One-click Store ID filter pills and category filters (`Apparel & Tailoring`, `Footwear & Leather`, `Ceramics & Home`).

3. **Interactive Product Inspection & Live 360° Video Reel (`itemModal`)**:

   * Real-time HTML5 `<canvas>` 360° studio video simulator with play/pause toggle, quality grade inspection (`Grade A+ Export`, `Handcrafted First-Run`), colour swatch stock selector, and dual checkout modes (**Reserve with 15% Token** vs. **Direct Full Purchase**).

4. **Express Pickup QR Passes (`viewOrders`)**:

   * Generates instant order passes (`PKP-XXXX`) with a deterministic SVG QR code matrix, locker assignment, and balance breakdown.

5. **Merchant Portal & Store Registration (`viewSettings`)**:

   * **Step 1 (Register Your Store)**: Generates a unique `KRV-XXXX` Store ID and adds your physical shop to the live directory.

   * **Step 2 (Upload Store Item)**: Attach custom photos/videos (or choose studio presets), add custom hex colour swatches with unit stock, set reserve percentage, and publish immediately.

6. **Automatic Browser State Persistence (`localStorage`)**:

   * Newly registered stores, uploaded items, and generated Express Pickup QR passes automatically persist across browser refreshes. Click **Reset Demo Data** in Settings at any time to restore the default catalog.

## 🚀 Step-by-Step Guide to Publish Online (Free & Under 2 Minutes)

### Option 1: Netlify Drop (Fastest — 30 Seconds, No Coding or Terminal Needed)

1. Download `kravn-project-complete.zip` and extract/unzip it on your computer.

2. Open <https://app.netlify.com/drop> in your browser.

3. Drag and drop the extracted folder directly onto the page.

4. Netlify will immediately publish your site and give you a live HTTPS link (e.g., `https://your-kravn-site.netlify.app`) that you can share or connect to a custom domain.

### Option 2: Publish with Vercel (Recommended for Custom Domains & Git)

1. Unzip `kravn-project-complete.zip` into a folder named `kravn-app`.

2. Using the Vercel CLI:

   ```
   npx vercel --prod
   
   ```

3. Or upload the folder to a GitHub repository, visit <https://vercel.com/new>, import the repository, and click **Deploy** (`vercel.json` is already pre-configured).

### Option 3: Publish on GitHub Pages (100% Free Forever)

1. Create a new public repository on [GitHub](https://github.com/new).

2. Click **Add file → Upload files** and drag all files from the extracted zip (`index.html`, `styles.css`, `tailwind.config.js`, `data.js`, `app.js`, `assets/`, etc.), then click **Commit changes**.

3. Go to **Settings → Pages**, select **Deploy from a branch**, choose `main` (and `/ (root)`), and click **Save**.

4. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within 60 seconds.

### Option 4: Run Locally on Your Computer

* **Zero-Server Mode**: Double-click `kravn_app.html` or `index.html` to open directly in Chrome, Edge, Safari, or Firefox.

* **Local Dev Server (Node.js)**:

  ```
  npx serve . -l 3000
  
  ```

* **Local Dev Server (Python 3)**:

  ```
  python3 -m http.server 8080
  
  ```