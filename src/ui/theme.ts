import type {LogKind} from '../types.js';

export const kindColor = (kind: LogKind): string => {
	switch (kind) {
		case 'error': {
			return 'red';
		}
		case 'warning': {
			return 'yellow';
		}
		case 'success': {
			return 'green';
		}
		case 'request': {
			return 'cyan';
		}
		case 'build': {
			return 'magenta';
		}
		case 'stack': {
			return 'gray';
		}
		default: {
			return 'white';
		}
	}
};

export const kindLabel = (kind: LogKind): string => {
	switch (kind) {
		case 'error':
			return 'ERROR';
		case 'warning':
			return 'WARN ';
		case 'success':
			return 'OK   ';
		case 'request':
			return 'HTTP ';
		case 'build':
			return 'BUILD';
		case 'stack':
			return 'STACK';
		default:
			return 'INFO ';
	}
};
