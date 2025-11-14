const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withPodfilePatch(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const podfilePath = path.join(projectRoot, "ios", "Podfile");

      if (!fs.existsSync(podfilePath)) {
        console.warn("⚠️ Podfile not found, skipping patch.");
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf-8");

      // Ensure platform and install! lines exist
      if (!podfile.includes("platform :ios")) {
        podfile = `platform :ios, '11.0'\ninstall! 'cocoapods', :disable_input_output_paths => true\n\n` + podfile;
      }

      // Pods to add (do NOT include React or React-Core)
      const podsToAdd = [
        "pod 'FirebaseAuth', :modular_headers => true",
        "pod 'FirebaseCore', :modular_headers => true",
        "pod 'Capacitor', :modular_headers => true"
      ];

      // Insert pods inside each target block if not already added
      const targetRegex = /target\s+'[^']+'\s+do([\s\S]*?)end/gm;
      let modified = false;
      podfile = podfile.replace(targetRegex, (match) => {
        let targetBlock = match;
        podsToAdd.forEach(podLine => {
          if (!targetBlock.includes(podLine)) {
            targetBlock = targetBlock.replace(/end\s*$/, `  ${podLine}\nend`);
            console.log(`✅ Added ${podLine} inside target block`);
            modified = true;
          }
        });
        return targetBlock;
      });

      // If no target block was modified, check if we need to append pods at the end
      if (!modified) {
        podsToAdd.forEach(podLine => {
          if (!podfile.includes(podLine)) {
            podfile += `\n${podLine}`;
            console.log(`✅ Added ${podLine} at the end of Podfile`);
          }
        });
      }

      // Patch existing post_install or add a new one
      const patchCode = `
  installer.pods_project.targets.each do |target|
    target.build_phases.each do |phase|
      if phase.respond_to?(:input_file_list_paths)
        phase.input_file_list_paths&.delete_if { |p| p.include?("PrivacyInfo.xcprivacy") }
      end
    end
  end
`;

      // If post_install hook exists, merge the new patch into it
      if (podfile.includes("post_install do |installer|")) {
        // Merge into existing post_install block
        podfile = podfile.replace(
          /post_install do \|installer\|([\s\S]*?)end/,
          (match, body) => {
            if (!body.includes("PrivacyInfo.xcprivacy")) {
              return `post_install do |installer|\n${body}\n${patchCode}\nend`;
            }
            return match; // Already patched
          }
        );
        console.log("✅ Merged PrivacyInfo.xcprivacy fix into existing post_install");
      } else {
        // Append new post_install block if none exists
        podfile += `\npost_install do |installer|\n${patchCode}\nend\n`;
        console.log("✅ Added PrivacyInfo.xcprivacy post_install fix");
      }

      fs.writeFileSync(podfilePath, podfile);
      console.log("✅ Podfile patch complete!");

      return config;
    },
  ]);
}

module.exports = withPodfilePatch;
