import {EventEmitter} from 'node:events';

import type {LogEvent, LogSnapshot, ParsedLine, ProcessStatus} from '../types.js';

const createInitialProcess = (): ProcessStatus => ({
	state: 'idle',
	command: [],
	exitCode: null,
	signal: null
});

export class LogStore extends EventEmitter {
	private nextId = 1;
	private events: LogEvent[] = [];
	private errorCount = 0;
	private warningCount = 0;
	private requestCount = 0;
	private buildCount = 0;
	private process: ProcessStatus = createInitialProcess();

	setProcessStart(command: string[]): void {
		this.process = {
			state: 'running',
			command,
			exitCode: null,
			signal: null
		};
		this.emitChange();
	}

	setProcessExit(exitCode: number | null, signal: NodeJS.Signals | null): void {
		this.process = {
			...this.process,
			state: 'exited',
			exitCode,
			signal
		};
		this.emitChange();
	}

	setProcessFailure(message: string): void {
		this.process = {
			...this.process,
			state: 'failed'
		};
		this.ingest({
			kind: 'error',
			text: message,
			source: 'system',
			parser: 'system',
			signature: `error:${message}`
		});
	}

	ingest(parsed: ParsedLine): void {
		if (parsed.kind === 'stack') {
			this.attachStack(parsed.text);
			return;
		}

		const lastEvent = this.events.at(-1);
		if (
			lastEvent &&
			(parsed.kind === 'error' || parsed.kind === 'warning') &&
			lastEvent.signature === parsed.signature &&
			lastEvent.kind === parsed.kind
		) {
			lastEvent.repeatCount += 1;
			lastEvent.timestamp = Date.now();
			this.emitChange();
			return;
		}

		const event: LogEvent = {
			id: this.nextId++,
			kind: parsed.kind,
			text: parsed.text,
			source: parsed.source,
			parser: parsed.parser,
			timestamp: Date.now(),
			repeatCount: 1,
			stack: [],
			stackCollapsed: true,
			signature: parsed.signature ?? `${parsed.kind}:${parsed.text}`
		};

		this.events.push(event);
		this.incrementCounts(parsed.kind);
		this.emitChange();
	}

	getSnapshot(): LogSnapshot {
		return {
			events: [...this.events],
			errorCount: this.errorCount,
			warningCount: this.warningCount,
			requestCount: this.requestCount,
			buildCount: this.buildCount,
			process: this.process
		};
	}

	toggleStack(id: number): void {
		const event = this.events.find(item => item.id === id);
		if (!event || event.stack.length === 0) {
			return;
		}

		event.stackCollapsed = !event.stackCollapsed;
		this.emitChange();
	}

	private attachStack(line: string): void {
		const lastEvent = this.events.at(-1);

		if (!lastEvent) {
			this.events.push({
				id: this.nextId++,
				kind: 'stack',
				text: line,
				source: 'stderr',
				parser: 'generic',
				timestamp: Date.now(),
				repeatCount: 1,
				stack: [line],
				stackCollapsed: true,
				signature: `stack:${line}`
			});
			this.emitChange();
			return;
		}

		lastEvent.stack.push(line);
		this.emitChange();
	}

	private incrementCounts(kind: ParsedLine['kind']): void {
		if (kind === 'error') {
			this.errorCount += 1;
		}

		if (kind === 'warning') {
			this.warningCount += 1;
		}

		if (kind === 'request') {
			this.requestCount += 1;
		}

		if (kind === 'build') {
			this.buildCount += 1;
		}
	}

	private emitChange(): void {
		this.emit('change');
	}
}
