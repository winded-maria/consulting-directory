/**
 * CCC Newsletter — Google Apps Script
 *
 * Three triggers wire the pipeline:
 *   1. pollFeeds()      — daily at 06:00, fetches RSS feeds listed in feed_sources tab,
 *                         appends new items to opportunities tab with status="pending"
 *   2. (manual review)  — admin opens the sheet Monday, sets status to "approved" or
 *                         "rejected" on pending rows
 *   3. sendDigest()     — Monday 17:00, reads opportunities where status="approved" and
 *                         date_sent is empty, formats digest email, sends to all active
 *                         rows in subscribers tab, marks each opportunity as "sent"
 *
 * Setup:
 *   1. Open the Sheet → Extensions → Apps Script
 *   2. Paste this file
 *   3. Set Script Properties: SHEET_ID, FROM_NAME, REPLY_TO
 *   4. Triggers → Add Trigger:
 *        - pollFeeds: time-based, daily, 06:00
 *        - sendDigest: time-based, weekly, Monday, 17:00
 */

const SS = SpreadsheetApp.getActive();
const FEED_SOURCES = SS.getSheetByName('feed_sources');
const OPPORTUNITIES = SS.getSheetByName('opportunities');
const SUBSCRIBERS = SS.getSheetByName('subscribers');

function pollFeeds() {
  const rows = FEED_SOURCES.getDataRange().getValues();
  const headers = rows.shift();
  const col = i => headers.indexOf(i);

  const existingUrls = new Set(
    OPPORTUNITIES.getRange('G2:G' + OPPORTUNITIES.getLastRow()).getValues().flat()
  );

  const newItems = [];
  rows.forEach(row => {
    if (row[col('enabled')] !== 'yes') return;
    if (row[col('type')] !== 'RSS Feed' && row[col('type')] !== 'Google Alert') return;
    const url = row[col('url')];
    if (!url) return;

    try {
      const xml = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();
      const items = parseFeed(xml);
      items.forEach(item => {
        if (existingUrls.has(item.link)) return;
        newItems.push([
          Utilities.getUuid(),                    // id
          new Date(),                             // date_added
          row[col('name')],                       // source_name
          item.title,                             // title
          item.creator || '',                     // organization
          inferType(item.title),                  // opportunity_type
          item.link,                              // url
          row[col('expertise_tags')],             // expertise_tags
          row[col('skill_tags')],                 // skill_tags
          row[col('geography')],                  // geography
          row[col('language')],                   // language
          '',                                     // deadline (admin fills)
          truncate(item.description, 300),        // summary
          'pending',                              // status
          '',                                     // reviewed_by
          '',                                     // date_sent
          ''                                      // notes
        ]);
      });
    } catch (e) {
      Logger.log('Feed error: ' + row[col('name')] + ' — ' + e.message);
    }
  });

  if (newItems.length) {
    OPPORTUNITIES.getRange(OPPORTUNITIES.getLastRow() + 1, 1, newItems.length, newItems[0].length)
      .setValues(newItems);
  }
}

function parseFeed(xml) {
  const doc = XmlService.parse(xml);
  const root = doc.getRootElement();
  const atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  // RSS 2.0
  let items = root.getChild('channel') ? root.getChild('channel').getChildren('item') : [];
  if (items.length) {
    return items.map(it => ({
      title: it.getChildText('title'),
      link: it.getChildText('link'),
      description: it.getChildText('description') || '',
      creator: it.getChildText('creator', XmlService.getNamespace('http://purl.org/dc/elements/1.1/')) || ''
    }));
  }
  // Atom
  items = root.getChildren('entry', atom);
  return items.map(it => ({
    title: it.getChildText('title', atom),
    link: (it.getChild('link', atom) && it.getChild('link', atom).getAttribute('href'))
            ? it.getChild('link', atom).getAttribute('href').getValue() : '',
    description: it.getChildText('summary', atom) || it.getChildText('content', atom) || '',
    creator: it.getChildText('author', atom) || ''
  }));
}

function inferType(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('rfp') || t.includes('request for proposal')) return 'RFP';
  if (t.includes('call for proposal')) return 'Call for Proposals';
  if (t.includes('eoi') || t.includes('expression of interest')) return 'EOI';
  if (t.includes('consultant') || t.includes('consultancy')) return 'Consultancy';
  if (t.includes('grant')) return 'Grant';
  return 'Other';
}

function truncate(s, n) {
  s = (s || '').replace(/<[^>]+>/g, '').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function sendDigest() {
  const props = PropertiesService.getScriptProperties();
  const fromName = props.getProperty('FROM_NAME') || 'CCC Newsletter';
  const replyTo  = props.getProperty('REPLY_TO')  || Session.getActiveUser().getEmail();

  const oppRows = OPPORTUNITIES.getDataRange().getValues();
  const oppHeaders = oppRows.shift();
  const oCol = i => oppHeaders.indexOf(i);
  const approved = oppRows.filter(r => r[oCol('status')] === 'approved' && !r[oCol('date_sent')]);
  if (!approved.length) {
    Logger.log('No approved opportunities to send.');
    return;
  }

  const subRows = SUBSCRIBERS.getDataRange().getValues();
  const subHeaders = subRows.shift();
  const sCol = i => subHeaders.indexOf(i);
  const recipients = subRows.filter(r => r[sCol('active')] === 'yes').map(r => r[sCol('email')]);
  if (!recipients.length) return;

  const body = renderDigest(approved, oppHeaders);
  const subject = `CCC Opportunities — ${Utilities.formatDate(new Date(), 'GMT', 'd MMM yyyy')}`;

  recipients.forEach(email => {
    GmailApp.sendEmail(email, subject, body.text, {
      name: fromName,
      replyTo: replyTo,
      htmlBody: body.html
    });
  });

  // Mark sent
  const today = new Date();
  approved.forEach(r => {
    const id = r[oCol('id')];
    const rowIdx = oppRows.findIndex(x => x[oCol('id')] === id) + 2; // +1 for 1-index, +1 for header
    OPPORTUNITIES.getRange(rowIdx, oCol('date_sent') + 1).setValue(today);
    OPPORTUNITIES.getRange(rowIdx, oCol('status') + 1).setValue('sent');
  });
}

function renderDigest(opps, headers) {
  const c = i => headers.indexOf(i);
  const grouped = {};
  opps.forEach(r => {
    (r[c('expertise_tags')] || 'Other').split(';').forEach(tag => {
      tag = tag.trim() || 'Other';
      grouped[tag] = grouped[tag] || [];
      grouped[tag].push(r);
    });
  });

  let html = `<h2>This week's opportunities</h2>`;
  let text = `This week's opportunities\n\n`;
  Object.keys(grouped).sort().forEach(tag => {
    html += `<h3>${tag}</h3><ul>`;
    text += `## ${tag}\n`;
    grouped[tag].forEach(r => {
      html += `<li><a href="${r[c('url')]}">${r[c('title')]}</a> — ${r[c('organization')]} (${r[c('geography')]}, deadline ${r[c('deadline')] || 'TBD'})<br><small>${r[c('summary')]}</small></li>`;
      text += `- ${r[c('title')]} — ${r[c('organization')]} (${r[c('geography')]}, deadline ${r[c('deadline')] || 'TBD'})\n  ${r[c('url')]}\n\n`;
    });
    html += `</ul>`;
  });

  html += `<p><small>You're receiving this because you subscribed via CCC. To unsubscribe, reply with "unsubscribe".</small></p>`;
  text += `\n---\nYou're receiving this because you subscribed via CCC. To unsubscribe, reply with "unsubscribe".`;
  return { html, text };
}
