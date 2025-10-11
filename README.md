# Programming Notes - BrunoB.me

A simple web platform to publish notes and tutorials about programming, algorithms, and data structures. It keeps a visual style consistent with brunob.me.

## What’s included?
- Notes landing page with search and category filters
- Article system with multi-language code examples
- Responsive design with automatic light/dark theme
- Optimized images in AVIF format
- Complexity tables for algorithm analysis

## How to publish on GitHub Pages

1. Create a repository named, for example, `brunobme-site` (or `brunob.github.io` if you want to use `https://brunob.github.io`).
2. Upload the `index.html` file (and this `README.md`).
3. In GitHub: Settings → Pages → Source: `Deploy from a branch` → Branch: `main` → Folder: `/root` → Save.
4. Wait 1–2 minutes. Your site will be available at the URL GitHub shows you.

## Use the brunob.me domain

- Point `brunob.me` DNS to GitHub Pages. In your DNS provider add:
  - A records (4) to: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (for the root @)
  - CNAME for `www` → `your-user.github.io` (e.g., `brunob.github.io`)
- In GitHub: Settings → Pages → Custom domain → enter `brunob.me` and save. Enable "Enforce HTTPS" when available.
- (Optional) Create a `CNAME` file at the repo root with the text `brunob.me`.

## Edit locally

You can open the `index.html` file directly in your browser. No build required.

## Quick customization
- Change the title and texts inside `index.html`.
- Replace the GitHub/LinkedIn/email links.
- Adjust colors in CSS variables (`:root`).

## License

This project is yours for personal use. If you share it, please keep a reference to this README.
