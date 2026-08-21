import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/<div[^>]*>\{[^}]+\}<\/div>/g);
      if (matches) {
        console.log(`\nIn ${fullPath}:`);
        matches.forEach(m => console.log(m));
      }
    }
  }
}
searchDir('src');
