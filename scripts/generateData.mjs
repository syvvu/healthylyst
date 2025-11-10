// ES Module script to generate CSV data files
// Run with: node scripts/generateData.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the generator
const generatorModule = await import('../src/utils/dataGenerator.mjs');
const { generateHealthData } = generatorModule;

// Generate data
const data = generateHealthData('2025-10-10', 30);

const dataDir = path.join(__dirname, '../public/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(path.join(dataDir, 'sleep.csv'), data.sleep);
fs.writeFileSync(path.join(dataDir, 'nutrition.csv'), data.nutrition);
fs.writeFileSync(path.join(dataDir, 'activity.csv'), data.activity);
fs.writeFileSync(path.join(dataDir, 'vitals.csv'), data.vitals);
fs.writeFileSync(path.join(dataDir, 'wellness.csv'), data.wellness);

console.log('✅ CSV files generated successfully!');
console.log(`Sleep: ${data.sleep.split('\n').length - 1} rows`);
console.log(`Nutrition: ${data.nutrition.split('\n').length - 1} rows`);
console.log(`Activity: ${data.activity.split('\n').length - 1} rows`);
console.log(`Vitals: ${data.vitals.split('\n').length - 1} rows`);
console.log(`Wellness: ${data.wellness.split('\n').length - 1} rows`);
