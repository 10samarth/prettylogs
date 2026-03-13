const ansiPattern =
	// eslint-disable-next-line no-control-regex
	/[\u001B\u009B][[\]()#;?]*(?:(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])|(?:[^\u0007]*\u0007))/g;

export const stripAnsi = (value: string): string => value.replaceAll(ansiPattern, '');

export const normalizeWhitespace = (value: string): string => value.replaceAll(/\s+/g, ' ').trim();
