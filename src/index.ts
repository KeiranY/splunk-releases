#!/usr/bin/env node

import { program } from 'commander';

program.command('cli variadic...', 'run cli utilities', { executableFile: 'cli.js' });
program.command('api', 'run api server', { executableFile: 'api.js' });
program.parse();
