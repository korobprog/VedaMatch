const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'node_modules', 'react-native-maps', 'android', 'src', 'main', 'java', 'com', 'facebook', 'react', 'viewmanagers');

if (!fs.existsSync(dir)) {
    console.error('Directory not found:', dir);
    process.exit(1);
}

const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('ManagerInterface.java')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Remove import
        content = content.replace(/import com\.facebook\.react\.uimanager\.ViewManagerWithGeneratedInterface;\s*/g, '');

        // Remove extends
        content = content.replace(/ extends ViewManagerWithGeneratedInterface/g, '');

        fs.writeFileSync(filePath, content);
        console.log('Patched:', file);
    }
});
