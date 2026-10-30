# NakharaX Group — Solar System & Ecosystem

> Engineering intelligence. Building with purpose. Explore our connected solar system of technology and human ambition.

Official interactive static website for **NakharaX Group**.

## 🌐 Live Production
- **Official Domain:** [https://nakharax.com](https://nakharax.com)
- **GitHub Pages:** [https://nakharax.github.io/nakharax-group/](https://nakharax.github.io/nakharax-group/)
- **Vercel Deployment:** Hosted on Vercel Global Edge Network with zero-config static optimization.

## 🚀 Deploy to Vercel
1. Go to [Vercel Dashboard (New Project)](https://vercel.com/new).
2. Select and import **`nakharax/nakharax-group`**.
3. Keep default settings (`Other` framework, root directory `./`).
4. Click **Deploy**.

Configuration file [`vercel.json`](./vercel.json) is pre-configured with:
- Global CDN caching headers for assets and vendor bundles (`max-age=31536000, immutable`)
- Modern security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- Custom [404 Error page](./404.html) matching the cosmic theme.

## 🛠️ Tech Stack
- HTML5 / CSS3 (Custom design system & fluid responsive layout)
- Vanilla JavaScript (Performance focused)
- Three.js (Core & Modules)

## 🎬 Brand Film

The existing **Watch the vision** dialog now opens **A Shared Orbit**, an original 24-second kinetic brand film. Its live Canvas/Web Audio player reuses the original artwork and licensed local fonts, offers EN/TH captions, chapters, seeking, a transcript and reduced-motion handling. The rest of the website and Three.js scene keep their existing layout.

## 📄 License
All proprietary brand assets belong to NakharaX Group. Three.js is licensed under the MIT License (see `vendor/THREE-LICENSE.txt`).
