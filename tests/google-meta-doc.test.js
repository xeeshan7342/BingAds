'use strict';
// A Google Search + Meta agency doc, laid out like a real client doc (Vida Health Spa) with made-up content.
// Microsoft Advertising reads the Google Search part, since the doc has no separate Microsoft section.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { E, parseHTML, parseText, settings, summary, byName } = require('./helpers');

const m = parseHTML(fs.readFileSync(path.join(__dirname, 'fixtures', 'google-meta-doc.html'), 'utf8'), 'Lumen_Wellness.docx');

test('campaigns, daily budgets from the doc\'s own Daily Budget column, and ad group assignment', () => {
  assert.deepEqual(m.campaigns.map(c => [c.name, c.budget]), [['Weight Loss & Wellness', 13.16], ['Aesthetics', 8.22]]);
  assert.deepEqual(summary(m).map(g => [g.name, g.campaign]), [
    ['Medical Weight Loss', 'Weight Loss & Wellness'], ['Hormone Therapy', 'Weight Loss & Wellness'],
    ['Injectables', 'Aesthetics'], ['Laser Treatments', 'Aesthetics']]);
  const g = byName(m, 'Medical Weight Loss');
  assert.equal(g.keywords.length, 4);
  assert.deepEqual(g.headlines, ['Medical Weight Loss Clinic', 'Physician Supervised Plans', 'Naperville, IL Location', 'Book A Free Consultation']);
  assert.equal(g.descriptions.length, 2);
  assert.equal(m.accountNegatives.length, 15);
});

test('bidding starts on the strategy the doc starts on; the later switch and the CPC ceiling become notes', () => {
  assert.equal(m.detected.bidStrategy, 'maxclicks');
  assert.ok(m.notes.some(n => /starts on Maximize clicks.*later move to Maximize conversions/.test(n.msg)));
  assert.ok(m.notes.some(n => /CPC limit for Maximize clicks without an amount/.test(n.msg)));
  assert.equal(m.detected.bidCap, undefined);
});

test('a CPC cap with an amount becomes the Max CPC limit', () => {
  assert.equal(parseText('Bidding: Maximize clicks with a $4.50 CPC cap').detected.bidCap, 4.5);
  assert.equal(parseText('Bidding: Maximize conversions, max CPC limit of 6').detected.bidCap, 6);
  assert.equal(parseText('Bidding: Target CPA $40 with a CPC cap of $5').detected.targetCpa, 40);
  assert.equal(parseText('Bidding: Target CPA $40 with a CPC cap of $5').detected.bidCap, 5);
});

test('settings: network, languages with a full stop, the town list in Illinois, match type per ad group', () => {
  assert.equal(m.detected.networks, false);
  assert.deepEqual(m.detected.languages, ['en']);
  assert.equal(m.detected.locations.length, 11);
  assert.ok(m.detected.locations.every(l => /, Illinois, United States$/.test(l.name)));
  assert.equal(m.detected.matchType, 'phrase+exact');
  assert.ok(m.adGroups.every(g => g.matchType === null), 'the same match type under every ad group becomes the account default');
});

test('the Meta section is skipped as one unit: no Meta text in Google ads and no Meta budgets', () => {
  const allCopy = m.adGroups.flatMap(g => g.headlines.concat(g.descriptions));
  assert.ok(!allCopy.includes('Lose Weight With Medical Support'));
  assert.ok(!allCopy.some(t => /Struggling to lose weight/.test(t)));
  assert.equal(m.campaigns.length, 2);
  assert.ok(!m.campaigns.some(c => c.budget === 19.74 || c.budget === 4.93));
  assert.ok(m.notes.some(n => /Skipped the "2\. Meta Ads Campaign & Targeting" section/.test(n.msg)));
  assert.equal(m.skipped.filter(s => s.kind === 'platform').length, 1);
  assert.ok(!m.skipped.some(s => /Audience Focus/.test(s.text)), 'lines inside the skipped section are not listed one by one');
});

