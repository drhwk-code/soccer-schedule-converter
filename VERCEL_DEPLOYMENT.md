# Vercel Deployment Plan

## Overview
Deploy the Soccer Schedule Converter as a static site on Vercel for public access.

## Prerequisites
1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) if you don't have one
2. **GitHub Account** - Vercel integrates seamlessly with GitHub
3. **Git installed locally**

## Step 1: Initialize Git Repository

```bash
cd "/Users/danielrhawkins/Documents/Soccer Scheduler"
git init
git add .
git commit -m "Initial commit: Soccer Schedule Converter"
```

## Step 2: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name: `soccer-schedule-converter` (or your preferred name)
3. Keep it **Public** so others can use it
4. Do NOT initialize with README (we already have files)
5. Click **Create repository**

## Step 3: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/soccer-schedule-converter.git
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `soccer-schedule-converter` repo
4. Configure project:
   - **Framework Preset**: Other (static site)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (no build needed)
   - **Output Directory**: `./` (leave as default)
5. Click **Deploy**

### Option B: Via Vercel CLI
```bash
npm i -g vercel
cd "/Users/danielrhawkins/Documents/Soccer Scheduler"
vercel
```
Follow the prompts to link to your Vercel account.

## Step 5: Configure Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **Settings** > **Domains**
3. Add a custom domain or use the provided `.vercel.app` URL

## Project Structure for Vercel

```
Soccer Scheduler/
├── index.html          # Main entry point
├── styles.css          # Styling
├── app.js              # Application logic
└── teamsnap_schedule_template.csv  # Reference template
```

## Expected Result

After deployment, your app will be available at:
- `https://soccer-schedule-converter.vercel.app` (or similar)
- Or your custom domain if configured

## Automatic Deployments

Once connected to GitHub:
- Every push to `main` triggers automatic deployment
- Preview deployments for pull requests
- Instant rollbacks available

## Notes

- This is a **static site** with no backend - perfect for Vercel's free tier
- All processing happens client-side in the browser
- No environment variables or build configuration needed
