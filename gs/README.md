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
