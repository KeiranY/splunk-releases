#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
commander_1.program.command('cli variadic...', 'run cli utilities', { executableFile: 'cli.js' });
commander_1.program.command('api', 'run api server', { executableFile: 'api.js' });
commander_1.program.parse();
//# sourceMappingURL=index.js.map