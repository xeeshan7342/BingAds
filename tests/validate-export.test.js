'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { E, parseText, settings } = require('./helpers');

const TODAY = '2026-10-06';
const doc = extra => parseText([
  'Daily budget: 30',
  'Ad Group 1: IT Support',
  'Keywords',
  '- it support',
  '- free it support quote',
  'Headlines',
  '- IT Support Experts',
  '- Fast IT Help',
  '- Managed IT Services',
  'Descriptions',
  '- We fix IT problems fast for small businesses across the region.',
  '- Talk to a specialist about a managed IT plan for your business.'
].join('\n') + (extra ? '\n' + extra : ''));
const msgs = (list, rx) => list.filter(x => rx.test(x.msg));
// export rows as objects keyed by column name
const records = t => t.rows.map((r, i) => Object.assign({ kind: t.kinds[i] }, Object.fromEntries(t.headers.map((h, j) => [h, r[j]]))));

test('a clean doc has no errors', () => {
  const v = E.validate(doc(), settings(), TODAY);
  assert.deepEqual(v.errors, []);
});

test('a missing time zone is an error, since Microsoft needs one on every new campaign', () => {
  const v = E.validate(doc(), settings({ timeZone: '' }), TODAY);
  assert.equal(msgs(v.errors, /Pick the time zone/).length, 1);
  assert.equal(msgs(E.validate(doc(), settings({ timeZone: 'Pacific' }), TODAY).errors, /Pick the time zone/).length, 1);
});

test('negative keywords are validated like keywords', () => {
  const m = doc('Ad group negatives\n- jobs!\n- cheap?');
  m.accountNegatives = E.linesToKw('what is it?');
  const v = E.validate(m, settings(), TODAY);
  assert.equal(msgs(v.errors, /negative "jobs!" contains "!"/).length, 1);
  assert.equal(msgs(v.errors, /negative "cheap\?" contains "\?"/).length, 1);
  assert.equal(msgs(v.errors, /Negative keywords for every campaign: negative "what is it\?"/).length, 1);
});

test('keywords can be 100 characters, with no word limit', () => {
  const m = doc();
  m.adGroups[0].keywords.push({ text: 'managed it support for small accounting firms in the greater austin texas area with on site visits', match: null });
  assert.equal(E.validate(m, settings(), TODAY).errors.length, 0);
  m.adGroups[0].keywords.push({ text: 'x'.repeat(101), match: null });
  assert.equal(msgs(E.validate(m, settings(), TODAY).errors, /over 100 characters/).length, 1);
});

test('a negative that blocks one of your own keywords is flagged; broad negatives count as phrase', () => {
  const m = doc();
  m.accountNegatives = E.linesToKw('free');
  const v = E.validate(m, settings(), TODAY);
  assert.equal(msgs(v.warnings, /account negative "free" blocks the keyword "free it support quote"/).length, 1);
  assert.ok(E.negBlocks({ text: 'support quote', match: null }, 'free it support quote'));
  assert.ok(!E.negBlocks({ text: 'quote support', match: null }, 'free it support quote'));
  assert.ok(!E.negBlocks({ text: 'quote support', match: 'broad' }, 'free it support quote'));
  assert.ok(E.negBlocks({ text: 'support quote', match: 'broad' }, 'free it support quote'));
  assert.ok(!E.negBlocks({ text: 'support', match: 'exact' }, 'free it support quote'));
});

test('broad negatives get one note saying they go in as Phrase', () => {
  const m = doc('Ad group negatives\n- cheap (broad)');
  m.accountNegatives = E.linesToKw('jobs (broad)\n[careers]');
  const v = E.validate(m, settings(), TODAY);
  const w = msgs(v.warnings, /broad match\. Microsoft negatives are Exact or Phrase/);
  assert.equal(w.length, 1);
  assert.match(w[0].msg, /^2 negative keywords are broad match/);
});

test('a start date in the past is a warning: Microsoft starts the ad groups today', () => {
  const v = E.validate(doc(), settings({ startDate: '2026-01-01' }), TODAY);
  assert.equal(v.errors.length, 0);
  assert.equal(msgs(v.warnings, /start date is in the past/).length, 1);
});

