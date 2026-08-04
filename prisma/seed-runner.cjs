process.env.TS_NODE_PROJECT = 'tsconfig.seed.json';
require('ts-node/register/transpile-only');
require('./seed.ts');
