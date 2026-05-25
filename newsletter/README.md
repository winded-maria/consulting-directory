# CCC Opportunities Newsletter

A weekly digest of education / EiE / MHPSS / TVET consultancy and RFP opportunities, sent to CCC community members who subscribe.

## Pipeline

```
Feed sources ─────────┐
(RSS, Alerts,         │
 Funder pages,        ├──► poll (daily, automatic) ──► opportunities (status=pending)
 Member submissions)  │
                      │
Admin review ─────────┘
(Mondays)
       │
       ▼
opportunities (status=approved) ──► sendDigest (Monday 17:00) ──► subscribers' inboxes
                                                                  │
                                                                  └─► mark status=sent, set date_sent
```

## Three Sheet tabs

| Tab | Purpose | Edited by |
|---|---|---|
| `feed_sources` | Curated list of where to poll. Tagged by EXPERTISE / SKILL / geography / language. | Admin (one-time setup, occasional adds) |
| `opportunities` | Items pulled from feeds + member submissions. Admin reviews weekly, sets `status`. | Script (writes), admin (reviews) |
| `subscribers` | Email list with per-subscriber interest tags (for future personalisation). | Admin + signup form |

## Setup steps

1. **Create the Google Sheet** in the CCC workspace
2. **Import the three CSVs** in this directory as the three tabs (File → Import → Replace current sheet for each)
3. **Apps Script**: Extensions → Apps Script → paste `apps-script.gs`
4. **Script Properties** (Project Settings → Script Properties):
   - `SHEET_ID` — the Sheet's ID from its URL
   - `FROM_NAME` — `CCC Newsletter` (or whatever you want shown as sender name)
   - `REPLY_TO` — admin email for replies / unsubscribe requests
5. **Triggers** (Triggers → Add Trigger):
   - `pollFeeds`: time-driven, day timer, 06:00–07:00
   - `sendDigest`: time-driven, week timer, **Monday**, 17:00–18:00
6. **Member submission form** (optional but recommended): create a Google Form linked to a sheet tab; admin promotes accepted submissions into `opportunities`
7. **Subscribe page**: simplest version is a Google Form that appends to `subscribers` with `active=yes`

## Admin's Monday routine (5–15 min)

1. Open the Sheet → `opportunities` tab
2. Filter `status = pending`
3. For each row:
   - Skim title + URL
   - Set `status` to `approved` or `rejected`
   - For approved: fill `deadline` if not auto-detected, polish `summary` if needed
4. (No manual send needed — `sendDigest` runs at 17:00)

## What gets polled automatically

The `pollFeeds` script polls rows in `feed_sources` where:
- `enabled = yes`, AND
- `type` is `RSS Feed` or `Google Alert` (anything with a parseable feed URL)

Other types (`INGO Careers`, `Funder Page`, `Email Alert`, `Member Submission`) require either:
- Manual review (admin scans the page weekly), OR
- An email forward rule routing alerts into a shared mailbox, where they're manually triaged

A future iteration could add lightweight scrapers for the top INGO career pages (UNICEF, Save the Children, IRC) that lack RSS.

## Schema reference

### feed_sources columns
- `name` — display name shown in opportunity attribution
- `type` — RSS Feed | Google Alert | Email Alert | INGO Careers | Funder Page | Sector Network | Aggregator | Manual Submission
- `url` — feed URL or page URL (blank for setup-needed rows)
- `expertise_tags` — semicolon-delimited subset of: EiE, ECD, ECE, ECDiE, SEL, MHPSS, PSS, TVET, Disability Inclusion, Gender (matches `EXPERTISE_TAGS` in the directory's `app.js`)
- `skill_tags` — semicolon-delimited subset of: Research, M&E, MEL, MEAL, Curriculum Development, Teacher Professional Development, Facilitation, Evaluation, Policy, Play-based Learning, Strategic Planning, Training (matches `SKILL_TAGS`)
- `geography` — Global, Sub-Saharan Africa, MENA, Asia-Pacific, Latin America, Europe, etc.
- `language` — English, French, Spanish, Arabic, Portuguese, multi
- `enabled` — yes/no
- `frequency` — daily / weekly / monthly / continuous (informational, doesn't control polling)
- `notes` — anything else: setup instructions, known issues, verification status

### opportunities columns
- `id` — UUID, auto-generated
- `date_added` — auto
- `source_name` — which feed_sources row this came from
- `title` — opportunity title
- `organization` — issuing org if available
- `opportunity_type` — RFP | Consultancy | Grant | Call for Proposals | EOI | Other
- `url` — link to the opportunity
- `expertise_tags`, `skill_tags`, `geography`, `language` — inherited from source row
- `deadline` — admin fills during review
- `summary` — short description (auto-extracted, admin can edit)
- `status` — pending | approved | rejected | sent
- `reviewed_by` — admin email
- `date_sent`
- `notes`

### subscribers columns
- `email`
- `name`
- `joined_date`
- `active` — yes/no (set to no for unsubscribes)
- `expertise_interests`, `skill_interests`, `language_pref` — for future per-subscriber filtering
- `last_sent` — date of last digest sent
- `unsubscribe_token` — random token for one-click unsubscribe links
- `notes`

## Known issues / verification needed

Several feed_sources rows have `VERIFY` or `SETUP` notes. Highest priorities before first poll:
- **TED EU** — URL marked `no` / disabled, needs rebuild from current TED UI (CPV 80000000)
- **Google Alerts** — admin needs to create each alert at google.com/alerts with RSS delivery, paste feed URL into the row
- **UNGM, SAM.gov, USAID Business Forecast, FCDO, GIZ, AFD, NORAD, Sida** — email-alert sources; admin sets up the saved searches once and routes emails to a shared inbox
- **Funder pages (LEGO, Porticus, BHP, Jacobs, etc.)** — `monthly` cadence, admin scans manually; future work could add scrapers

## Future enhancements (not v1)

- Per-subscriber personalisation: filter digest content by each subscriber's `expertise_interests` so EiE specialists don't get ECD-only items
- Integration with the directory app: add an "Opportunities" tab in the CCC directory, fed by the same Sheet, so members can browse / search past opportunities
- Scrapers for top INGO career pages that lack RSS (UNICEF, Save the Children, IRC, Plan, NRC)
- Submission form auto-triage: NLP classifier suggests `expertise_tags` and `skill_tags` based on title + description
- Deadline-based re-surfacing: re-send opportunities approaching deadline that didn't get traction
