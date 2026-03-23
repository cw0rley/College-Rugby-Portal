#!/usr/bin/env node
/**
 * College Rugby Portal — School Data Enrichment
 *
 * Fills in missing city, state, and other data for programs that only
 * have school name, gender, and conference from the NCR scraper.
 *
 * This script:
 *   1. Reads the current merged-programs.json
 *   2. Reads the latest scraped data
 *   3. Finds programs in scraped but not in merged (missing from enrichment)
 *   4. Looks up each school in the SCHOOL_INFO database
 *   5. Adds the enriched programs to merged-programs.json
 *   6. Optionally pushes updates to Firestore (--commit flag)
 *
 * Usage:
 *   node enrich-schools.js                # Preview — shows what would be added
 *   node enrich-schools.js --commit       # Write to merged JSON + update Firestore
 *   node enrich-schools.js --firestore    # Only push enrichment to Firestore (skip merged JSON)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const FIRESTORE_ONLY = args.includes("--firestore");

// ─── SCHOOL INFO DATABASE ────────────────────────────────────────────────────
// Maps school name → { city, state, ncaaDivision, schoolType, enrollment (approx) }

const SCHOOL_INFO = {
  "Alfred University":             { city: "Alfred", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 1700 },
  "Angelo State":                  { city: "San Angelo", state: "TX", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 10000 },
  "Army West Point":               { city: "West Point", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 4400 },
  "Benedictine University":        { city: "Lisle", state: "IL", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 3200 },
  "Bloomsburg University":         { city: "Bloomsburg", state: "PA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7500 },
  "Cal Poly Humboldt":             { city: "Arcata", state: "CA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 6000 },
  "California State University - Monterey Bay": { city: "Seaside", state: "CA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7500 },
  "Catholic University":           { city: "Washington", state: "DC", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 5500 },
  "Chico State University":        { city: "Chico", state: "CA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 16000 },
  "College of St. Benedict":       { city: "St. Joseph", state: "MN", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 1800 },
  "Diablo Valley College":         { city: "Pleasant Hill", state: "CA", ncaaDivision: "NJCAA", schoolType: "Public", enrollment: 20000 },
  "Emory & Henry College":         { city: "Emory", state: "VA", ncaaDivision: "NCAA D2", schoolType: "Private", enrollment: 1200 },
  "Franciscan University":         { city: "Steubenville", state: "OH", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 3000 },
  "Fresno State University":       { city: "Fresno", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 25000 },
  "Georgia College and State University": { city: "Milledgeville", state: "GA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7000 },
  "Indiana Institute of Technology": { city: "Fort Wayne", state: "IN", ncaaDivision: "NAIA", schoolType: "Private", enrollment: 3500 },
  "Indiana University":            { city: "Bloomington", state: "IN", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 47000 },
  "Indiana University - Indianapolis": { city: "Indianapolis", state: "IN", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 27000 },
  "Iowa State University":         { city: "Ames", state: "IA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 31000 },
  "Iowa  State University":        { city: "Ames", state: "IA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 31000 },
  "Kutztown University":           { city: "Kutztown", state: "PA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7500 },
  "Letourneau University":         { city: "Longview", state: "TX", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 3400 },
  "Loyola University - Maryland":  { city: "Baltimore", state: "MD", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 5000 },
  "Miami University of Ohio":      { city: "Oxford", state: "OH", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 22000 },
  "Millersville University":       { city: "Millersville", state: "PA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7200 },
  "Minnesota State University - Mankato": { city: "Mankato", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 14000 },
  "Minnessota State University - Mankato": { city: "Mankato", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 14000 },
  "Minnesota State University - Moorhead": { city: "Moorhead", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 5500 },
  "Mira Costa College":            { city: "Oceanside", state: "CA", ncaaDivision: "NJCAA", schoolType: "Public", enrollment: 14000 },
  "Molloy College":                { city: "Rockville Centre", state: "NY", ncaaDivision: "NCAA D2", schoolType: "Private", enrollment: 5000 },
  "Mount Saint Mary's University": { city: "Emmitsburg", state: "MD", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 2200 },
  "Mount Saint Marys University":  { city: "Emmitsburg", state: "MD", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 2200 },
  "New Mexico State University":   { city: "Las Cruces", state: "NM", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 14000 },
  "Ohio Wesleyan University":      { city: "Delaware", state: "OH", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 1400 },
  "Oklahoma University":           { city: "Norman", state: "OK", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 32000 },
  "Ole Miss: University of Mississippi": { city: "Oxford", state: "MS", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 24000 },
  "Paul Smith's College":          { city: "Paul Smiths", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 700 },
  "Penn State - Berks":            { city: "Reading", state: "PA", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 2500 },
  "Penn State University":         { city: "University Park", state: "PA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 47000 },
  "Penn West University - California": { city: "California", state: "PA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 4000 },
  "Penn West University - Clarion": { city: "Clarion", state: "PA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 3500 },
  "Queens University":             { city: "Charlotte", state: "NC", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 2600 },
  "Rice University":               { city: "Houston", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 8000 },
  "Sacramento State University":   { city: "Sacramento", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 31000 },
  "Saint Mary's College":          { city: "Moraga", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 3200 },
  "Southern Illinois University":  { city: "Carbondale", state: "IL", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 11000 },
  "Southern Utah University":      { city: "Cedar City", state: "UT", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 14000 },
  "Southwest Minnesota State University": { city: "Marshall", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7000 },
  "St. Edwards University":        { city: "Austin", state: "TX", ncaaDivision: "NCAA D2", schoolType: "Private", enrollment: 4000 },
  "St. John's University":         { city: "Queens", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 22000 },
  "St. Joseph's University":       { city: "Philadelphia", state: "PA", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 9000 },
  "St. Mary's College of Maryland": { city: "St. Mary's City", state: "MD", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 1500 },
  "St. Michael's College":         { city: "Colchester", state: "VT", ncaaDivision: "NCAA D2", schoolType: "Private", enrollment: 1600 },
  "Stony Brook University":        { city: "Stony Brook", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 27000 },
  "Tennessee Tech University":     { city: "Cookeville", state: "TN", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 10000 },
  "Texas A&M University - Corpus Christi": { city: "Corpus Christi", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 11000 },
  "Texas Christian University":    { city: "Fort Worth", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 12000 },
  "The Ohio State University":     { city: "Columbus", state: "OH", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 61000 },
  "University at Albany":          { city: "Albany", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 17000 },
  "University of Buffalo":         { city: "Buffalo", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 32000 },
  "University of California Berkeley": { city: "Berkeley", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 45000 },
  "University of California Davis": { city: "Davis", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 40000 },
  "University of California Irvine": { city: "Irvine", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 36000 },
  "University of California Los Angeles": { city: "Los Angeles", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 46000 },
  "University of California Riverside": { city: "Riverside", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 26000 },
  "University of California San Diego": { city: "La Jolla", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 42000 },
  "University of California Santa Barbara": { city: "Santa Barbara", state: "CA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 26000 },
  "University of Colorado":        { city: "Boulder", state: "CO", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 40000 },
  "University of Idaho":           { city: "Moscow", state: "ID", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 11000 },
  "University of Illinois":        { city: "Champaign", state: "IL", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 56000 },
  "University of Illinois - Chicago": { city: "Chicago", state: "IL", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 34000 },
  "University of Maine - Farmington": { city: "Farmington", state: "ME", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 1600 },
  "University of Maine - Orono":   { city: "Orono", state: "ME", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 12000 },
  "University of Maryland - Baltimore County": { city: "Baltimore", state: "MD", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 14000 },
  "University of Massachusetts - Amherst": { city: "Amherst", state: "MA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 32000 },
  "University of Massachusetts - Lowell": { city: "Lowell", state: "MA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 18000 },
  "University of Minnesota":       { city: "Minneapolis", state: "MN", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 55000 },
  "University of Minnesota - Duluth": { city: "Duluth", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 10000 },
  "University of Minnesota - Moorhead": { city: "Moorhead", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 5500 },
  "University of Missouri - Science & Technology": { city: "Rolla", state: "MO", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 8000 },
  "University of Montana":         { city: "Missoula", state: "MT", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 11000 },
  "University of Nebraska":        { city: "Lincoln", state: "NE", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 25000 },
  "University of Nevada Reno":     { city: "Reno", state: "NV", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 21000 },
  "University of North Carolina - Chapel Hill": { city: "Chapel Hill", state: "NC", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 31000 },
  "University of North Carolina - Charlotte": { city: "Charlotte", state: "NC", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 30000 },
  "University of North Carolina - Wilmington": { city: "Wilmington", state: "NC", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 18000 },
  "University of North Carolina Greensboro": { city: "Greensboro", state: "NC", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 20000 },
  "University of North Georgia":   { city: "Dahlonega", state: "GA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 20000 },
  "University of Pittsburgh - Johnstown": { city: "Johnstown", state: "PA", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 2500 },
  "University of Texas - Austin":  { city: "Austin", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 52000 },
  "University of Texas - Dallas":  { city: "Richardson", state: "TX", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 31000 },
  "University of Texas - San Antonio": { city: "San Antonio", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 34000 },
  "University of Texas El Paso":   { city: "El Paso", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 24000 },
  "University of Wisconsin":       { city: "Madison", state: "WI", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 49000 },
  "University of Wisconsin - Eau Claire": { city: "Eau Claire", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 10000 },
  "University of Wisconsin - La Crosse": { city: "La Crosse", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 10000 },
  "University of Wisconsin - Milwaukee": { city: "Milwaukee", state: "WI", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 24000 },
  "University of Wisconsin - Oshkosh": { city: "Oshkosh", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 14000 },
  "University of Wisconsin - Platteville": { city: "Platteville", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7000 },
  "University of Wisconsin - Stevens Point": { city: "Stevens Point", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 8000 },
  "University of Wisconsin - Stout": { city: "Menomonie", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7500 },
  "University of Wisconsin - Whitewater": { city: "Whitewater", state: "WI", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 11000 },
  "Utah Tech University":          { city: "St. George", state: "UT", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 12000 },
  "Valley Forge Military College":  { city: "Wayne", state: "PA", ncaaDivision: "NJCAA", schoolType: "Private", enrollment: 300 },
  "Virginia Polytechnic Institute": { city: "Blacksburg", state: "VA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 38000 },
  "Washington University - St. Louis": { city: "St. Louis", state: "MO", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 16000 },
  "Washington and Lee University":  { city: "Lexington", state: "VA", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 2300 },
  "West Chester University":       { city: "West Chester", state: "PA", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 18000 },
  "York College":                  { city: "York", state: "PA", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 4000 },
  // SUNY schools
  "SUNY - Albany":                 { city: "Albany", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 17000 },
  "SUNY - Binghamton":            { city: "Binghamton", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 18000 },
  "SUNY - Brockport":             { city: "Brockport", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7000 },
  "SUNY - Cortland":              { city: "Cortland", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 6500 },
  "SUNY - Fredonia":              { city: "Fredonia", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 4000 },
  "SUNY - Geneseo":               { city: "Geneseo", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 5000 },
  "SUNY - New Paltz":             { city: "New Paltz", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7500 },
  "SUNY - Oneonta":               { city: "Oneonta", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 6000 },
  "SUNY - Oswego":                { city: "Oswego", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7000 },
  "SUNY - Potsdam":               { city: "Potsdam", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 3000 },
  "SUNY - Buffalo State College":  { city: "Buffalo", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7000 },
  "SUNY - Maritime College":       { city: "Throggs Neck", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 1800 },
  // Extra from scraper with slightly different names
  "Millennial Atlantic University": { city: "Doral", state: "FL", ncaaDivision: "NAIA", schoolType: "Private", enrollment: 600 },
  // Batch 2 — additional missing schools
  "Army":                           { city: "West Point", state: "NY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 4400 },
  "Navy":                           { city: "Annapolis", state: "MD", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 4500 },
  "Notre Dame":                     { city: "Notre Dame", state: "IN", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 13000 },
  "Purdue":                         { city: "West Lafayette", state: "IN", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 50000 },
  "Michigan":                       { city: "Ann Arbor", state: "MI", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 48000 },
  "Michigan State":                 { city: "East Lansing", state: "MI", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 50000 },
  "Illinois":                       { city: "Champaign", state: "IL", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 56000 },
  "Indiana":                        { city: "Bloomington", state: "IN", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 47000 },
  "Ohio State":                     { city: "Columbus", state: "OH", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 61000 },
  "Wisconsin":                      { city: "Madison", state: "WI", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 49000 },
  "Baylor University":              { city: "Waco", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 21000 },
  "Drury University":               { city: "Springfield", state: "MO", ncaaDivision: "NCAA D2", schoolType: "Private", enrollment: 5000 },
  "Emory and Henry College":        { city: "Emory", state: "VA", ncaaDivision: "NCAA D2", schoolType: "Private", enrollment: 1200 },
  "John Carroll University":        { city: "University Heights", state: "OH", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 2700 },
  "Kent State University":          { city: "Kent", state: "OH", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 36000 },
  "Longwood University":            { city: "Farmville", state: "VA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 5000 },
  "Mississippi State University":   { city: "Starkville", state: "MS", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 23000 },
  "Mount St. Mary's University":    { city: "Emmitsburg", state: "MD", ncaaDivision: "NCAA D1", schoolType: "Private", enrollment: 2200 },
  "Northern Illinois University":   { city: "DeKalb", state: "IL", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 16000 },
  "Oklahoma State University":      { city: "Stillwater", state: "OK", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 25000 },
  "Taylor University":              { city: "Upland", state: "IN", ncaaDivision: "NAIA", schoolType: "Private", enrollment: 2100 },
  "Texas Tech University":          { city: "Lubbock", state: "TX", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 40000 },
  "The Citadel":                    { city: "Charleston", state: "SC", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 3400 },
  "The College of New Jersey":      { city: "Ewing", state: "NJ", ncaaDivision: "NCAA D3", schoolType: "Public", enrollment: 7400 },
  "Union College":                  { city: "Schenectady", state: "NY", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 2200 },
  "University of Arkansas":         { city: "Fayetteville", state: "AR", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 32000 },
  "University of Georgia":          { city: "Athens", state: "GA", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 41000 },
  "University of New England":      { city: "Biddeford", state: "ME", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 6500 },
  "University of Wyoming":          { city: "Laramie", state: "WY", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 12000 },
  "Ursinus College":                { city: "Collegeville", state: "PA", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 1400 },
  "Utah State University":          { city: "Logan", state: "UT", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 28000 },
  "Wayne State College":            { city: "Wayne", state: "NE", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 3500 },
  "Weber State University":         { city: "Ogden", state: "UT", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 30000 },
  "Wentworth Institute of Technology": { city: "Boston", state: "MA", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 4500 },
  "Wesleyan University":            { city: "Middletown", state: "CT", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 3300 },
  "Western Carolina University":    { city: "Cullowhee", state: "NC", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 12000 },
  "Western Michigan University":    { city: "Kalamazoo", state: "MI", ncaaDivision: "NCAA D1", schoolType: "Public", enrollment: 20000 },
  "Western Oregon University":      { city: "Monmouth", state: "OR", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 4000 },
  "Wheaton College":                { city: "Wheaton", state: "IL", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 2500 },
  "Willamette University":          { city: "Salem", state: "OR", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 2700 },
  "Williams College":               { city: "Williamstown", state: "MA", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 2100 },
  "Winona State University":        { city: "Winona", state: "MN", ncaaDivision: "NCAA D2", schoolType: "Public", enrollment: 7000 },
  "Worcester Polytechnic Institute": { city: "Worcester", state: "MA", ncaaDivision: "NCAA D3", schoolType: "Private", enrollment: 7000 },
};

// Scraper artifacts / junk to skip entirely
const JUNK_PATTERNS = [
  /^\d{4}\s/,                        // "2024 Great Midwest..."
  /\bAll.?Star\b/i,
  /\bAll.?American/i,
  /\bQualifier\b/i,
  /\bHounds\b.*Academy/i,
  /^Explore$/,
  /^Our Teams$/,
  /^See contacts$/,
  /^Team (Compliance|Contacts)/,
  /^Teams\s*\//,
  /^here$/,
  /\balum\b/i,
  /\bearn/i,
  /\bcelebrate/i,
  /\bjoin\b/i,
  /\bform\b.*\bAcademy\b/i,
];

function isJunk(schoolName) {
  if (!schoolName) return true;
  // Multi-school entries (multiple schools crammed together)
  if (schoolName.length > 55 && /\s{2,}/.test(schoolName)) return true;
  // Contains multiple school-like names separated by spaces
  const uniCount = (schoolName.match(/\b(University|College)\b/gi) || []).length;
  if (uniCount > 1) return true;
  // Matches junk patterns
  return JUNK_PATTERNS.some(p => p.test(schoolName));
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const mergedPath = resolve(__dirname, "merged-programs.json");
const merged = JSON.parse(readFileSync(mergedPath, "utf8"));
const mergedKeys = new Set(merged.map(p => `${p.school.toLowerCase()}::${p.gender}`));

// Find the latest scraped file
const scrapedFiles = readdirSync(__dirname)
  .filter(f => f.startsWith("scraped-") && f.endsWith(".json"))
  .sort()
  .reverse();

if (scrapedFiles.length === 0) {
  console.error("No scraped-*.json file found. Run sync.js --scrape-only first.");
  process.exit(1);
}

const scrapedPath = resolve(__dirname, scrapedFiles[0]);
console.log(`Using scraped data from: ${scrapedFiles[0]}`);
const scraped = JSON.parse(readFileSync(scrapedPath, "utf8"));

// Find programs missing from merged
const missing = scraped.filter(p => {
  const key = `${p.school.toLowerCase()}::${p.gender}`;
  return !mergedKeys.has(key) && !isJunk(p.school);
});

console.log(`\nScraped programs: ${scraped.length}`);
console.log(`Already in merged: ${merged.length}`);
console.log(`Missing (after junk filter): ${missing.length}`);

// Enrich missing programs
let enriched = 0;
let noInfo = 0;
const enrichedPrograms = [];
const notFound = new Set();

for (const prog of missing) {
  // Normalize: replace non-breaking spaces and curly quotes
  const normalized = prog.school
    .replace(/\u00A0/g, " ")       // non-breaking space → regular space
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes → straight
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes → straight
    .replace(/\s{2,}/g, " ")        // collapse multiple spaces
    .trim();
  const info = SCHOOL_INFO[normalized] || SCHOOL_INFO[prog.school];
  if (info) {
    const enrichedProg = {
      school: prog.school,
      gender: prog.gender,
      conference: prog.conference || "",
      city: info.city,
      state: info.state,
    };
    if (info.ncaaDivision) enrichedProg.ncaaDivision = info.ncaaDivision;
    if (info.schoolType) enrichedProg.schoolType = info.schoolType;
    if (info.enrollment) enrichedProg.enrollment = info.enrollment;
    enrichedPrograms.push(enrichedProg);
    enriched++;
  } else {
    // Still add it with whatever data we have
    enrichedPrograms.push({ ...prog });
    notFound.add(prog.school);
    noInfo++;
  }
}

console.log(`\nEnriched with full info: ${enriched}`);
console.log(`No info found (added as-is): ${noInfo}`);

if (notFound.size > 0) {
  console.log(`\n⚠ Schools not in SCHOOL_INFO database (${notFound.size}):`);
  [...notFound].sort().forEach(s => console.log(`  - ${s}`));
}

// Preview
console.log(`\n📋 Sample enriched programs:`);
enrichedPrograms.filter(p => SCHOOL_INFO[p.school]).slice(0, 10).forEach(p => {
  console.log(`  ${p.school} (${p.gender}) → ${p.city}, ${p.state} | ${p.conference || "no conf"}`);
});

if (COMMIT || FIRESTORE_ONLY) {
  if (!FIRESTORE_ONLY) {
    // Add to merged-programs.json
    const newMerged = [...merged, ...enrichedPrograms];
    writeFileSync(mergedPath, JSON.stringify(newMerged, null, 2));
    console.log(`\n✅ Updated merged-programs.json: ${merged.length} → ${newMerged.length} programs`);
  }

  // Push to Firestore
  try {
    const { db } = await import("./firebase.js");
    const { syncPrograms } = await import("./firestore-sync.js");
    console.log("\n🔥 Syncing enriched programs to Firestore...");
    await syncPrograms(db, enrichedPrograms, false);
    console.log("✅ Firestore sync complete");
  } catch (err) {
    console.error(`❌ Firestore sync failed: ${err.message}`);
    console.error("   You can run this script locally with --commit to push to Firestore.");
  }
} else {
  console.log(`\n💡 Run with --commit to write changes, or --firestore to only update Firestore.`);
}
