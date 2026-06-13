const fs = require('fs');
const path = require('path');
const nextDir = path.join(__dirname, 'apps/dashboard/.next');
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('Successfully cleaned .next folder');
} else {
  console.log('.next folder does not exist');
}
