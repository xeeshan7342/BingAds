'use strict';
// A multi-tab planning workbook laid out like a real agency file: a dashboard of figures, a settings tab holding several
// tables under title rows, a structure tab, keywords, one ad per ad group shared by two campaigns, negatives, assets and
// a checklist. All content is made up.
const test = require('node:test');
const assert = require('node:assert/strict');
const { E, settings } = require('./helpers');

const W = 'NW | Clinic | Search | North', S2 = 'NW | Clinic | Search | South';
const URL1 = 'https://www.example.com/lp-dental-implants', URL2 = 'https://www.example.com/lp-braces';
const book = [
  ['Dashboard', [
    ['', 'Northwind Dental  |  Microsoft Ads  |  Implants and Braces'],
    ['', 'Search campaigns for patients in two regions looking for dental care abroad. Every ad names Northwind Dental as the clinic.'],
    ['', 'DAILY BUDGET (USD)', '', 'MONTHLY APPROX (USD)', '', 'CAMPAIGNS', '', 'AD GROUPS', '', 'KEYWORDS', '', 'LAUNCH ITEMS DONE'],
    ['', '200', '', '6080', '', '2', '', '2', '', '8', '', '0 of 5'],
    ['', 'Both campaigns', '', 'Daily x 30.4', '', 'North | South', '', 'Same in both campaigns', '', 'Phrase and exact, all campaigns', '', 'See checklist'],
    ['', 'Structure map'],
    ['', 'Keywords per ad group (each campaign)', '', '', '', '', '', 'Negative keywords by reason']
  ]],
  ['Budget & Settings', [
    ['', 'Budget and campaign settings'],
    ['', 'Yellow cells with blue text are inputs. Everything else calculates from them.'],
    ['', 'Budget'],
    ['', 'Total daily budget (USD)', '200', 'Assumption: same as last year. Change to your budget.'],
    ['', 'Campaign', 'Locations', 'Budget share', 'Daily budget (USD)', 'Monthly approx (USD)', 'Starting max CPC (USD)', 'Bid strategy'],
    ['', W, 'Canada, United States. Add Mexico if the location picker offers it.', '0.5', '100', '3040', '2.5', 'Manual CPC at launch. Switch to Maximize conversions after 15+ conversions in 30 days.'],
    ['', S2, 'Brazil, Argentina, Chile', '0.5', '100', '3040', '2.5', 'Manual CPC at launch. Switch to Maximize conversions after 15+ conversions in 30 days.'],
    ['', 'Total', '', '1', '200', '6080'],
    ['', 'There is no history for these regions, so bids start at 2.50. Raise them if ads show on fewer than half of eligible searches. The budget is split evenly until one region proves it converts better.'],
    ['', 'Campaign settings (both campaigns)'],
    ['', 'Setting', '', 'Value', '', '', '', '', 'Why'],
    ['', 'Campaign type', '', 'Search'],
    ['', 'Networks', '', 'Microsoft sites and select traffic only. Syndicated search partners off at launch.', '', '', '', '', 'Keeps the budget on search results.'],
    ['', 'Locations', '', 'Per campaign above. Add each country individually.', '', '', '', '', 'Lets you compare countries.'],
    ['', 'Location option', '', 'People in your targeted locations', '', '', '', '', 'Stops ads showing to people who only search about those countries.'],
    ['', 'Excluded at launch', '', 'Peru, Bolivia. Add them as excluded locations so they cannot receive ads.'],
    ['', 'Language', '', 'English'],
    ['', 'Devices', '', 'All devices, no bid adjustments at launch'],
    ['', 'Ad rotation', '', 'Optimize for clicks'],
    ['', 'Auto-tagging', '', 'On (MSCLKID)'],
    ['', 'Final URL suffix', '', 'utm_source=bing&utm_medium=cpc&utm_campaign={CampaignId}'],
    ['', 'Conversion tracking', '', 'UET tag through GTM. Primary: enquiry form.']
  ]],
  ['Structure', [
    ['', 'Ad group structure'],
    ['', 'Every ad group runs in both campaigns with the same keywords and ad. Counts are per campaign.'],
    ['', '#', 'Ad group', 'Theme', 'Final URL', 'Path 1', 'Path 2', 'Phrase', 'Exact', 'Total'],
    ['', '1', 'Dental Implants', 'Implant treatment and cost searches', URL1, 'dental', 'implants', '1', '1', '2'],
    ['', '2', 'Braces', 'Orthodontic searches', URL2, 'dental', 'braces', '1', '1', '2'],
    ['', '', 'Total per campaign', '', '', '', '', '2', '2', '4']
  ]],
  ['Keywords', [
    ['', 'Keywords'],
    ['', 'Plain text keywords. Match type in its own column. Ready to paste into Microsoft Ads Editor.'],
    ['', 'Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Final URL'],
    ...[W, S2].flatMap(c => [
      ['', c, 'Dental Implants', 'dental implants abroad', 'Phrase', URL1],
      ['', c, 'Dental Implants', 'dental implants abroad', 'Exact', URL1],
      ['', c, 'Braces', 'braces cost abroad', 'Phrase', URL2],
      ['', c, 'Braces', 'braces cost abroad', 'Exact', URL2]
    ])
  ]],
  ['Ads', [
    ['', 'Responsive search ads'],
    ['', 'One ad per ad group, used in both campaigns. Pinned items keep the clinic name in every ad.'],
    ['', 'Ad Group', 'Asset', 'Text', 'Characters', 'Limit', 'Use of limit', 'Check', 'Pin'],
    ...[['Dental Implants', URL1, 'Dental Implants Abroad'], ['Braces', URL2, 'Braces Abroad']].flatMap(([ag, url, h3]) => [
      ['', ag, '', url],
      ['', '', 'Path 1', 'dental', '6', '15', '0.4', '✓ OK'],
      ['', '', 'Headline 1', 'Northwind Dental Clinic', '23', '30', '0.77', '✓ OK', 'Position 1'],
      ['', '', 'Headline 2', 'Northwind: Care Abroad', '21', '30', '0.7', '✓ OK', 'Position 1'],
      ['', '', 'Headline 3', h3, '22', '30', '0.73', '✓ OK'],
      ['', '', 'Headline 4', 'Free Treatment Estimate', '23', '30', '0.77', '✓ OK'],
      ['', '', 'Description 1', 'Northwind Dental is the treating clinic. Plans are made by our own dentists.', '76', '90', '0.84', '✓ OK', 'Position 1'],
      ['', '', 'Description 2', 'Share your x-rays and get a free treatment estimate within two working days.', '77', '90', '0.86', '✓ OK']
    ])
  ]],
  ['Negatives', [
    ['', 'Negative keywords'],
    ['', 'Create one shared list and apply it to both campaigns.'],
    ['', 'Negative keyword', 'Match Type', 'Reason', '', 'Reason', 'Count'],
    ['', 'jobs', 'Phrase', 'Jobs and education', '', 'Jobs and education', '2'],
    ['', 'course', 'Phrase', 'Jobs and education', '', 'Not travelling', '1'],
    ['', 'near me', 'Phrase', 'Not travelling']
  ]],
  ['Assets', [
    ['', 'Ad assets (extensions)'],
    ['', 'Account-level assets for both campaigns.'],
    ['', 'Sitelinks'],
    ['', 'Sitelink text (25)', 'Description 1 (35)', 'Final URL'],
    ['', 'Get a Free Estimate', 'Share x-rays, get a quote', 'https://www.example.com/quote'],
    ['', 'Callouts'],
    ['', 'Callout text (25)', 'Characters', 'Check'],
    ['', 'Free Estimates', '14', '✓ OK']
  ]],
  ['Launch Checklist', [
    ['', 'Launch checklist and ad rules'],
    ['', 'Set each item to Done before launch.'],
    ['', '#', 'Item', 'Why', 'Status'],
    ['', '1', 'UET tag is live.', 'Without lead data bidding cannot work.', 'To do']
  ]]
];
const blocks = book.flatMap(([name, rows]) => E.rowsToBlocks(rows, name));
const m = E.parseBlocksToModel(blocks, 'Northwind.xlsx');
const msgs = (list, rx) => list.filter(x => rx.test(x.msg));

