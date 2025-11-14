#!/usr/bin/env node
// scripts/build-scripts.js

// 👇 Ignore any unknown CLI flags like "--platform ios" passed by EAS
const args = process.argv.slice(2);
const platformIndex = args.indexOf('--platform');
let platform = 'all';
if (platformIndex !== -1 && args[platformIndex + 1]) {
  platform = args[platformIndex + 1];
}
console.log(`Running build-scripts.js (platform: ${platform})`);

const fs = require('fs');
const path = require('path');

const privacyFilePath = path.resolve(__dirname, 'ios', 'PrivacyInfo.xcprivacy');

// Pre-build: Remove PrivacyInfo.xcprivacy file
console.log('Removing PrivacyInfo.xcprivacy before build...');
if (fs.existsSync(privacyFilePath)) {
  fs.unlinkSync(privacyFilePath);
}

// After running the build process (EAS build will continue)
// Post-build: Remove PrivacyInfo.xcprivacy if it was recreated
console.log('Cleaning up PrivacyInfo.xcprivacy after build...');
if (fs.existsSync(privacyFilePath)) {
  fs.unlinkSync(privacyFilePath);
}

console.log('✅ build-scripts.js completed successfully.');
