# Stride — Running Coach

A free React + Vite running planner and training log. No backend, account, Strava API, or paid service is required.

## Features
- Multiple race goals (distance, finish time, event name/date, current weekly distance, runs/week).
- Rule-based suggested training schedule and pace estimates.
- Manual run logging, editing and deleting.
- Best-effort screenshot OCR with Tesseract.js; always verify values before saving.
- Overview dashboard, training plan, run history, weekly progress and JSON backup/import.
- Responsive design and web-app metadata for iPhone Add to Home Screen.

## Important limitations
- Data stays in each browser/device. Mac and iPhone do not sync automatically; export a JSON backup on one and import it on the other.
- OCR is best-effort; verify every field. OCR language data requires internet on first use.
- The plan is a general rule-based starting point, not individualized medical advice or a replacement for a qualified coach.
- Stride does not connect to Strava or use its API.
- GitHub Pages publishes the website/code publicly. Personal run records stay in local browser storage, not in the repository.

## Run on your Mac
1. Install Node.js LTS: https://nodejs.org/en/download
2. Unzip this project and open Terminal in its folder, e.g. `cd ~/Downloads/my-running-coach`
3. Run `npm install`
4. Run `npm run dev`
5. Open the local URL shown in Terminal (usually `http://localhost:5173`). Stop with Control+C.

## Publish free with GitHub Pages
1. Create a GitHub account if needed and a **public** repository named exactly `my-running-coach`.
2. In Terminal, inside this project folder, run:

   ```bash
   git init
   git add .
   git commit -m "Create Stride running coach"
   git branch -M main
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/my-running-coach.git
   git push -u origin main
   ```

   Replace `YOUR-GITHUB-USERNAME` with your username. Follow GitHub's sign-in prompts if asked.
3. In the repository on GitHub, go to **Settings → Pages** and select **GitHub Actions** as the source.
4. Open the **Actions** tab and wait for “Deploy Stride to GitHub Pages” to succeed.
5. Website URL: `https://YOUR-GITHUB-USERNAME.github.io/my-running-coach/` (replace username).

## Add to iPhone Home Screen
Open the published site in Safari → Share → Add to Home Screen → Add. Use Data & settings to export/import a JSON backup between Mac and iPhone.

## Updating
After editing files, run `git add .`, `git commit -m "Update Stride"`, and `git push`. GitHub Actions redeploys it.