test('landing page descriptions and notes are reported clearly', () => {
  assert.equal(m.skipped.filter(s => s.kind === 'lp').length, 4);
  assert.equal(m.skipped.filter(s => s.kind === 'note').length, 1);
  assert.ok(m.skipped.some(s => /the "Devices" line/.test(s.reason)));
});

test('the export is valid once a final URL is added, and flags the thin ads once', () => {
  const S = settings({ finalUrl: 'https://www.example.com/', matchType: 'phrase+exact', bidStrategy: 'maxclicks', locations: m.detected.locations });
  const v = E.validate(m, S, '2026-10-06');
  assert.deepEqual(v.errors, []);
  assert.equal(v.warnings.filter(w => /fewer than 8 headlines or 4 descriptions/.test(w.msg)).length, 1);
  const t = E.exportRows(m, S);
  const types = t.rows.filter((r, i) => t.kinds[i] === 'keyword').map(r => r[t.headers.indexOf('Match Type')]);
  assert.equal(types.length, 13 * 2, 'phrase and exact rows for every keyword');
  assert.deepEqual([...new Set(types)].sort(), ['Exact', 'Phrase']);
});

test('numbered campaign headings work without a campaign table', () => {
  const doc = parseHTML('<h2>1.3 Campaign 1: Weight Loss</h2><h3>Medical Weight Loss</h3><p><strong>Keywords:</strong></p><ul><li>medical weight loss</li></ul>'
    + '<h3>Hormone Therapy</h3><p><strong>Keywords:</strong></p><ul><li>trt clinic</li></ul>'
    + '<h2>1.4 Campaign 2: Aesthetics</h2><h3>Injectables</h3><p><strong>Keywords:</strong></p><ul><li>botox near me</li></ul>');
  assert.deepEqual(summary(doc).map(g => [g.name, g.campaign]), [['Medical Weight Loss', 'Weight Loss'], ['Hormone Therapy', 'Weight Loss'], ['Injectables', 'Aesthetics']]);
});

test('different match types per ad group are kept per ad group in the export', () => {
  const doc = parseText('Ad Group 1: Brand\nMatch type: Exact\nKeywords\n- lumen clinic\nAd Group 2: Generic\nMatch type: Broad\nKeywords\n- weight loss clinic');
  assert.deepEqual(doc.adGroups.map(g => g.matchType), ['exact', 'broad']);
  const t = E.exportRows(doc, settings({ matchType: 'phrase' }));
  const rows = t.rows.filter((r, i) => t.kinds[i] === 'keyword').map(r => r[t.headers.indexOf('Keyword')] + ':' + r[t.headers.indexOf('Match Type')]);
  assert.deepEqual(rows, ['lumen clinic:Exact', 'weight loss clinic:Broad']);
});

test('a heading about a platform that holds keyword lists is still Search content', () => {
  const doc = parseHTML('<h2>Instagram Marketing Services</h2><p><strong>Keywords:</strong></p><ul><li>instagram marketing agency</li></ul><p><strong>Headlines:</strong></p><ul><li>Instagram Growth Experts</li></ul>'
    + '<h2>Facebook Ads Plan</h2><p><strong>Headlines:</strong></p><ul><li>Should Not Import</li></ul>');
  assert.deepEqual(summary(doc).map(g => [g.name, g.headlines]), [['Instagram Marketing Services', ['Instagram Growth Experts']]]);
});

test('bid strategy wording', () => {
  const bid = line => E.matchSetting('Bidding: ' + line);
  assert.equal(bid('Maximize conversions with a target CPA of $45').v, 'tcpa');
  assert.equal(bid('Maximize conversions with a target CPA of $45').targetCpa, 45);
  assert.equal(bid('Target CPA $60, starting on Maximize Clicks for 2 weeks').v, 'maxclicks');
  assert.equal(bid('Launch with Manual CPC, then switch to Maximize Conversions').v, 'ecpc');
  assert.equal(bid('Launch with Manual CPC, then switch to Maximize Conversions').manual, true);
  assert.equal(bid('Launch with Manual CPC, then switch to Maximize Conversions').later, 'maxconv');
  assert.equal(bid('Enhanced CPC').v, 'ecpc');
  assert.equal(bid('Enhanced CPC').manual, false);
  assert.equal(bid('Maximize clicks').later, null);
});

