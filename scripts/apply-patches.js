const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const podfilePath = path.join(__dirname, "../ios/Podfile");
const patchPath = path.join(__dirname, "../patches/Podfile.patch");

console.log("Podfile path:", podfilePath);
console.log("Patch path:", patchPath);

if (fs.existsSync(podfilePath) && fs.existsSync(patchPath)) {
  try {
    console.log("Applying Podfile patch...");
    execSync(`patch -p0 < ${patchPath}`, { stdio: "inherit" });
    console.log("Patch applied successfully!");
  } catch (e) {
    console.log("Patch may already be applied, skipping...");
  }
} else {
  console.log("Podfile or patch file not found, skipping patch.");
}
