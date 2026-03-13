import {normalizeWhitespace, stripAnsi} from '../utils/ansi.js';
import type {ParsedLine, StreamSource} from '../types.js';

interface ParserPreset {
	name: string;
	match: (line: string) => boolean;
	parse: (line: string, source: StreamSource) => ParsedLine | null;
}

export type ParserPreference = 'auto' | 'generic' | 'nextjs' | 'vite';

const stackPattern = /^(\s+at\s.+|\s*Caused by: .+|\s*\.\.\. \d+ more|\s*at .+)/;
const requestPattern =
	/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+|\b(200|201|204|301|302|304|400|401|403|404|409|422|429|500|502|503)\b.+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i;
const buildPattern = /\b(compil|build|bundl|hmr|transform|ready in|rebuilt|optimized)\b/i;
const warningPattern = /\b(warn(?:ing)?|deprecated)\b/i;
const errorPattern = /\b(error|err!|failed|exception)\b/i;
const successPattern = /\b(done|ready|success|compiled successfully|listening|started)\b/i;

const createSignature = (kind: ParsedLine['kind'], line: string): string =>
	`${kind}:${normalizeWhitespace(stripAnsi(line).replaceAll(/\d+ms/g, '<time>').replaceAll(/\b\d+\b/g, '<n>'))}`;

const genericParse = (line: string, source: StreamSource): ParsedLine => {
	const cleanLine = stripAnsi(line);
	const normalized = normalizeWhitespace(cleanLine);
	let kind: ParsedLine['kind'] = 'info';

	if (stackPattern.test(cleanLine)) {
		kind = 'stack';
	} else if (requestPattern.test(cleanLine)) {
		kind = 'request';
	} else if (errorPattern.test(cleanLine) || source === 'stderr') {
		kind = 'error';
	} else if (warningPattern.test(cleanLine)) {
		kind = 'warning';
	} else if (successPattern.test(cleanLine)) {
		kind = 'success';
	} else if (buildPattern.test(cleanLine)) {
		kind = 'build';
	}

	return {
		kind,
		text: cleanLine,
		source,
		parser: 'generic',
		signature: createSignature(kind, normalized || cleanLine)
	};
};

const nextPreset: ParserPreset = {
	name: 'nextjs',
	match: line => /(?:ready - started server|wait - compiling|event - compiled|route \(app\)|route \(pages\))/i.test(line),
	parse: (line, source) => {
		const cleanLine = stripAnsi(line);

		if (/^wait - /i.test(cleanLine)) {
			return {kind: 'build', text: cleanLine, source, parser: 'nextjs', signature: createSignature('build', cleanLine)};
		}

		if (/^(?:ready|event) - /i.test(cleanLine)) {
			const kind = /^ready - /i.test(cleanLine) ? 'success' : 'build';
			return {kind, text: cleanLine, source, parser: 'nextjs', signature: createSignature(kind, cleanLine)};
		}

		if (/^error - /i.test(cleanLine)) {
			return {kind: 'error', text: cleanLine, source, parser: 'nextjs', signature: createSignature('error', cleanLine)};
		}

		return null;
	}
};

const vitePreset: ParserPreset = {
	name: 'vite',
	match: line => /(?:VITE v\d|ready in \d+ ms|Local:|Network:|hmr update|transforming)/i.test(line),
	parse: (line, source) => {
		const cleanLine = stripAnsi(line);

		if (/^VITE v/i.test(cleanLine) || /ready in \d+ ms/i.test(cleanLine)) {
			return {kind: 'success', text: cleanLine, source, parser: 'vite', signature: createSignature('success', cleanLine)};
		}

		if (/(Local:|Network:)/i.test(cleanLine)) {
			return {kind: 'info', text: cleanLine, source, parser: 'vite', signature: createSignature('info', cleanLine)};
		}

		if (/(hmr update|transforming|built in)/i.test(cleanLine)) {
			return {kind: 'build', text: cleanLine, source, parser: 'vite', signature: createSignature('build', cleanLine)};
		}

		return null;
	}
};

const presets = [nextPreset, vitePreset];

export class ParserEngine {
	constructor(private readonly preference: ParserPreference = 'auto') {}

	parse(line: string, source: StreamSource): ParsedLine {
		if (this.preference === 'generic') {
			return genericParse(line, source);
		}

		const activePresets =
			this.preference === 'auto' ? presets : presets.filter(preset => preset.name === this.preference);

		for (const preset of activePresets) {
			if (preset.match(line)) {
				const parsed = preset.parse(line, source);
				if (parsed) {
					return parsed;
				}
			}
		}

		return genericParse(line, source);
	}
}