test('manual CPC in a doc runs as Enhanced CPC, with one note', () => {
  const doc = parseText('Bidding: Manual CPC\nCampaign 1: A\nBidding: Manual CPC bids\nAd Group 1: X\nKeywords\n- x');
  assert.equal(doc.detected.bidStrategy, 'ecpc');
  assert.equal(doc.notes.filter(n => /do not offer manual CPC/.test(n.msg)).length, 1);
});

test('a doc with its own Microsoft Ads section uses it and skips the Google Ads version', () => {
  const doc = parseText([
    '# Acme Search Plan',
    '## Google Ads',
    '### Ad Group 1: Google Only',
    'Keywords',
    '- google only keyword',
    '## Microsoft Ads (Bing)',
    '### Ad Group 1: Bing Brand',
    'Keywords',
    '- acme brand',
    '## Meta Ads',
    'Headlines',
    '- Not For Search'
  ].join('\n'));
  assert.deepEqual(doc.adGroups.map(g => g.name), ['Bing Brand']);
  assert.ok(doc.notes.some(n => /Skipped the "Google Ads" section .*its own Microsoft Advertising section/.test(n.msg)));
  assert.ok(doc.notes.some(n => /Skipped the "Meta Ads" section/.test(n.msg)));
});

test('a Google Ads title over a Microsoft section is not skipped; Microsoft Shopping is', () => {
  const doc = parseText([
    '# Google Ads and Bing Plan for Acme',
    '## Microsoft Advertising Search',
    'Ad Group 1: Brand',
    'Keywords',
    '- acme brand',
    '## Microsoft Shopping campaigns',
    'Headlines',
    '- Not Search'
  ].join('\n'));
  assert.deepEqual(doc.adGroups.map(g => g.name), ['Brand']);
  assert.ok(doc.notes.some(n => /Skipped the "Microsoft Shopping campaigns" section .*Shopping campaigns are not part of this Search import/.test(n.msg)));
  const g = parseText('# Google Ads Campaign Plan\n## Microsoft Ads\nAd Group 1: Brand\nKeywords\n- acme brand');
  assert.deepEqual(g.adGroups.map(x => x.name), ['Brand']);
});

test('a table with a Platform column keeps the Microsoft rows when it has any, and the Google rows otherwise', () => {
  const both = parseText('| Platform | Ad Group | Keywords |\n|---|---|---|\n| Google Ads | Brand G | acme google |\n| Microsoft Ads | Brand M | acme bing |\n| Meta | Social | not search |');
  assert.deepEqual(both.adGroups.map(g => g.name), ['Brand M']);
  const google = parseText('| Platform | Ad Group | Keywords |\n|---|---|---|\n| Google Search | Brand G | acme google |\n| Meta | Social | not search |');
  assert.deepEqual(google.adGroups.map(g => g.name), ['Brand G']);
});

test('a passing mention of Bing does not make the Google Ads sections the other platform', () => {
  const doc = parseText([
    '# Acme Plan',
    '## Google Ads Campaigns',
    'Ad Group 1: Brand',
    'Keywords',
    '- acme brand',
    '## Next steps',
    'Microsoft Ads rollout in Q2',
    '**Bing Ads**',
    'Mirror the Google campaigns after launch'
  ].join('\n'));
  assert.deepEqual(doc.adGroups.map(g => g.name), ['Brand']);
  assert.ok(!doc.notes.some(n => /Google Ads/.test(n.msg)));
});

test('bold-line docs: a bold Microsoft heading over bold labels counts as a Microsoft section', () => {
  const doc = parseText([
    '**Google Ads**',
    '**Ad Group 1: Google Brand**',
    '**Keywords:**',
    '- google brand kw',
    '**Microsoft Ads**',
    '**Ad Group 1: Bing Brand**',
    '**Keywords:**',
    '- bing brand kw'
  ].join('\n'));
  assert.deepEqual(doc.adGroups.map(g => g.name), ['Bing Brand']);
});