test('locations: none is an error unless "All countries" is chosen; places without a Microsoft ID get a warning', () => {
  assert.equal(msgs(E.validate(doc(), settings({ locations: [] }), TODAY).errors, /at least one location/).length, 1);
  assert.equal(E.validate(doc(), settings({ locations: [], allLocations: true }), TODAY).errors.length, 0);
  const v = E.validate(doc(), settings({ locations: [{ name: 'Dubai, United Arab Emirates', id: '' }, { name: 'United States', id: '2840' }] }), TODAY);
  assert.equal(msgs(v.warnings, /"Dubai, United Arab Emirates" has no Microsoft location ID/).length, 1);
  assert.equal(msgs(v.warnings, /would show ads in every country/).length, 0);
});

test('a campaign whose places all lack an ID would serve everywhere: a warning when paused, an error when enabled', () => {
  const locations = [{ name: 'Dubai, United Arab Emirates', id: '' }];
  const paused = E.validate(doc(), settings({ locations }), TODAY);
  assert.equal(msgs(paused.warnings, /none of its locations has a Microsoft location ID yet/).length, 1);
  assert.equal(paused.errors.length, 0);
  const enabled = E.validate(doc(), settings({ locations, campaignStatus: 'Enabled' }), TODAY);
  assert.equal(msgs(enabled.errors, /would show ads in every country/).length, 1);
  // an ID the user gave clears it
  const known = E.validate(doc(), settings({ locations, campaignStatus: 'Enabled', locIds: { [E.locKey('Dubai, United Arab Emirates')]: '12345' } }), TODAY);
  assert.equal(known.errors.length, 0);
});

