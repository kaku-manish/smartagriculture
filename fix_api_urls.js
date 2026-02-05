const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('http://localhost:3000')) {
                console.log(`Updating ${fullPath}`);

                // Add import if not present
                if (!content.includes("import API_URL from '@/api/config'")) {
                    content = "import API_URL from '@/api/config';\n" + content;
                }

                // Replace URL
                content = content.replace(/['"]http:\/\/localhost:3000(.*?)['"]/g, '`${API_URL}$1`');

                fs.writeFileSync(fullPath, content);
            }
        }
    });
}

walk(srcDir);
console.log('Done!');
