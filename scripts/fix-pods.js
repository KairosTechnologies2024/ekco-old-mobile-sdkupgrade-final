const fs = require('fs');
const path = require('path');

const podfilePath = './ios/Podfile';

if (fs.existsSync(podfilePath)) {
  let podfile = fs.readFileSync(podfilePath, 'utf8');
  
  // Add this to disable duplicate PrivacyInfo.xcprivacy warnings
  if (!podfile.includes("install! 'cocoapods', :disable_input_output_paths => true")) {
    podfile = podfile.replace(
      "platform :ios, '11.0'",
      "platform :ios, '11.0'\ninstall! 'cocoapods', :disable_input_output_paths => true"
    );
    fs.writeFileSync(podfilePath, podfile);
    console.log('Patched Podfile to disable duplicate PrivacyInfo warnings');
  }
} else {
  console.log('No Podfile found, skipping patch');
}
