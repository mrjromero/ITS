# Attendee departure app: maintenance guide

This guide covers [departures.html](departures.html) and [departures.xlsx](departures.xlsx) in `gs/`. Last documented: October 6, 2026.

## How the app works

The HTML page loads the workbook from the same directory. Attendees search by name and select their record. The app matches their flight date and time to a range on the **Departure Schedule** sheet, then displays their hotel departure time or transportation instructions.

The page also provides a schedule table, Copy to Clipboard, and Download as PDF. Workbook loading and PDF export use external JavaScript libraries referenced in the HTML. If automatic workbook fetching fails, the page offers a manual workbook selector.

## Updating the workbook

Keep the filename **departures.xlsx** and sheet name **Departure Schedule**.

Each schedule section needs a dated row with a year, such as `9/11/2026`. On that row, keep the date as the only nonempty cell. Place flight ranges beneath it, with the departure time or instruction in the cell **immediately to the right** of the range. The current workbook uses columns B and C.

| Flight time range | Departure time or instruction | Attendee result |
| --- | --- | --- |
| 5:15 AM - 7:30 AM | Please arrange an Uber or taxi for your transfer to the airport. | Shows the instruction under Transportation instructions |
| 8:10 AM - 8:20 AM | 5:30 AM | Asks the attendee to meet transportation in the hotel lobby at 5:30 AM |
| A valid flight time range | Empty cell | Asks the attendee to contact the transportation desk |

Use clock times with AM/PM. Excel time cells also work when their displayed format includes AM/PM. The app reads formatted cell values.

Nonempty entries that are not recognized clock times are treated as literal instructions. **Double-check time entries:** a mistyped time can be displayed as an instruction rather than rejected. Instructions are rendered as plain text; HTML markup is not executed.

There are no hardcoded early- or late-hour rules. Choose the applicable flight ranges in the workbook. Instructions are displayed exactly as written and are **not automatically translated** when the attendee changes language. Use bilingual or multilingual wording in the cell when needed.

### Schedule constraints

- Range endpoints are inclusive. Ranges for the same date must not overlap, including at a shared endpoint.
- Each range must start and end on the same day; ranges crossing midnight are unsupported. Use separate dated sections and ranges.
- An attendee outside the listed ranges receives the unresolved-departure message.
- Rows without a recognized range are skipped. Carefully check range formatting: a malformed range may be omitted rather than trigger an error.
- Missing schedule sections, ranges before a dated section, and overlapping ranges can disable lookup for the entire workbook.

### Attendee sheets

Every sheet other than **Departure Schedule** is treated as an attendee sheet. Keep these exact headers:

`Date`, `Time`, `Flight`, `Name`, `PAX`, `Union`, `Airline`

Do not add documentation or scratch worksheets to the workbook: they may be interpreted as attendee data and fail validation. Keep maintenance notes in this Markdown guide.

Use explicit years in attendee dates when possible. A date without a year resolves only when one schedule date matches its month and day. Search requires at least two characters.

## Changes made on October 6, 2026

### Backup first

Before editing, exact copies of the original HTML and workbook were committed to:

[backups/departures-2026-10-06/](backups/departures-2026-10-06/)