test('several locations without an ID give one grouped warning', () => {
  const list = ['Bloomingdale', 'Roselle', 'Wheaton', 'Lombard', 'Itasca', 'Addison'].map(n => ({ name: n + ', Illinois, United States', id: '' }));
  const v = E.validate(doc(), settings({ locations: list }), TODAY);
  const w = msgs(v.warnings, /no Microsoft location ID \(/);
  assert.equal(w.length, 1);
  assert.match(w[0].msg, /^6 locations have no Microsoft location ID \(Bloomingdale, Illinois, United States; .*; and 2 more\)/);
});

test('ad text policy checks: emoji, repeated punctuation, phone numbers, shouting, exclamation in a headline', () => {
  const m = doc();
  const g = m.adGroups[0];
  g.headlines[0] = 'Fast IT Help 🚀';
  g.headlines[1] = 'Need IT Help??';
  g.headlines[2] = 'Managed IT Today!';
  g.descriptions[0] = 'Call 0800 123 4567 for help with any IT problem today, any time.';
  g.descriptions[1] = 'FREE quotes and fast HVAC style service for every business we work with.';
  const v = E.validate(m, settings(), TODAY);
  assert.equal(msgs(v.errors, /emoji/).length, 1);
  assert.equal(msgs(v.errors, /repeats punctuation/).length, 1);
  assert.equal(msgs(v.warnings, /phone number/).length, 1);
  assert.equal(msgs(v.warnings, /"FREE" in capitals/).length, 1);
  assert.equal(msgs(v.warnings, /HVAC/).length, 0);
  assert.equal(msgs(v.warnings, /headline 3 has an exclamation mark/).length, 1);
});

test('display paths: a slash is an error, a space a warning, and the domain plus paths must fit in 67 characters', () => {
  const m = doc();
  const g = m.adGroups[0];
  g.path1 = 'it/support'; g.path2 = 'fast help';
  let v = E.validate(m, settings(), TODAY);
  assert.equal(msgs(v.errors, /cannot contain a slash/).length, 1);
  assert.equal(msgs(v.warnings, /Path 2 has a space/).length, 1);
  g.path1 = 'it-support'; g.path2 = 'fast-help';
  g.finalUrl = 'https://www.' + 'a'.repeat(50) + '.example.com/';
  v = E.validate(m, settings(), TODAY);
  assert.equal(msgs(v.errors, /Microsoft allows 67/).length, 1);
});

test('Enhanced CPC needs a default ad group bid; Target CPA needs an amount', () => {
  assert.equal(msgs(E.validate(doc(), settings({ bidStrategy: 'ecpc' }), TODAY).errors, /Enhanced CPC needs a default ad group bid/).length, 1);
  assert.equal(E.validate(doc(), settings({ bidStrategy: 'ecpc', maxCpc: '2.5' }), TODAY).errors.length, 0);
  assert.equal(msgs(E.validate(doc(), settings({ bidStrategy: 'tcpa' }), TODAY).errors, /Target CPA needs an amount/).length, 1);
});

test('the review sample passes through: duplicates across ad groups are a warning', () => {
  const m = parseText('Daily budget: 20\nAd Group 1: A\nKeywords\n- office network installation\nAd Group 2: B\nKeywords\n- office network installation');
  const v = E.validate(m, settings(), TODAY);
  assert.equal(msgs(v.warnings, /"office network installation" is in A and B/).length, 2);
});

test('export: the bulk file starts with the format version and puts parents before children', () => {
  const t = E.exportRows(doc(), settings({ startDate: '2026-11-05' }));
  const rows = records(t);
  assert.deepEqual(t.headers.slice(0, 6), ['Type', 'Status', 'Id', 'Parent Id', 'Campaign', 'Ad Group']);
  assert.equal(t.headers[t.headers.length - 1], 'Name');
  assert.deepEqual(rows[0], Object.assign(Object.fromEntries(t.headers.map(h => [h, ''])), { kind: 'format', Type: 'Format Version', Name: '6.0' }));
  assert.deepEqual(rows.map(r => r.Type), ['Format Version', 'Campaign', 'Campaign Location Criterion', 'Campaign Location Intent Criterion',
    'Ad Group', 'Keyword', 'Keyword', 'Responsive Search Ad']);
  const camp = rows[1];
  assert.equal(camp.Status, 'Paused');
  assert.equal(camp.Id, '-1');
  assert.equal(camp['Time Zone'], 'EasternTimeUSCanada');
  assert.equal(camp.Budget, '30');
  assert.equal(camp['Budget Type'], 'DailyBudgetStandard');
  assert.equal(camp['Campaign Type'], 'Search');
  assert.equal(camp.Language, 'English');
  assert.equal(camp['Bid Strategy Type'], 'MaxClicks');
  // the United States has Microsoft's documented ID 190; presence only is PeopleIn
  assert.equal(rows[2].Target, '190');
  assert.equal(rows[2]['Parent Id'], '-1');
  assert.equal(rows[3].Target, 'PeopleIn');
  const ag = rows[4];
  assert.equal(ag.Status, 'Active');
  assert.equal(ag['Parent Id'], '-1');
  assert.equal(ag['Start Date'], '11/5/2026');
  assert.equal(ag['Network Distribution'], 'OwnedAndOperatedOnly');
  rows.slice(5).forEach(r => { assert.equal(r['Parent Id'], ag.Id); assert.equal(r['Ad Group'], 'IT Support'); });
  assert.deepEqual(rows.filter(r => r.Type === 'Keyword').map(r => r['Match Type']), ['Phrase', 'Phrase']);
});

test('export: responsive search ad headlines and descriptions are JSON text assets', () => {
  const m = doc();
  m.adGroups[0].descriptions[0] = 'Fast, friendly "IT" help for small businesses across the whole region.';
  const t = E.exportRows(m, settings());
  const ad = records(t).find(r => r.Type === 'Responsive Search Ad');
  assert.deepEqual(JSON.parse(ad.Headline), [{ text: 'IT Support Experts' }, { text: 'Fast IT Help' }, { text: 'Managed IT Services' }]);
  assert.equal(JSON.parse(ad.Description)[0].text, 'Fast, friendly "IT" help for small businesses across the whole region.');
  assert.equal(ad['Final Url'], 'https://www.example.com/');
  assert.equal(ad['Path 1'], 'IT-Support');
  const csv = E.toCSV(t);
  // CSV doubles the quotes inside the JSON, as Microsoft's bulk examples show
  assert.ok(csv.includes('"[{""text"":""Fast, friendly \\""IT\\"" help'));
  assert.ok(csv.includes('"[{""text"":""IT Support Experts""},{""text"":""Fast IT Help""},{""text"":""Managed IT Services""}]"'));
  assert.ok(csv.endsWith('\r\n'));
});

test('export: campaign negatives, per-campaign locations, Enhanced CPC bids, broad match, negatives as Phrase', () => {
  const m = parseText([
    'Campaign 1: Core',
    'Daily budget: 40',
    'Locations: Austin, TX',
    'Campaign negative keywords: jobs, salary, [careers]',
    'Ad Group 1: IT Support',
    'Max CPC: 3.5',
    'Keywords',
    '- it support (broad)',
    'Negative keywords',
    '- cheap (broad)',
    'Headlines',
    '- IT Support Experts',
    '- Fast IT Help',
    '- Managed IT Services',
    'Descriptions',
    '- We fix IT problems fast for small businesses across the region.',
    '- Talk to a specialist about a managed IT plan for your business.'
  ].join('\n'));
  m.accountNegatives = E.linesToKw('free (broad)\njobs');
  const austin = E.locKey('Austin, Texas, United States');
  const t = E.exportRows(m, settings({ bidStrategy: 'ecpc', maxCpc: '2', locIds: { [austin]: '55555' } }));
  const rows = records(t);
  assert.deepEqual(rows.filter(r => r.Type === 'Campaign Location Criterion').map(r => r.Target), ['55555']);
  assert.deepEqual(rows.filter(r => r.Type === 'Keyword').map(r => r['Match Type']), ['Broad']);
  assert.equal(rows.find(r => r.Type === 'Campaign')['Bid Strategy Type'], 'EnhancedCpc');
  assert.equal(rows.find(r => r.Type === 'Ad Group')['Cpc Bid'], '3.5');
  const campNeg = rows.filter(r => r.Type === 'Campaign Negative Keyword').map(r => r.Keyword + '|' + r['Match Type']);
  assert.deepEqual(campNeg, ['free|Phrase', 'jobs|Phrase', 'salary|Phrase', 'careers|Exact']);
  assert.deepEqual(rows.filter(r => r.Type === 'Ad Group Negative Keyword').map(r => r.Keyword + '|' + r['Match Type']), ['cheap|Phrase']);
});

test('export: places without an ID are left out and listed to add by hand; "All countries" writes no location rows', () => {
  const locations = [{ name: 'Round Rock, Texas, United States', id: '' }, { name: 'Canada', id: '2124' }];
  const t = E.exportRows(doc(), settings({ locations }));
  assert.deepEqual(records(t).filter(r => r.Type === 'Campaign Location Criterion').map(r => r.Target), ['32']);
  assert.deepEqual(E.missingLocations(doc(), settings({ locations })), [{ campaign: 'Search campaign', places: ['Round Rock, Texas, United States'], excluded: [] }]);
  const all = E.exportRows(doc(), settings({ locations: [], allLocations: true }));
  assert.equal(records(all).filter(r => r.Type === 'Campaign Location Criterion').length, 0);
});

test('export: automated strategies carry the max CPC limit and target CPA; search partners widen the network', () => {
  const t = E.exportRows(doc(), settings({ bidStrategy: 'tcpa', targetCpa: '45', bidCap: '6', searchPartners: true, presenceOnly: false, campaignStatus: 'Enabled' }));
  const rows = records(t);
  const camp = rows.find(r => r.Type === 'Campaign');
  assert.equal(camp.Status, 'Active');
  assert.equal(camp['Bid Strategy Type'], 'TargetCpa');
  assert.equal(camp['Bid Strategy TargetCpa'], '45');
  assert.equal(camp['Bid Strategy MaxCpc'], '6');
  assert.equal(rows.find(r => r.Type === 'Ad Group')['Network Distribution'], 'OwnedAndOperatedAndSyndicatedSearch');
  // automated strategies take no ad group bid, so the column is left out
  assert.ok(!rows.find(r => r.Type === 'Ad Group')['Cpc Bid']);
  assert.equal(rows.find(r => r.Type === 'Campaign Location Intent Criterion').Target, 'PeopleInOrSearchingForOrViewingPages');
});

test('export: languages use Microsoft\'s names; none, or only ones Microsoft lacks, means All', () => {
  assert.equal(E.msLanguages(['en', 'fr', 'zh_TW']), 'English;French;TraditionalChinese');
  assert.equal(E.msLanguages([]), 'All');
  assert.equal(E.msLanguages(['ar', 'hi']), 'All');
  const camp = records(E.exportRows(doc(), settings({ languages: [] }))).find(r => r.Type === 'Campaign');
  assert.equal(camp.Language, 'All');
});

test('time zone: one zone that fits every place, or none', () => {
  assert.equal(E.guessTimeZone([{ name: 'Austin, Texas, United States' }, { name: 'Dallas, Texas, United States' }]), 'CentralTimeUSCanada');
  assert.equal(E.guessTimeZone([{ name: 'Texas, United States' }]), 'CentralTimeUSCanada');
  assert.equal(E.guessTimeZone([{ name: 'United Kingdom' }]), 'GreenwichMeanTimeDublinEdinburghLisbonLondon');
  assert.equal(E.guessTimeZone([{ name: 'Dubai, United Arab Emirates' }]), 'AbuDhabiMuscat');
  assert.equal(E.guessTimeZone([{ name: 'Toronto, Ontario, Canada' }]), 'EasternTimeUSCanada');
  assert.equal(E.guessTimeZone([{ name: 'United States' }]), null);
  assert.equal(E.guessTimeZone([{ name: 'Austin, Texas, United States' }, { name: 'Seattle, Washington, United States' }]), null);
  assert.equal(E.guessTimeZone([]), null);
  assert.equal(E.TIME_ZONES.length, 75);
});

test('location IDs: Microsoft\'s documented country IDs, IDs a person gave, and nothing guessed', () => {
  assert.equal(E.msLocationId({ name: 'United States', id: '2840' }, {}), '190');
  assert.equal(E.msLocationId({ name: 'Canada', id: '2124' }, {}), '32');
  assert.equal(E.msLocationId({ name: 'United Kingdom', id: '2826' }, {}), '');
  assert.equal(E.msLocationId({ name: 'United Kingdom', id: '2826' }, { locIds: { 'united kingdom': '777' } }), '777');
  assert.equal(E.msLocationId({ name: 'Austin, Texas, United States', id: '' }, { locIds: { [E.locKey('austin,  TEXAS, United States')]: '88' } }), '88');
});

test('the Microsoft geographical locations file fills in IDs, by Google ID for countries and by name for the rest', () => {
  // made-up IDs in the file's documented format
  const file = [
    'Location Id,Bing Display Name,Location Type,Replaces,Status,AdWords Location Id',
    '901,United Kingdom,Country,,Active,2826',
    '902,United States,Country,,Active,2840',
    '903,United Arab Emirates,Country,,Active,2784',
    '911,Texas|United States,State,,Active,',
    '912,Austin|Texas|United States,City,,Active,',
    '913,Austin|Minnesota|United States,City,,Active,',
    '914,Dubai|United Arab Emirates,State,,Active,',
    '915,Dubai|Dubai|United Arab Emirates,City,,Active,',
    '916,Round Rock|Texas|United States,City,,Deprecated,',
    '917,78701,PostalCode,,Active,',
    '918,Springfield|Illinois|United States,City,,Active,',
    '919,Springfield|Missouri|United States,City,,Active,'
  ].join('\n');
  const ix = E.geoIndex(file);
  assert.equal(E.geoLookup(ix, { name: 'United Kingdom', id: '2826' }), '901');
  assert.equal(E.geoLookup(ix, { name: 'Texas, United States', id: '' }), '911');
  assert.equal(E.geoLookup(ix, { name: 'Austin, Texas, United States', id: '' }), '912');
  assert.equal(E.geoLookup(ix, { name: 'Dubai, United Arab Emirates', id: '' }), '914');
  assert.equal(E.geoLookup(ix, { name: 'Round Rock, Texas, United States', id: '' }), '', 'deprecated places are not used');
  assert.equal(E.geoLookup(ix, { name: 'Springfield', id: '' }), '', 'two Springfields: no guess');
  assert.equal(E.geoLookup(ix, { name: 'Paris, France', id: '' }), '');
  assert.throws(() => E.geoIndex('Campaign,Ad Group\nA,B'), /not Microsoft's geographical locations file/);
});
