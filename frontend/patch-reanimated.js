const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, 'node_modules', 'react-native-reanimated', 'android', 'build.gradle');

console.log('Patching react-native-reanimated build.gradle...');

let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

// Remove externalNativeBuild block for release
const externalNativeBuildRegex = /release\s*\{[\s\S]*?externalNativeBuild[\s\S]*?cmake\s*\{[\s\S]*?\}/g;
buildGradleContent = buildGradleContent.replace(externalNativeBuildRegex, 'release {\n            // Skip native build for release - use precompiled libraries\n        }');

fs.writeFileSync(buildGradlePath, buildGradleContent);

console.log('Patched successfully!');