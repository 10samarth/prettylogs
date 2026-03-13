export type StreamSource = 'stdout' | 'stderr' | 'system';

export type LogKind =
	| 'info'
	| 'warning'
	| 'error'
	| 'success'
	| 'request'
	| 'build'
	| 'stack';

export type LogFilter = 'all' | 'error' | 'warning' | 'request';

export interface ParsedLine {
	kind: LogKind;
	text: string;
	source: StreamSource;
	parser: string;
	signature?: string;
}

export interface LogEvent {
	id: number;
	kind: LogKind;
	text: string;
	source: StreamSource;
	parser: string;
	timestamp: number;
	repeatCount: number;
	stack: string[];
	stackCollapsed: boolean;
	signature: string;
}

export interface ProcessStatus {
	state: 'idle' | 'running' | 'exited' | 'failed';
	command: string[];
	exitCode: number | null;
	signal: NodeJS.Signals | null;
}

export interface LogSnapshot {
	events: LogEvent[];
	errorCount: number;
	warningCount: number;
	requestCount: number;
	buildCount: number;
	process: ProcessStatus;
}
