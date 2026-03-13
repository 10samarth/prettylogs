import {spawn} from 'node:child_process';

import {LineBuffer} from './line-buffer.js';
import {ParserEngine} from '../parsers/parser-engine.js';
import type {LogStore} from '../store/log-store.js';
import type {StreamSource} from '../types.js';
import type {ParserPreference} from '../parsers/parser-engine.js';

export class ProcessRunner {
	private readonly parser: ParserEngine;

	constructor(
		private readonly store: LogStore,
		preference: ParserPreference = 'auto'
	) {
		this.parser = new ParserEngine(preference);
	}

	run(command: string[]): void {
		const [file, ...args] = command;

		if (!file) {
			this.store.setProcessFailure('No target command was provided. Use `prettylogs -- <command>`.');
			return;
		}

		this.store.setProcessStart(command);

		const child = spawn(file, args, {
			stdio: ['inherit', 'pipe', 'pipe'],
			shell: false,
			env: process.env
		});

		const stdoutBuffer = new LineBuffer();
		const stderrBuffer = new LineBuffer();

		child.stdout.on('data', chunk => {
			this.handleChunk(stdoutBuffer, chunk.toString('utf8'), 'stdout');
		});

		child.stderr.on('data', chunk => {
			this.handleChunk(stderrBuffer, chunk.toString('utf8'), 'stderr');
		});

		child.on('error', error => {
			this.store.setProcessFailure(error.message);
		});

		child.on('close', (code, signal) => {
			for (const line of stdoutBuffer.flush()) {
				this.ingestLine(line, 'stdout');
			}

			for (const line of stderrBuffer.flush()) {
				this.ingestLine(line, 'stderr');
			}

			this.store.setProcessExit(code, signal);
		});

		const terminate = (signal: NodeJS.Signals) => {
			if (!child.killed) {
				child.kill(signal);
			}
		};

		process.on('SIGINT', () => terminate('SIGINT'));
		process.on('SIGTERM', () => terminate('SIGTERM'));
	}

	private handleChunk(buffer: LineBuffer, chunk: string, source: StreamSource): void {
		for (const line of buffer.push(chunk)) {
			this.ingestLine(line, source);
		}
	}

	private ingestLine(line: string, source: StreamSource): void {
		if (!line.trim()) {
			return;
		}

		this.store.ingest(this.parser.parse(line, source));
	}
}
