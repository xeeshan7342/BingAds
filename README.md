# Microsoft Ads Bulk Builder

Turns a Search campaign structure doc into one bulk file you can import into Microsoft Advertising Editor. Load the doc, check what the tool found, fix anything it flags, and download the CSV.

It is the Microsoft Advertising version of the Campaign Bulk Builder for Google Ads, and it reads docs the same way. A doc written for Google Ads works here too.

It runs entirely in the browser. Docs are never uploaded. The only time anything leaves your computer is when you choose **Read with AI**, and then only the doc text goes to Anthropic's API under your own key.

## Ways to use it

**Online.** Once GitHub Pages is switched on (see below), the tool lives at `https://xeeshan7342.github.io/BingAds/`.

**Offline, by double-click.** Download `microsoft-ads-builder.html` (linked at the bottom of the online tool, or build it with `npm run build`) and open it in Chrome, Edge, Firefox or Safari. Everything is inside that one file. Without internet it uses system fonts, and AI reading needs a connection.

**From a copy of this repo.** Open `app/index.html` directly. It needs no server and no build step.

## What docs it understands

Word (.docx), Excel (.xlsx, every visible tab), CSV and TSV, text and Markdown. From Google Docs use File, Download, Microsoft Word (.docx). From Google Sheets use .xlsx. You can also paste text.

The reader is the same one the Google Ads tool uses, so the same layouts work: ad groups as headings, table rows, table columns or spreadsheet tabs; campaigns from a campaign table or headings; keywords as lists, tables or Keyword Planner pastes; headlines and descriptions as lists, tables, numbered lines or one mixed "Ad copy" list; negatives at account, campaign or ad group level; and settings such as final URL, budgets in any currency, locations, languages, bidding, match type, search partners and start date.

Planning workbooks work as they are. A tab can hold a title, a line of instructions and several tables one under another, with notes between them and an empty first column; each table is read on its own and the notes go to the import report. Dashboard, checklist and asset tabs are skipped, and dashboard figures such as "CAMPAIGNS 2 | KEYWORDS 190" never become campaigns. A Structure tab gives each ad group its final URL and paths, and count columns such as "Phrase | Exact | Total" are not read as keywords. When an Ads tab writes one ad per ad group with no campaign column ("used in both campaigns"), every campaign's ad group of that name gets the ad, and the tool says so.

Microsoft and Bing sections are this tool's platform. Google Ads sections are read too, because most docs are written for Google first and the same campaigns run on both. When a doc has its own Microsoft Ads or Bing section with ad groups or keywords in it, that section is used and the Google Ads version is skipped. Sections for Meta, LinkedIn, TikTok and other platforms, and for Display, Shopping, Performance Max and audience campaigns, are skipped as one unit.

## What changes from the Google Ads version

| Area | What the tool does for Microsoft Advertising |
|---|---|
| File | A bulk file in Microsoft's format version 6.0: a `Format Version` row, then campaigns, location targets, negatives, ad groups, keywords and responsive search ads, each parent before its children |
| Time zone | Required on every new campaign. The tool picks one when every location shares a zone (Texas, Dubai, the UK), and asks you otherwise |
| Bidding | Maximize clicks, Maximize conversions, Target CPA and Enhanced CPC. Microsoft Search campaigns have no manual CPC, so a doc that asks for it gets Enhanced CPC with its bids as the starting point. A CPC cap in the doc becomes the Max CPC limit |
| Languages | Microsoft's ad languages only (English, French, German, Spanish, Portuguese, Italian, Dutch, the Nordic and EU languages, and Traditional Chinese). Others, such as Arabic or Hindi, are left out with a note; with none left the campaign targets all languages |
| Negatives | Microsoft negatives are Exact or Phrase, so broad negatives go in as Phrase |
| Keywords | Up to 100 characters, with no word limit |
| Search partners | Off writes `OwnedAndOperatedOnly` on each ad group; on writes `OwnedAndOperatedAndSyndicatedSearch` |
| Start date | Set on each ad group. A date in the past is a warning, since Microsoft starts the ad groups that day instead |
| Display URL | Paths are 15 characters each, and the domain plus both paths must fit in 67 |
| Pins | Pinned headlines and descriptions go into the file as Microsoft pins (`"pinnedField": "Headline1"`), from a Pin column or a note such as "(Pin 1)". Each line has a pin picker, and the preview shows the pinned line in its place |
| Excluded places | An "Excluded locations" setting, or "excluding ..." in a locations line, becomes excluded location rows once the places have IDs |
| Final URL suffix | Read from the doc or typed in, and written on each campaign |
| Ad rotation | "Optimize for clicks" or "Rotate evenly", written on each ad group |
| Location option | "People in your targeted locations" means presence only; wording about searching for or viewing pages turns it off |
| Locations | Need Microsoft's own location IDs, covered below |

## Microsoft location IDs

