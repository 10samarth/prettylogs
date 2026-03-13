import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';

import type {LogEvent, LogFilter} from '../types.js';
import type {LogStore} from '../store/log-store.js';
import {kindColor, kindLabel} from './theme.js';
import {stripAnsi} from '../utils/ansi.js';

const matchesFilter = (event: LogEvent, filter: LogFilter): boolean => {
	if (filter === 'all') {
		return true;
	}

	return event.kind === filter;
};

const matchesSearch = (event: LogEvent, query: string): boolean => {
	if (!query) {
		return true;
	}

	const haystack = [event.text, ...event.stack].join('\n').toLowerCase();
	return haystack.includes(query.toLowerCase());
};

const truncate = (value: string, width: number): string => {
	if (value.length <= width) {
		return value;
	}

	return `${value.slice(0, Math.max(0, width - 1))}…`;
};

interface AppProps {
	store: LogStore;
}

export const App: React.FC<AppProps> = ({store}) => {
	const {exit} = useApp();
	const [snapshot, setSnapshot] = useState(store.getSnapshot());
	const [filter, setFilter] = useState<LogFilter>('all');
	const [search, setSearch] = useState('');
	const [searchMode, setSearchMode] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const {stdout} = useStdout();
	const stdoutWidth = stdout.columns || 80;
	const stdoutHeight = stdout.rows || 24;

	useEffect(() => {
		const handleChange = (): void => {
			setSnapshot(store.getSnapshot());
		};

		store.on('change', handleChange);
		return () => {
			store.off('change', handleChange);
		};
	}, [store]);

	const visibleEvents = useMemo(
		() => snapshot.events.filter(event => matchesFilter(event, filter) && matchesSearch(event, search)),
		[snapshot.events, filter, search]
	);

	useEffect(() => {
		if (visibleEvents.length === 0) {
			setSelectedIndex(0);
			return;
		}

		setSelectedIndex(current => Math.min(current, visibleEvents.length - 1));
	}, [visibleEvents]);

	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			exit();
			return;
		}

		if (searchMode) {
			if (key.escape) {
				setSearchMode(false);
				return;
			}

			if (key.return) {
				setSearchMode(false);
				return;
			}

			if (key.backspace || key.delete) {
				setSearch(value => value.slice(0, -1));
				return;
			}

			if (!key.ctrl && !key.meta && input) {
				setSearch(value => value + input);
			}

			return;
		}

		if (input === 'q') {
			exit();
			return;
		}

		if (input === 'a') {
			setFilter('all');
			return;
		}

		if (input === 'e') {
			setFilter('error');
			return;
		}

		if (input === 'w') {
			setFilter('warning');
			return;
		}

		if (input === 'r') {
			setFilter('request');
			return;
		}

		if (input === '/') {
			setSearchMode(true);
			return;
		}

		if (key.upArrow || input === 'k') {
			setSelectedIndex(index => Math.max(0, index - 1));
			return;
		}

		if (key.downArrow || input === 'j') {
			setSelectedIndex(index => Math.min(visibleEvents.length - 1, index + 1));
			return;
		}

		if ((input === 'x' || key.return) && visibleEvents[selectedIndex]) {
			store.toggleStack(visibleEvents[selectedIndex].id);
		}
	});

	const statusWidth = Math.max(10, stdoutWidth - 2);
	const listHeight = Math.max(5, stdoutHeight - 4);
	const windowStart = Math.max(0, selectedIndex - listHeight + 1);
	const windowedEvents = visibleEvents.slice(windowStart, windowStart + listHeight);
	const selectedEvent = visibleEvents[selectedIndex];

	return (
		<Box flexDirection="column">
			<Box borderStyle="round" borderColor="cyan" paddingX={1}>
				<Text>
					<Text color="cyan">PrettyLogs</Text>
					<Text> </Text>
					<Text color="gray">{truncate(snapshot.process.command.join(' '), statusWidth - 42)}</Text>
					<Text> </Text>
					<Text color="red">errors {snapshot.errorCount}</Text>
					<Text> </Text>
					<Text color="yellow">warnings {snapshot.warningCount}</Text>
					<Text> </Text>
					<Text color="cyan">requests {snapshot.requestCount}</Text>
					<Text> </Text>
					<Text color={snapshot.process.state === 'running' ? 'green' : 'gray'}>{snapshot.process.state}</Text>
					{snapshot.process.exitCode !== null ? <Text color="gray">{` exit ${snapshot.process.exitCode}`}</Text> : null}
				</Text>
			</Box>

			<Box flexDirection="column" minHeight={listHeight}>
				{windowedEvents.length === 0 ? (
					<Text color="gray">No logs match the current filter.</Text>
				) : (
					windowedEvents.map((event, index) => {
						const actualIndex = windowStart + index;
						const isSelected = actualIndex === selectedIndex;
						const prefix = isSelected ? '›' : ' ';
						const repeat = event.repeatCount > 1 ? ` ×${event.repeatCount}` : '';
						const stackSummary =
							event.stack.length > 0 ? ` ${event.stackCollapsed ? '[stack collapsed]' : '[stack open]'}` : '';

						return (
							<Box key={event.id} flexDirection="column">
								<Text backgroundColor={isSelected ? 'gray' : undefined} color={kindColor(event.kind)}>
									{prefix} {kindLabel(event.kind)} {truncate(stripAnsi(event.text), Math.max(10, stdoutWidth - 14))}
									<Text color="gray">
										{repeat}
										{stackSummary}
									</Text>
								</Text>
								{!event.stackCollapsed &&
									event.stack.map((line, stackIndex) => (
										<Text key={`${event.id}-${stackIndex}`} color="gray">
											{`    ${truncate(stripAnsi(line), Math.max(10, stdoutWidth - 4))}`}
										</Text>
									))}
							</Box>
						);
					})
				)}
			</Box>

			<Box borderStyle="round" borderColor="gray" paddingX={1}>
				<Text color="gray">
					filter [{filter}] search [{search || 'off'}] keys: a all, e errors, w warnings, r requests, / search,
					j/k move, x toggle stack, q quit
				</Text>
			</Box>

			{searchMode ? (
				<Text color="cyan">{`Search: ${search}`}</Text>
			) : selectedEvent?.stack.length ? (
				<Text color="gray">{selectedEvent.stackCollapsed ? 'Press x to expand stack trace.' : 'Press x to collapse stack trace.'}</Text>
			) : null}
		</Box>
	);
};
