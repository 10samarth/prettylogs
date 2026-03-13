#!/usr/bin/env node
import React from 'react';
import {Command} from 'commander';
import {render} from 'ink';

import type {ParserPreference} from './parsers/parser-engine.js';
import {ProcessRunner} from './process/process-runner.js';
import {LogStore} from './store/log-store.js';
import {App} from './ui/App.js';

const args = process.argv.slice(2);
const separatorIndex = args.indexOf('--');
const cliArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
const commandArgs = separatorIndex === -1 ? [] : args.slice(separatorIndex + 1);

const program = new Command();

program
	.name('prettylogs')
	.description('Wrap an existing dev command and present structured logs in a terminal UI.')
	.allowExcessArguments(false)
	.option('--preset <name>', 'Prefer a parser preset when available', 'auto')
	.helpOption('-h, --help', 'Display help');

program.parse(cliArgs, {from: 'user'});

const store = new LogStore();
const options = program.opts<{preset: ParserPreference}>();
const runner = new ProcessRunner(store, options.preset);

render(<App store={store} />);
runner.run(commandArgs);
