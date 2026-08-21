const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src/pages');

// The CSS to append
const cssToAppend = `
/* Enterprise Toast Notification */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 1rem 1.5rem;
  border-left: 4px solid var(--accent-blue);
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.9rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideInRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.toast-notification::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--accent-blue);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

body.light-mode .toast-notification {
  background-color: var(--bg-secondary);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
`;

// Append CSS to index.css
const cssPath = path.join(__dirname, 'src/index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');
if (!cssContent.includes('.toast-notification')) {
  fs.appendFileSync(cssPath, '\n' + cssToAppend);
  console.log('Appended CSS to index.css');
}

// Update files
const files = fs.readdirSync(targetDir);

// The exact string we want to replace
const oldStyleString1 = "style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-blue)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '24px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,102,255,0.3)', zIndex: 9999 }}";
const oldStyleString2 = "style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-green)', color: 'var(--bg-primary)', padding: '0.75rem 1.5rem', borderRadius: '24px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,255,100,0.3)', zIndex: 9999 }}";
const newClassNameString = 'className="toast-notification"';

let updatedCount = 0;

files.forEach(file => {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(targetDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let changed = false;
    if (content.includes(oldStyleString1)) {
      content = content.replace(oldStyleString1, newClassNameString);
      changed = true;
    }
    if (content.includes(oldStyleString2)) {
      content = content.replace(oldStyleString2, newClassNameString);
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${file}`);
      updatedCount++;
    }
  }
});

console.log(`Successfully updated ${updatedCount} files.`);
