#!/usr/bin/env node
/**
 * Standalone verification for the Vercel scraper fix.
 *
 * The scraper bug (packages/scraper/src/scrapers/vercel.ts, pre-fix) read
 * `.text()` on the whole job `<a>` element, which concatenated the title,
 * location(s), and a "Read more" button label into one string with no
 * separator, e.g. "Account Executive, CommercialLondonRead more".
 *
 * The real fix pulls title and location from Vercel's own separate DOM
 * fields (`[data-testid^="careers/position-title/"]` and
 * `[data-testid^="careers/position-locations/"]`) instead of string-
 * splitting a blob. This script demonstrates that a heuristic splitter,
 * built from location names taken from the live page's own data, can
 * still correctly recover position/location/remainder from the old
 * concatenated blobs -- as extra evidence the split is well-defined and
 * as a regression check against the reported examples.
 *
 * Run with: node packages/scraper/scripts/verify-vercel-split.js
 * (no dependencies required)
 */

// Ground-truth location gazetteer, gathered by fetching https://vercel.com/careers
// live and reading each job's data-testid="careers/position-locations/N" field
// directly (see the PR description for how it was derived).
const KNOWN_LOCATIONS = [
  "Austin",
  "Australia",
  "Berlin",
  "Germany",
  "India",
  "London",
  "New York City",
  "Remote",
  "San Francisco",
  "United Kingdom",
  "United States",
];

const READ_MORE_SUFFIX = "Read more";

/**
 * Splits a concatenated "position text" blob into { position, location, remainder }.
 * Finds the leftmost split point whose right-hand side parses entirely as a
 * comma-separated list of known location names.
 */
function splitPositionText(raw) {
  let remainder = "";
  let body = raw;

  if (body.endsWith(READ_MORE_SUFFIX)) {
    remainder = READ_MORE_SUFFIX;
    body = body.slice(0, -READ_MORE_SUFFIX.length);
  }

  for (let i = 1; i < body.length; i++) {
    const tail = body.slice(i);
    if (isKnownLocationList(tail)) {
      return { position: body.slice(0, i), location: tail, remainder };
    }
  }

  return { position: body, location: "", remainder };
}

function isKnownLocationList(text) {
  if (!text) return false;
  // No trimming here: a leading/trailing space means the split point is
  // wrong (the space belongs to the position side), so it must fail to
  // match and force the search to try the next split point.
  const parts = text.split(", ");
  return parts.every((part) => KNOWN_LOCATIONS.includes(part));
}

const examples = [
  // The 8 examples from the reported bug (screenshot of broken output).
  {
    raw: "Account Executive, CommercialLondonRead more",
    expected: { position: "Account Executive, Commercial", location: "London" },
  },
  {
    raw: "Community EngineerAustin, New York City, San FranciscoRead more",
    expected: {
      position: "Community Engineer",
      location: "Austin, New York City, San Francisco",
    },
  },
  {
    raw: "Executive Business Center Marketing LeadSan FranciscoRead more",
    expected: { position: "Executive Business Center Marketing Lead", location: "San Francisco" },
  },
  {
    raw: "Manager of the Technical Staff - Next.jsNew York City, San FranciscoRead more",
    expected: {
      position: "Manager of the Technical Staff - Next.js",
      location: "New York City, San Francisco",
    },
  },
  {
    raw: "Marketing Operations ManagerAustin, San FranciscoRead more",
    expected: { position: "Marketing Operations Manager", location: "Austin, San Francisco" },
  },
  {
    raw: "Member of the Technical Staff, Internal Agent United StatesRead more",
    expected: {
      position: "Member of the Technical Staff, Internal Agent ",
      location: "United States",
    },
  },
  {
    raw: "Partner Solutions Engineer, EMEABerlin, LondonRead more",
    expected: { position: "Partner Solutions Engineer, EMEA", location: "Berlin, London" },
  },
  {
    raw: "People Operations Integrations DeveloperAustin, New York City, San FranciscoRead more",
    expected: {
      position: "People Operations Integrations Developer",
      location: "Austin, New York City, San Francisco",
    },
  },
  // Additional real samples pulled live from https://vercel.com/careers to broaden coverage.
  {
    raw: "Account Executive, MajorsLondonRead more",
    expected: { position: "Account Executive, Majors", location: "London" },
  },
  {
    raw: "Business Development Representative, MajorsAustin, New York City, San FranciscoRead more",
    expected: {
      position: "Business Development Representative, Majors",
      location: "Austin, New York City, San Francisco",
    },
  },
  {
    raw: "Commercial Account Executive, GreenfieldAustin, New York City, San FranciscoRead more",
    expected: {
      position: "Commercial Account Executive, Greenfield",
      location: "Austin, New York City, San Francisco",
    },
  },
  {
    raw: "DevRel Engineer, Agentic InfrastructureAustin, New York City, San FranciscoRead more",
    expected: {
      position: "DevRel Engineer, Agentic Infrastructure",
      location: "Austin, New York City, San Francisco",
    },
  },
  {
    raw: "Director, Commercial Sales, EMEALondonRead more",
    expected: { position: "Director, Commercial Sales, EMEA", location: "London" },
  },
  {
    raw: "Startups Program LeadNew York City, San FranciscoRead more",
    expected: { position: "Startups Program Lead", location: "New York City, San Francisco" },
  },
  {
    raw: "Technical Account ManagerBerlin, LondonRead more",
    expected: { position: "Technical Account Manager", location: "Berlin, London" },
  },
  {
    raw: "Visual Designer, WebUnited StatesRead more",
    expected: { position: "Visual Designer, Web", location: "United States" },
  },
];

let pass = 0;
let fail = 0;

console.log("raw -> { position, location, remainder }\n");

for (const { raw, expected } of examples) {
  const result = splitPositionText(raw);
  const ok =
    result.position.trim() === expected.position.trim() && result.location === expected.location;

  console.log(`${ok ? "PASS" : "FAIL"}  raw:       ${JSON.stringify(raw)}`);
  console.log(`      position:  ${JSON.stringify(result.position.trim())}`);
  console.log(`      location:  ${JSON.stringify(result.location)}`);
  console.log(`      remainder: ${JSON.stringify(result.remainder)}`);
  console.log();

  if (ok) pass++;
  else fail++;
}

console.log(`${pass}/${examples.length} examples split correctly` + (fail ? `, ${fail} FAILED` : ""));
process.exitCode = fail ? 1 : 0;
