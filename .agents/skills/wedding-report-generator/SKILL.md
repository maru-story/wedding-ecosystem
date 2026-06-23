---
name: wedding-report-generator
description: Generates a beautiful client-facing PDF release notes report from version updates, Git history, and Playwright screenshots.
---

# Wedding Report Generator Skill

Use this skill to automatically generate a professional, client-facing PDF release notes report whenever there is a version update or significant changes to the system.

## Workflow Steps

### Step 1: Detect Version Updates
1. Check `package.json` files in the monorepo workspaces (`apps/dashboard`, `apps/scanner`, `packages/api`).
2. Compare the versions with the last stable git tag or commit. If a version bump is found, identify the target version (e.g., `v1.2.0`).
3. **Separate App Reports Policy (CRITICAL)**: If multiple applications or packages are updated simultaneously, generate **separate** PDF reports for each application (e.g., one for Dashboard, one for Scanner, etc.) rather than merging them into a single PDF. Create separate JSON files (e.g., `dashboard_data.json`, `scanner_data.json`) and run the compiler script with `--data` and `--output` arguments for each app.

### Step 2: Extract and Analyze Git History
1. Run `git log` since the last tag or previous version release to see the list of commits.
2. Group the changes into five standard categories:
   - **Peningkatan Kualitas & Performa (Improvements)**
   - **Perbaikan Kendala Sistem (Bugfixes)**
   - **Fitur Baru (New Features)**
   - **Penyesuaian Tata Letak & Alur (Changes)**
   - **Catatan Teknis & Ketentuan (Notes)**
3. **Tone of Voice Rules (CRITICAL)**:
   - Rephrase technical commit messages into clean, non-technical Bahasa Indonesia.
   - Avoid developer jargon (e.g., replace "flexbox overlap", "state management", "db migration" with "tata letak halaman", "sinkronisasi data", "sistem penyimpanan").
   - **Never** use subjective adjectives (e.g., do not use "lebih bagus", "lebih rapi", "lebih cepat"). Explain the change objectively (e.g., "Peningkatan kualitas latar belakang menggunakan format SVG agar gambar terlihat tajam").

### Step 3: Identify Visual Changes & Run Screenshot Generator
1. Scan the list of updates for items that impact the user interface (UI) or layouts.
2. If layout changes are present, map them to screenshots.
3. Run the E2E Playwright screenshot test spec to capture visual updates:
   ```bash
   npx playwright test tests/e2e/screenshot-generator.spec.ts --project=chromium --workspace=packages/api
   ```
4. Verify that screenshots are saved in `/home/mochrafi/wedding-project/wedding-report-generate/assets/<app_name>/<version>/<filename>.png`.

### Step 4: Populate Data JSON
1. Read the drafted updates and update `/home/mochrafi/wedding-project/wedding-report-generate/data.json` with the following structure:
   ```json
   {
     "report_title": "Laporan Pembaruan Aplikasi Wedding Ecosystem",
     "app_name": "Wedding Ecosystem & Invitation Apps",
     "version": "vX.Y.Z",
     "date": "DD MMMM YYYY",
     "overview": "Ringkasan pembaruan...",
     "improvements": [{ "title": "...", "description": "...", "image": "assets/...", "image_caption": "..." }],
     "bugfixes": [],
     "new_features": [],
     "changes": [],
     "notes": []
   }
   ```

### Step 5: Compile Report
1. Execute the report generator script:
   ```bash
   python3 /home/mochrafi/wedding-project/wedding-report-generate/generate_report.py
   ```
2. Present the link of the newly created PDF file to the user.
