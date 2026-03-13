export class LineBuffer {
	private remainder = '';

	push(chunk: string): string[] {
		const next = `${this.remainder}${chunk}`;
		const parts = next.split(/\r?\n/);
		this.remainder = parts.pop() ?? '';
		return parts;
	}

	flush(): string[] {
		if (!this.remainder) {
			return [];
		}

		const finalLine = this.remainder;
		this.remainder = '';
		return [finalLine];
	}
}