This is the one part that works differently from Google. Microsoft's bulk file targets a place only by Microsoft's location ID. It does not take Google's IDs and it does not match places by name.

The tool ships the two IDs Microsoft publishes in its own documentation: the United States (190) and Canada (32). For every other place it uses an ID you give it, and it never guesses one, because a wrong ID would spend money in the wrong place.

There are two ways to give IDs. Type the ID next to the place under **Locations**, and the tool remembers it for every doc after that. Or load Microsoft's geographical locations file with **Load Microsoft location file**. The tool then fills in every place it can match, countries by their Google ID and the rest by name, and remembers those too. Developers with Microsoft Advertising API access can download that file through the `GetGeoLocationsFileUrl` operation; ask whoever manages your API access if you don't have it.

Places that still have no ID are left out of the file and listed under **Add these places by hand**, so you can add them in Editor after import. A campaign whose places all lack an ID would show ads in every country, so the tool warns when it is imported paused and blocks the export when it would be imported enabled.

## The import report and memory

Every line the tool could not place is listed in the import report with the reason. You can add it as a headline, description, keyword or negative, or teach the tool what lines like it mean so it reads them right in every doc after that.

Taught labels, saved client profiles and Microsoft location IDs are kept in this browser. Use **Export memory** to save them to a file, and **Import memory** on another computer or for a teammate. A memory file exported from the Google Ads tool imports too: its taught labels carry over, and its profiles come across with Manual CPC as Enhanced CPC and only Microsoft's languages. The two tools keep separate memories in the browser, so using one never changes the other.

## AI reading

For docs the rules can't follow, open **AI reading**. Either copy a prompt into claude.ai with your Claude plan and paste the answer back, or use an Anthropic API key. Claude returns the structure as JSON in a fixed shape, and the result goes through the same checks and export as the rule-based read.

## Checks before export

Export is blocked until errors are fixed. Errors cover Microsoft's hard limits: headline 30 and description 90 characters, 3 to 15 headlines and 2 to 4 descriptions, duplicate headlines, emoji, repeated punctuation, symbols in keywords, keyword length, display path rules, campaign and ad group name length, missing budgets, final URLs, time zone, target CPA or Enhanced CPC bid, pins that leave a position with nothing to show, a final URL suffix that starts with ? or uses {lpurl}, and a campaign that would serve everywhere while enabled.

Warnings don't block export: places without a location ID (targeted or excluded), broad negatives going in as Phrase, negatives that block your own keywords, the same keyword in two ad groups of one campaign or of campaigns that reach the same places, exclamation marks in headlines, phone numbers or capitalised words in ad text, budgets the doc gave without saying daily or monthly, and start dates in the past.

## Importing into Microsoft Advertising Editor

1. Open the account in Microsoft Advertising Editor and get the latest changes.
2. Choose **Import**, then **Import from file**, and pick the CSV.
3. Check the import summary and any rows Editor flags.
4. Add any places listed under **Add these places by hand** to each campaign's location targeting.
5. Review, then **Post**. Campaigns arrive paused unless you chose Enabled.

The file follows Microsoft's bulk file schema (format version 6.0). New campaigns and ad groups get negative reference IDs, and every child row also carries its campaign and ad group name, so Editor can tie the rows together either way.

## Development

```bash
npm install        # dev tools: jsdom, jszip, mammoth, the Anthropic SDK, esbuild
npm test           # node:test suite in tests/
npm run build      # writes dist/microsoft-ads-builder.html
npm run vendor     # refreshes app/vendor/ after a dependency upgrade
```

The app is plain JavaScript with no build step. Files in `app/js`:

| File | What it does |
|---|---|
| `engine.js` | Reads blocks (headings, paragraphs, lists, tables) into campaigns and ad groups, checks them against Microsoft's rules, and writes bulk rows. Also holds the time zones, languages and location ID lookup. Runs in Node for the tests. |
| `readers.js` | Turns .docx, .xlsx, CSV and text files into blocks. |
| `memory.js` | Taught labels, client profiles and Microsoft location IDs, stored in the browser, with export and import. |
| `ai.js` | The optional Claude reader: request, schema, error messages and conversion to the engine's format. |
| `app.js` | The page. |
| `sample.js` | The made-up sample doc. |

`app/vendor` holds mammoth (Word), JSZip (Excel) and a bundled copy of the Anthropic SDK, so the tool works offline and loads nothing from a CDN except fonts. Versions are in `app/vendor/VERSIONS.txt`.

Never commit real client documents to this repository. It is public.

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` runs the tests on every push and pull request, and deploys the site from the repository's default branch. To switch it on once: in the repository go to **Settings > Pages** and set **Source** to **GitHub Actions**, then re-run the workflow (Actions tab) or push again. The tool is then live at `https://xeeshan7342.github.io/BingAds/`, with the offline file at `/microsoft-ads-builder.html`.
