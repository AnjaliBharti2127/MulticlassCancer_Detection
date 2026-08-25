# Final integration fixes applied

## Fixed

1. Confidence values are now treated consistently as unit probabilities (`0..1`) and converted to percentages only in the UI.
   - Reports list/details now show values such as `99.8%`, not `1.0%`.
   - Case lists, recent cases, and dashboard average confidence use the same formatter.

2. Report flow now redirects to the saved report details page after either Save Draft or Finalize Report.

3. Completed cases no longer show or open the Generate Report form.
   - A link to the reports page is shown instead.
   - Existing backend duplicate-finalization protection remains unchanged.

4. Relative slide image URLs are converted to absolute backend URLs using the configured API base URL.
   - No localhost value was hardcoded into the page.
   - Existing `/uploads` static serving remains enabled in the backend.

## Files changed

- `client/src/pages/CaseDetails.tsx`
- `client/src/pages/ReportsList.tsx`
- `client/src/pages/ReportDetails.tsx`
- `client/src/pages/CasesList.tsx`
- `client/src/pages/Dashboard.tsx`
- `client/src/components/RecentCasesTable.tsx`
- `client/src/utils/formatConfidence.ts` (new)

## Verification note

The source was inspected and the fixes were applied. Dependency installation/build execution could not complete in the editing environment because the configured npm registry returned HTTP 404 for the locked Vite package. Run locally:

```powershell
cd client
npm install
npm run build

cd ../server
npm install
npm run build
npm test
```
