// Builds app/js/ms-geo.js, the Microsoft location IDs the tool knows, from Microsoft's geographical locations file
// (format 2.0: Location Id, Bing Display Name, Location Type, Replaces, Status, AdWords Location Id).
// Anyone with Microsoft Advertising API access can download a current file through GetGeoLocationsFileUrl.
//   node scripts/build-geo.js path/to/GeoLocations.csv "Microsoft geographical locations file, 2026-10"
// The file is read as data only. Countries are named through their AdWords Location Id, so the file's language does not
// matter for them; French state and city names (the copy this tool ships from is French) are translated below.
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('../app/js/engine.js');

// French names of first-level regions -> English, by country (English names in an English file pass through untouched)
const REGION_EN = {
  'United States': { 'Californie': 'California', 'District de Columbia': 'District of Columbia', 'Floride': 'Florida', 'Géorgie': 'Georgia', 'Louisiane': 'Louisiana',
    'Caroline du Nord': 'North Carolina', 'Dakota du Nord': 'North Dakota', 'Nouveau-Mexique': 'New Mexico', 'Pennsylvanie': 'Pennsylvania', 'Caroline du Sud': 'South Carolina',
    'Dakota du Sud': 'South Dakota', 'Virginie': 'Virginia', 'Virginie-Occidentale': 'West Virginia' },
  'Canada': { 'Colombie-Britannique': 'British Columbia', 'Nouveau-Brunswick': 'New Brunswick', 'Nouvelle-Écosse': 'Nova Scotia', 'Territoires du Nord-Ouest': 'Northwest Territories',
    'Île du Prince-Édouard': 'Prince Edward Island', 'Québec': 'Quebec', 'Terre-Neuve et Labrador': 'Newfoundland and Labrador' },
  'Australia': { 'Nouvelle-Galles du Sud': 'New South Wales', 'Territoire du Nord': 'Northern Territory', 'Australie-Méridionale': 'South Australia', 'Tasmanie': 'Tasmania',
    'Australie-Occidentale': 'Western Australia', 'Territoire de la Capitale australienne': 'Australian Capital Territory', 'Territoire de la baie de Jervis': 'Jervis Bay Territory' },
  'United Kingdom': { 'Angleterre': 'England', 'Irlande du Nord': 'Northern Ireland', 'Écosse': 'Scotland', 'Pays de Galles': 'Wales' },
  'India': { 'Damān-et-Diu': 'Daman and Diu', 'Dadra-et-Nagar-Haveli': 'Dadra and Nagar Haveli', 'Jammu et Cachemire (État)': 'Jammu and Kashmir', 'Laquedives': 'Lakshadweep',
    'Pendjab': 'Punjab', 'Pondichéry': 'Puducherry', 'Bengale-Occidental': 'West Bengal', 'Télangana': 'Telangana', 'Îles Andaman-et-Nicobar': 'Andaman and Nicobar Islands' },
  'China': { 'Pékin': 'Beijing', 'Mongolie-intérieure': 'Inner Mongolia', 'Húnán': 'Hunan' },
  'France': { 'Bourgogne': 'Burgundy', 'Bretagne': 'Brittany', 'Corse': 'Corsica', 'Basse-Normandie': 'Lower Normandy', 'Haute-Normandie': 'Upper Normandy', 'Normandie': 'Normandy', 'Picardie': 'Picardy' },
  'Brazil': { 'District fédéral': 'Federal District', 'Pernambouc': 'Pernambuco' },
  'Switzerland': { 'Argovie': 'Aargau', 'Appenzell Rhodes-Extérieures': 'Appenzell Ausserrhoden', 'Berne': 'Bern', 'Bâle-Campagne': 'Basel-Landschaft', 'Bâle-Ville': 'Basel-Stadt',
    'Genève': 'Geneva', 'Glaris': 'Glarus', 'Grisons': 'Graubünden', 'Nidwald': 'Nidwalden', 'Obwald': 'Obwalden', 'Saint-Gall': 'St. Gallen', 'Schaffhouse': 'Schaffhausen',
    'Soleure': 'Solothurn', 'Schwiz': 'Schwyz', 'Thurgovie': 'Thurgau', 'Tessin': 'Ticino', 'Zoug': 'Zug', 'Appenzell Rhodes-Intérieures': 'Appenzell Innerrhoden' },
  'Sweden': { 'Comté de Scanie': 'Skåne County', 'Comté de Dalécarlie': 'Dalarna County' },
  'Italy': { 'Vénétie': 'Veneto', 'Ligurie': 'Liguria', 'Basilicate': 'Basilicata', 'Sicile': 'Sicily', 'Trentin-Haut-Adige': 'Trentino-Alto Adige', 'Sardaigne': 'Sardinia',
    'Abruzzes': 'Abruzzo', 'Latium': 'Lazio', 'Marches': 'Marche', 'Piémont': 'Piedmont', 'Calabre': 'Calabria', 'Pouilles': 'Apulia', 'Lombardie': 'Lombardy', 'Ombrie': 'Umbria',
    'Campanie': 'Campania', 'Émilie-Romagne': 'Emilia-Romagna', 'Toscane': 'Tuscany', 'Frioul-Vénétie-Julienne': 'Friuli-Venezia Giulia', 'Val d’Aoste': 'Aosta Valley' },
  'Spain': { 'Cité Autonome de Ceuta': 'Ceuta', 'Communauté de Madrid': 'Community of Madrid', 'Cité Autonome de Melilla': 'Melilla', 'Cantabrie': 'Cantabria', 'Valence': 'Valencian Community',
    'Region de Murcie': 'Region of Murcia', 'Andalousie': 'Andalusia', 'Castille et León': 'Castile and León', 'Pays Basque': 'Basque Country', 'Asturies': 'Asturias', 'Galice': 'Galicia',
    'Estrémadure': 'Extremadura', 'Canaries': 'Canary Islands', 'Baléares': 'Balearic Islands', 'Catalogne': 'Catalonia', 'Castille-La Manche': 'Castilla-La Mancha' },
  'New Zealand': { "Baie de l'Abondance": 'Bay of Plenty', 'Baie de Hawkes': "Hawke's Bay", 'Côte Ouest': 'West Coast', 'Îles Chatham': 'Chatham Islands' },
  'Germany': { 'Brandebourg': 'Brandenburg', 'Bade-Wurtemberg': 'Baden-Württemberg', 'Bavière': 'Bavaria', 'Brême': 'Bremen', 'Hambourg': 'Hamburg',
    'Mecklembourg-Poméranie-Antérieure': 'Mecklenburg-Vorpommern', 'Basse-Saxe': 'Lower Saxony', 'Rhénanie du Nord-Westphalie': 'North Rhine-Westphalia',
    'Rhénanie-Palatinat': 'Rhineland-Palatinate', 'Sarre': 'Saarland', 'Saxe': 'Saxony', 'Saxe-Anhalt': 'Saxony-Anhalt', 'Thuringe': 'Thuringia' },
  'Netherlands': { 'Frise': 'Friesland', 'Gueldre': 'Gelderland', 'Groningue': 'Groningen', 'Limbourg': 'Limburg', 'Brabant Septentrional': 'North Brabant',
    'Hollande Septentrionale': 'North Holland', 'Zélande': 'Zeeland', 'Hollande Méridionale': 'South Holland' },
  'Austria': { 'Carinthie': 'Carinthia', 'Basse-Autriche': 'Lower Austria', 'Haute-Autriche': 'Upper Austria', 'Salzbourg': 'Salzburg', 'Styrie': 'Styria', 'Vienne': 'Vienna' },
  'Denmark': { 'Jutland du Nord': 'North Denmark Region', 'Région de la Capitale': 'Capital Region of Denmark', 'Jutland-Central': 'Central Denmark Region',
    'Danemark-du-Sud': 'Region of Southern Denmark', 'Seeland': 'Region Zealand' },
  'Belgium': { 'Région de Bruxelles-Capitale': 'Brussels-Capital Region', 'Région flamande': 'Flemish Region', 'Région wallonne': 'Walloon Region' }
};
// "Comté de Stockholm" -> "Stockholm County"
const swedishCounty = n => { const m = /^Comté (?:de |d')(.+)$/.exec(n); return m ? m[1] + ' County' : n; };
// French names of cities that differ in English
const CITY_EN = {
  'United Kingdom': { 'Londres': 'London', 'Édimbourg': 'Edinburgh', 'Douvres': 'Dover', 'Cantorbéry': 'Canterbury' },
  'Germany': { 'Francfort-sur-le-Main': 'Frankfurt am Main', 'Hambourg': 'Hamburg', 'Brême': 'Bremen', 'Aix-la-Chapelle': 'Aachen', 'Brunswick': 'Braunschweig',
    'Mayence': 'Mainz', 'Trèves': 'Trier', 'Ratisbonne': 'Regensburg', 'Nuremberg': 'Nuremberg', 'Coblence': 'Koblenz', 'Sarrebruck': 'Saarbrücken', 'Fribourg-en-Brisgau': 'Freiburg im Breisgau' },
  'France': { 'Marseille': 'Marseille' },
  'Canada': { 'Montréal': 'Montreal', 'Québec': 'Quebec City' }
};
// regions that are not campaign targets or that would be wrong under their parent
const SKIP = new Set(['China|Taïwan', 'China|Aksai Chin', 'Brazil|Zone contestée']);
const SKIP_COUNTRY_IDS = new Set(['220']);  // "Gaza Strip": narrower than the Palestine its AdWords ID maps to

function main() {
  const [file, label] = process.argv.slice(2);
  if (!file) { console.error('usage: node scripts/build-geo.js GeoLocations.csv "source label"'); process.exit(1); }
  const rows = E.csvToRows(fs.readFileSync(file, 'utf8'));
  const head = rows.shift().map(h => h.toLowerCase());
  const col = n => head.indexOf(n);
  const ci = { id: col('location id'), name: col('bing display name'), type: col('location type'), status: col('status'), gid: col('adwords location id') };
  if (ci.id < 0 || ci.name < 0 || ci.type < 0 || ci.gid < 0) throw new Error('not a geographical locations file (format 2.0)');
  const active = rows.filter(r => /^active$/i.test(r[ci.status] || '') && /^\d{1,10}$/.test(r[ci.id] || ''));
  const gNames = new Map(E.COUNTRIES.map(c => [c[1], c[0]]));
  // countries, by Google ID; the file's own country names map to English through the same join
  const countries = [], countryEn = new Map();
  active.filter(r => /^country$/i.test(r[ci.type])).forEach(r => {
    const gid = r[ci.gid], id = r[ci.id];
    if (SKIP_COUNTRY_IDS.has(id)) return;
    const en = gNames.get(gid) || (gid === '2530' ? 'Caribbean Netherlands' : null);
    if (!en) { console.warn('country without a Google match, left out:', r[ci.name]); return; }
    const g = gid === '2530' ? '2535' : gid;
    countries.push(g + ':' + id);
    countryEn.set(r[ci.name], en);
  });
  // the checks this table rests on: Microsoft documents 190 for the United States and 32 for Canada
  const cmap = new Map(countries.map(x => x.split(':')));
  if (cmap.get('2840') !== '190' || cmap.get('2124') !== '32') throw new Error('United States or Canada do not match Microsoft\'s documented IDs');
  const regionName = (country, n) => country === 'Sweden' ? ((REGION_EN.Sweden || {})[n] || swedishCounty(n)) : ((REGION_EN[country] || {})[n] || n);
  const regions = {}, cities = {}, seen = new Map();
  const add = (bucket, k, name, id) => {
    const dup = k + '|' + E.locKey(name);
    if (seen.has(dup)) { seen.set(dup, null); return; }  // two active entries with one name: no guess
    seen.set(dup, { bucket, k, name, id });
  };
  active.forEach(r => {
    const type = (r[ci.type] || '').toLowerCase();
    if (type !== 'state' && type !== 'city') return;
    const parts = r[ci.name].split('|');
    const country = countryEn.get(parts[parts.length - 1]);
    if (!country) return;
    if (type === 'state' && parts.length === 2) {
      if (SKIP.has(country + '|' + parts[0])) return;
      add('r', country, regionName(country, parts[0]), r[ci.id]);
    } else if (type === 'city' && parts.length === 3) {
      const region = regionName(country, parts[1]);
      add('c', country + '|' + region, (CITY_EN[country] || {})[parts[0]] || parts[0], r[ci.id]);
    }
  });
  let nr = 0, nc = 0, dups = 0;
  seen.forEach(v => {
    if (!v) { dups++; return; }
    const clean = v.name.replace(/[|:]/g, ' ');
    if (v.bucket === 'r') { (regions[v.k] = regions[v.k] || []).push(clean + ':' + v.id); nr++; }
    else { const [country, region] = v.k.split('|'); ((cities[country] = cities[country] || {})[region] = cities[country][region] || []).push(clean + ':' + v.id); nc++; }
  });
  const join = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, Array.isArray(o[k]) ? o[k].join('|') : join(o[k])]));
  const out = '/* Microsoft Advertising location IDs: countries (by Google country ID), first-level regions and cities.\n'
    + '   Generated by scripts/build-geo.js from ' + (label || path.basename(file)) + '. Rebuild it from a current file when you have one.\n'
    + '   Country IDs are matched to Google\'s through the file\'s own AdWords Location Id column. */\n'
    + '(function (root) {\n  \'use strict\';\n  const data = ' + JSON.stringify({ source: label || path.basename(file), countries: countries.join(','), regions: join(regions), cities: join(cities) }) + ';\n'
    + '  if (typeof module !== \'undefined\' && module.exports) module.exports = data;\n  else root.MSGeoData = data;\n})(typeof window !== \'undefined\' ? window : globalThis);\n';
  const target = path.join(__dirname, '..', 'app', 'js', 'ms-geo.js');
  fs.writeFileSync(target, out);
  console.log('countries', countries.length, 'regions', nr, 'cities', nc, 'left out as duplicates', dups, '->', path.relative(process.cwd(), target), (out.length / 1024).toFixed(0) + ' KB');
}
main();