Backup commit: [7545c07](https://github.com/mrjromero/ITS/commit/7545c07005273d0d8254ac6402e57146faa816d4).

Keep this dated backup unchanged.

### Transportation instruction support

Implementation commit: [f240944](https://github.com/mrjromero/ITS/commit/f2409440746507a30664ef6b8672678e0b056c15).

Previously, every schedule range required a hotel departure clock time. The text **Uber** in cell C7 caused the error “Invalid hotel departure time for 5:15 AM - 7:30 AM,” disabling lookup.

The update:

- Accepts a clock time, written instruction, or blank departure entry.
- Shows written instructions in the attendee notice, schedule, clipboard text, and content passed to PDF export.
- Gives a transportation-desk message for blank entries.
- Retains date matching and overlapping-range checks.
- Adds English, Spanish, and French interface labels for the new behavior.
- Preserves the selected attendee display when changing language.
- Expands C7 to “Please arrange an Uber or taxi for your transfer to the airport.”

The workbook edit changed only that shared-string text; all other workbook ZIP members were preserved. No reimbursement or booking policy was added. The beta files were not changed.

### Verification completed

Direct JavaScript checks using the actual XLSX parser and workbook passed for:

- Loading all five schedule rules.
- Resolving instructions and Excel numeric departure times.
- Inclusive range boundaries, gaps, and unmatched dates.
- Blank entries and literal instruction preservation.
- Rejecting overlapping ranges and ranges before a dated section.

Workbook comparison confirmed that only the intended shared-string member changed.

**Verification limit:** automated browser testing was unavailable because the browser installation could not be completed. Live display, actual clipboard interaction, and rendered PDF download were not verified in that session. A repository commit does not by itself confirm the hosted page has deployed.

## Workflow for future updates

1. Read this guide and the current files from the repository before editing.
2. Make a new dated backup of both files before changes that should be easily reversible. Use a unique folder name if making multiple backups on the same date.
3. Keep HTML and workbook changes consistent. Preserve attendee data and workbook formatting.
4. Check schedule parsing and matching, then review the diff for unintended changes.
5. Commit with a clear description and record meaningful behavior changes and verification limits here.
6. After the hosting system serves the update, verify the page using the checklist below.

### Live verification checklist

- Refresh the page; confirm that name search appears without a workbook error.
- Select an attendee whose flight is between 5:15 AM and 7:30 AM on the scheduled date; confirm the Uber/taxi instruction.
- Select an attendee with a timed shuttle departure; confirm the hotel lobby time.
- Change the interface language while an attendee is selected.
- Copy the attendee details and inspect the pasted message.
- Download the PDF and check the notice and schedule.
- For future schedule edits, also check any new ranges, blank entries, and uncovered flight times.

Do not assume a GitHub update is already live. Confirm the hosted page after deployment; investigate hosting or caching if it still shows the old behavior.

## Restoring the original version

To restore the exact pre-update pair, copy both files from `gs/backups/departures-2026-10-06/` back to `gs/`, replacing the active pair, and commit the restoration. Restore only these two paths; do not reset unrelated repository changes.

**Known limitation of that backup:** it preserves the original error too. Its workbook contains “Uber,” and its HTML only accepts departure times. Restoring that pair restores the previous state, not a working version with transport instructions.

If attendee data or schedules have changed since the backup, review those changes before overwriting the workbook. For a code-only rollback, the active workbook would also need to be compatible with the old time-only parser.

The backup is a recovery copy, not a separate production app. The active files remain `gs/departures.html` and `gs/departures.xlsx`.

## October 6 follow-up: correct the schedule date

The live attendee records all used **Oct 8**, while the schedule section in B4 still used **9/11/2026**. This prevented all 20 attendee records from matching. The earlier checks used the schedule date in synthetic lookups and missed this cross-sheet mismatch.

B4 was corrected to **10/8/2026**, interpreting the intended schedule date from the attendee records and retaining the existing year. Flight ranges, departure times, transport instructions, and attendee records were unchanged. The attendee sheet still has the legacy name “Departures - 11 Sep”; matching uses its Date column, not its sheet name.

The corrected workbook was checked against every actual attendee record: 20 of 20 matched exactly one schedule rule (2 instruction records and 18 timed-departure records). These are row counts, not passenger counts.

**Required check for future workbook edits:** run every actual attendee Date and Time through the lookup, report unmatched records, and review all schedule dates before publishing. Synthetic lookups alone are insufficient. Do not bypass date matching to conceal a mismatch.


## October 28, 2026: Bogotá Annual Council production release

Canonical attendee link: https://its.interamerica.org/gs/departures . The page loads departures.xlsx and contains 139 attendee records / 189 passengers for November 3–5, 2026. All 139 records resolve to one of 19 hotel pickup rules. The final reviewed workbook incorporates coordinator corrections, name capitalization cleanup, and the user-approved official Wingo November 4 05:10 departure (02:00 hotel pickup).

Dated hotel pickups use an Excel date/time displayed as `m/d/yyyy h:mm AM/PM`. The app displays that calendar date in English, Spanish or French. This keeps the November 5 01:45 flight distinct from its November 4 22:00 hotel pickup. Other clock-only and instruction behavior is unchanged. Test warnings are removed from production; PDF export is named Bogota_Departure_Information.pdf.

Recovery: the complete previous production pair remains at commit `9b8cb9198d70e419ebd0ad870af19df488aa3deb`, paths gs/departures.html and gs/departures.xlsx. Restore only those two files if needed. This Git-history backup avoids serving a second old passenger page. Earlier backup folders remain untouched. Temporary Bogotá review copies may be removed from main only after successful production verification; they remain recoverable at the same commit.

Validation: actual saved workbook through the app's SheetJS parser, all attendee lookups and counts, cross-midnight boundaries, EN/ES/FR and browser PDF. Production deployment and canonical URL must be verified after publication.


## November 3, 2026: separately coordinated transportation

The optional attendee column **Transportation Status** accepts `arranged separately` (case-insensitive). Empty cells retain regular group scheduling. Exception attendees remain searchable, but their notice, clipboard text and PDF show only their name, date and the translated instruction to follow Crussana's arrangements. Flight times, passenger counts and the general hotel schedule are omitted from these results. Exceptions take precedence even when their date or time cannot be parsed. Search also ignores periods in names.

Count only `groupPeople()` for scheduled group transportation, and use `attendeeDeparture(person)` when resolving an attendee's pickup. Never derive exception pickups from the shared flight ranges. Unknown exception PAX may remain blank and must not be treated as a verified zero or included in a combined passenger total.

Current scope: **144 searchable records = 137 regular records + 7 exceptions**. The regular records total **186 passengers**, all with resolved pickups. November 4 pickup counts: 02:00=16, 03:00=41, 04:00=49, 06:00=13, 08:00=25, 10:00=37, 22:00=2. November 5 10:00=3. No regular group passengers remain on November 3.

The six approved November 4 updates were applied to the existing production workbook. The verified Wingo 05:10 times and dated November 4 22:00 pickup for the November 5 01:45 flight are preserved. The schedule sheet is unchanged. No private coordinator notes are stored in this workbook.

Recovery: the complete previous production pair remains at commit `23ab342f32c6b243d4566a0e08122f7d74436964`. Restore only `gs/departures.html` and `gs/departures.xlsx` if needed. Do not publish another old passenger lookup as a backup.

Browser regression test: `node gs/tests/departures.cjs <path-to-SheetJS-0.18.5-JS> <path-to-Playwright-module> <path-to-Chromium-executable>`. Public tests use synthetic records only. They cover regular passenger counts, 21 exception/language combinations, missing-time precedence, punctuation-insensitive search, schedule boundaries and overnight dates. Clipboard text and the content handed to PDF export are checked; the PDF generator is stubbed. Separate private verification covered every actual attendee, all corrected departures, and preservation of unrelated records and the schedule.

## Event expiration

The November 7, 2026 retirement removes `gs/departures.xlsx` from the current published site. The prior production workbook remains recoverable at commit `95a314840e74342db4d17800965c9c75aace8b19`. This repository is public, so its history is public too. Restore only an approved workbook for a new event; do not restore the expired attendee roster to the live site.

`EVENT_ENDS_AT` near the top of the application script is the first instant when the lookup is closed. It must include an explicit UTC offset or `Z`; never use a timezone-less date. For Bogotá, it is `2026-11-06T00:00:00-05:00`, immediately after the final departure day, November 5. Bogotá uses `America/Bogota` (UTC−05:00) throughout the year. The last listed flight is November 5 at 16:25, with its hotel pickup at 10:00. Do not use the conference closing time as the cutoff if attendees leave later.

At and after the cutoff, the app shows a translated event-ended message and does not request or parse the attendee workbook. It hides and disables search, manual imports and PDF export, and clears in-memory records, the selected attendee, clipboard source text and rendered results. Open tabs check the deadline with a bounded timer, on focus, page restoration, visibility changes, before printing and before data actions. Pending workbook/import results cannot restore the lookup. A PDF being generated at the cutoff will not initiate a download afterward. Invalid or missing cutoff text fails closed with an unavailable message. Once a tab closes for expiration, changing the device clock backward will not reopen that tab.

This is a display/lifecycle feature, **not access control**. It relies on the device clock. The static workbook URL, repository history, previously downloaded workbooks/PDFs and already-copied clipboard contents are not revoked. Retiring the public workbook is a separate approved publishing action. Enforced data retention requires removing it from public hosting or using a server-controlled endpoint; client-side JavaScript cannot enforce that boundary.

### Reusing the app for another event

1. Verify the final hotel pickup and flight dates, including overnight departures and any transport handled separately.
2. Set `EVENT_ENDS_AT` to the approved cutoff in that event's local timezone with the correct offset for that date. Update it together with the event title, PDF filename, coordinator text and workbook. A new workbook alone does not reopen an expired event.
3. Test before, exactly at and after the cutoff, including a tab left open across it. Do not add a public query-string or manual-upload bypass.
4. Verify production after the approved deployment. Keep recovery in Git history instead of publishing an old attendee page as a backup.

Deterministic lifecycle test: `node gs/tests/departures-expiry.cjs <path-to-SheetJS-0.18.5-JS>`. It runs the actual app script and SheetJS parser with synthetic records, a controlled clock and a lightweight DOM/PDF test double. It covers visitor timezones, cutoff boundaries, expired requests, translations, stale async results, copy/export/import guards, resume/print checks, clock rollback, invalid configuration, future-event reuse and regular/exception/overnight behavior. The browser regression test freezes time before the production cutoff. Neither suite claims that a stubbed PDF was rendered by the real PDF library.