test('a tab splits into title rows, notes and separate tables, without its empty first column', () => {
  const bs = E.rowsToBlocks(book[1][1], 'Budget & Settings');
  assert.deepEqual(bs.map(b => b.t + (b.note ? ':note' : '')), ['h', 'h', 'p:note', 'h', 'table', 'table', 'p:note', 'h', 'table']);
  assert.equal(bs[1].text, 'Budget and campaign settings');
  assert.deepEqual(bs[5].rows[0], ['Campaign', 'Locations', 'Budget share', 'Daily budget (USD)', 'Monthly approx (USD)', 'Starting max CPC (USD)', 'Bid strategy']);
  assert.deepEqual(bs[8].rows[0], ['Setting', 'Value', 'Why']);
  // a one-column list stays one table, and "Campaign: X | ..." stays with its table
  assert.deepEqual(E.rowsToBlocks([['Keywords'], ['a'], ['b']], 'Kw').map(b => b.t), ['h', 'table']);
  assert.deepEqual(E.rowsToBlocks([['Campaign: Installs | phrase'], ['New Boiler', 'Finance'], ['a', 'b']], 'Kw').map(b => b.t), ['h', 'table']);
});

test('the dashboard\'s figures make no campaign, and the settings tab gives budgets, places, bidding and settings', () => {
  assert.deepEqual(m.campaigns.map(c => [c.name, c.budget, c.locations.map(l => l.name)]), [
    [W, 100, ['Canada', 'United States']], [S2, 100, ['Brazil', 'Argentina', 'Chile']]]);
  assert.equal(m.detected.bidStrategy, 'ecpc');
  assert.equal(m.detected.maxCpc, 2.5);
  assert.equal(m.detected.presenceOnly, true);
  assert.equal(m.detected.networks, false);
  assert.deepEqual(m.detected.languages, ['en']);
  assert.deepEqual(m.detected.excludedLocations.map(l => l.name), ['Peru', 'Bolivia']);
  assert.equal(m.detected.finalUrlSuffix, 'utm_source=bing&utm_medium=cpc&utm_campaign={CampaignId}');
  assert.equal(m.detected.adRotation, 'OptimizeForClicks');
  assert.ok(m.notes.some(n => /Not used from the locations: "Add Mexico if the location picker offers it\."/.test(n.msg)));
  assert.ok(m.notes.some(n => /later move to Maximize conversions/.test(n.msg)));
  assert.ok(!m.notes.some(n => /settings for "/.test(n.msg)), 'no ad group names from the dashboard or a Total row');
  assert.ok(m.skipped.some(s => /summary figures/.test(s.reason)));
  assert.ok(m.skipped.some(s => s.text === 'Auto-tagging: On (MSCLKID)' && s.kind === 'other'));
});

test('one ad per ad group serves both campaigns, with its URL, paths and pins', () => {
  assert.equal(m.adGroups.length, 4);
  m.adGroups.forEach(g => {
    assert.equal(g.headlines.length, 4);
    assert.equal(g.descriptions.length, 2);
    assert.equal(g.keywords.length, 2);
    assert.equal(g.path1, 'dental');
    assert.deepEqual(g.pins, { 'h|northwind dental clinic': 1, 'h|northwind: care abroad': 1, 'd|northwind dental is the treating clinic. plans are made by our own dentists.': 1 });
  });
  assert.deepEqual(m.adGroups.map(g => [g.name, g.finalUrl, g.path2]), [
    ['Dental Implants', URL1, 'implants'], ['Braces', URL2, 'braces'], ['Dental Implants', URL1, 'implants'], ['Braces', URL2, 'braces']]);
  assert.ok(m.notes.some(n => n.msg === S2 + ': 2 ad groups have no ad of their own in the doc, so they use the ads of the same ad groups in ' + W + '.'));
  assert.ok(!m.skipped.some(s => /table cell without a label/.test(s.reason)), 'the ad group rows give the final URL');
  assert.deepEqual(m.accountNegatives.map(E.kwToLine), ['"jobs"', '"course"', '"near me"']);
});

test('the workbook exports with pins, exclusions, the URL suffix and ad rotation, and no duplicate warnings across regions', () => {
  const ids = { [E.locKey('Brazil')]: '11', [E.locKey('Argentina')]: '12', [E.locKey('Chile')]: '13', [E.locKey('Peru')]: '21' };
  const S = settings({ bidStrategy: 'ecpc', maxCpc: '2.5', locations: [], excludedLocations: m.detected.excludedLocations, finalUrlSuffix: m.detected.finalUrlSuffix, adRotation: 'OptimizeForClicks', locIds: ids });
  const v = E.validate(m, S, '2026-10-06');
  assert.deepEqual(v.errors, []);
  assert.equal(msgs(v.warnings, /compete for the same searches/).length, 0);
  assert.equal(msgs(v.warnings, /no Microsoft location ID/).length, 0, 'Bolivia comes from the shipped table, Peru from a typed ID');
  const t = E.exportRows(m, S);
  const rows = t.rows.map((r, i) => Object.fromEntries(t.headers.map((h, j) => [h, r[j]]).concat([['kind', t.kinds[i]]])));
  const north = rows.filter(r => r.Campaign === W), south = rows.filter(r => r.Campaign === S2);
  assert.deepEqual(north.filter(r => r.Type === 'Campaign Location Criterion').map(r => r.Target), ['32', '190']);
  assert.deepEqual(south.filter(r => r.Type === 'Campaign Location Criterion').map(r => r.Target), ['11', '12', '13']);
  assert.deepEqual(south.filter(r => r.Type === 'Campaign Negative Location Criterion').map(r => r.Target), ['21', '17']);
  assert.equal(rows.find(r => r.Type === 'Campaign')['Final Url Suffix'], 'utm_source=bing&utm_medium=cpc&utm_campaign={CampaignId}');
  assert.equal(rows.find(r => r.Type === 'Ad Group')['Ad Rotation'], 'OptimizeForClicks');
  const ad = JSON.parse(south.find(r => r.Type === 'Responsive Search Ad').Headline);
  assert.deepEqual(ad.slice(0, 3), [{ text: 'Northwind Dental Clinic', pinnedField: 'Headline1' }, { text: 'Northwind: Care Abroad', pinnedField: 'Headline1' }, { text: 'Dental Implants Abroad' }]);
  assert.equal(JSON.parse(south.find(r => r.Type === 'Responsive Search Ad').Description)[0].pinnedField, 'Description1');
  assert.deepEqual(E.missingLocations(m, S), []);
  // an excluded place Microsoft's list does not have is listed to exclude by hand
  const S3 = Object.assign({}, S, { excludedLocations: [{ name: 'Sharjah, United Arab Emirates', id: '' }] });
  assert.equal(msgs(E.validate(m, S3, '2026-10-06').warnings, /Excluded place "Sharjah, United Arab Emirates" has no Microsoft location ID/).length, 1);
  assert.deepEqual(E.missingLocations(m, S3).map(x => x.excluded), [['Sharjah, United Arab Emirates'], ['Sharjah, United Arab Emirates']]);
});

test('the same keyword still warns inside one campaign, or across campaigns that reach the same places', () => {
  const same = settings({ locations: [{ name: 'United States', id: '2840' }] });
  assert.ok(msgs(E.validate(m, same, '2026-10-06').warnings, /"dental implants abroad" is in Dental Implants \(NW \| Clinic \| Search \| North\) and Dental Implants \(NW \| Clinic \| Search \| South\)/).length === 0,
    'campaign locations from the doc still differ');
  const twin = JSON.parse(JSON.stringify(m));
  twin.campaigns.forEach(c => { c.locations = null; });
  // one warning per ad group and match type (phrase and exact)
  assert.equal(msgs(E.validate(twin, same, '2026-10-06').warnings, /"dental implants abroad" is in Dental Implants \(NW \| Clinic \| Search \| North\) and Dental Implants \(NW \| Clinic \| Search \| South\)/).length, 4);
});

test('pins: written in a list, read from a Pin column, and checked so every position can be filled', () => {
  assert.equal(E.pinPosition('Position 1'), 1);
  assert.equal(E.pinPosition('Pinned to position 3'), 3);
  assert.equal(E.pinPosition('H2'), 2);
  assert.equal(E.pinPosition('yes'), null);
  assert.equal(E.inlinePin('Northwind Dental (pinned to position 1)'), 1);
  assert.equal(E.inlinePin('Northwind Dental [P2]'), 2);
  const doc = E.parseText('Ad Group 1: A\nKeywords\n- a b\nHeadlines\n- Northwind Dental (Pin 1)\n- Fast Estimates\n- Book Online\nDescriptions\n- One two three four five six. (pinned to position 2)\n- Seven eight nine ten eleven twelve.');
  const g = doc.adGroups[0];
  assert.deepEqual(g.headlines, ['Northwind Dental', 'Fast Estimates', 'Book Online']);
  assert.deepEqual(g.pins, { 'h|northwind dental': 1, 'd|one two three four five six.': 2 });
  // all three headlines pinned to 1: nothing can show in positions 2 and 3
  g.pins = { 'h|northwind dental': 1, 'h|fast estimates': 1, 'h|book online': 1 };
  const v = E.validate(doc, settings(), '2026-10-06');
  assert.equal(msgs(v.errors, /no headline can show in position [23]/).length, 2);
});

test('settings rows: presence wording, exclusions inside a locations value, suffix rules, campaign type', () => {
  assert.equal(E.settingFrom('Location option', 'People in your targeted locations').v, true);
  assert.equal(E.settingFrom('Location option', 'People in, or who show interest in, your targeted locations').v, false);
  assert.deepEqual(E.settingFrom('Locations', 'UAE, excluding Sharjah').excluded.map(l => l.name), ['Sharjah, United Arab Emirates']);
  assert.equal(E.settingFrom('Final URL suffix', '?src=bing&kw={keyword}').v, 'src=bing&kw={keyword}');
  assert.equal(E.settingFrom('Final URL suffix', 'not a suffix'), null);
  const v = E.validate(E.parseText('Ad Group 1: A\nKeywords\n- a b'), settings({ finalUrlSuffix: '{lpurl}?x=1' }), '2026-10-06');
  assert.equal(msgs(v.errors, /cannot use \{lpurl\}/).length, 1);
  const display = E.parseText('Campaign type: Display\nAd Group 1: A\nKeywords\n- a b');
  assert.ok(display.notes.some(n => /builds Search campaigns only/.test(n.msg)));
});
