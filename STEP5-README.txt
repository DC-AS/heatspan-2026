HEATSPAN STEP 5 — UI + WEATHER UPDATE

CHANGES INCLUDED
1. Header dropdowns open on hover and remain selectable while the pointer moves into the menu.
2. Keyboard focus also opens dropdowns for accessibility.
3. Financing is now a separate homepage section, not part of Parts Protection Plan.
4. A live Brooklyn 7-day forecast strip appears directly below the header on every page.
   - Uses Open-Meteo from the visitor's browser.
   - No weather API key is required.
   - Does not affect heatspan.com DNS.
5. Existing Step 4 Request Service backend remains included in /api/request-service.js.

DEPLOYMENT
- Extract ZIP.
- Upload everything to the ROOT of DC-AS/heatspan-2026.
- Replace matching HTML files and keep the api folder.
- Commit. Vercel will redeploy automatically.

NOTE
The forecast is currently fixed to Brooklyn, NY, matching Heatspan's core service area.

WEATHER REFINEMENT
- Each forecast day now includes its calendar date.
- Removed the Brooklyn-specific forecast heading so the widget better represents Heatspan's Brooklyn & Queens service area.
