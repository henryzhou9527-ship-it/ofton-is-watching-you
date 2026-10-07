const path = require('node:path');
const output = path.resolve(__dirname, '../dist');
process.chdir(output);
require(path.join(output, 'server/main.js'));
