// Standalone script to generate CSV data files
// Run with: node scripts/generateData.js

const fs = require('fs');
const path = require('path');

// Copy the generator logic here (CommonJS format)
const generateDateRange = (startDate, days) => {
  const dates = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max + 1));

const normalRandom = (mean, stdDev) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getDayOfWeek = (dateStr) => {
  const date = new Date(dateStr);
  return date.getDay();
};

// Import the actual generator (we'll read it and eval it)
const generatorPath = path.join(__dirname, '../src/utils/dataGenerator.js');
const generatorCode = fs.readFileSync(generatorPath, 'utf8');

// Replace export with module.exports
const commonJSCode = generatorCode
  .replace(/export const generateHealthData/g, 'const generateHealthData')
  .replace(/export const saveGeneratedData/g, 'const saveGeneratedData');

// Create a module context
const moduleExports = {};
eval(commonJSCode + '\nmodule.exports = { generateHealthData };');

const { generateHealthData } = moduleExports;

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

