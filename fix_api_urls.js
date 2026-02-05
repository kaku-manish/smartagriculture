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

            // Check if file contains localhost:3000
            if (content.includes('http://localhost:3000')) {
                console.log(`Updating ${fullPath}`);

                // 1. Add import if not present (avoid adding to config.js itself)
                if (!fullPath.includes('api\\config.js') && !fullPath.includes('api/config.js')) {
                    if (!content.includes("import API_URL from '@/api/config'")) {
                        content = "import API_URL from '@/api/config';\n" + content;
                    }
                }

                // 2. Replace instances inside quotes (single or double)
                // 'http://localhost:3000/path' -> `${API_URL}/path`
                content = content.replace(/(['"])http:\/\/localhost:3000(.*?)(\1)/g, '`${API_URL}$2`');

                // 3. Replace instances inside backticks
                // `http://localhost:3000/path` -> `${API_URL}/path`
                content = content.replace(/http:\/\/localhost:3000/g, '${API_URL}');

                fs.writeFileSync(fullPath, content);
            }
        }
    });
}

walk(srcDir);
console.log('Done!');
