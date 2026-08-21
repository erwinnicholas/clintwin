import fs from 'fs';
const content = fs.readFileSync('src/pages/Patients.jsx', 'utf8');
const imports = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/)[1].split(',').map(s => s.trim());
console.log("Lucide imports:", imports);
let found = false;
imports.forEach(icon => {
  const regex = new RegExp(`\\{${icon}\\}`, 'g');
  if (regex.test(content)) {
    console.log(`Found \{${icon}\} in Patients.jsx!`);
    found = true;
  }
});
if (!found) console.log("No uninstantiated icons found in Patients.jsx");

const dashContent = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
const dashImports = dashContent.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/)[1].split(',').map(s => s.trim());
console.log("Dashboard Lucide imports:", dashImports);
dashImports.forEach(icon => {
  const regex = new RegExp(`\\{${icon}\\}`, 'g');
  if (regex.test(dashContent)) {
    console.log(`Found \{${icon}\} in Dashboard.jsx!`);
  }
});
