import * as XLSX from 'xlsx';
import type { Topic } from '../hooks/useTopics';
import { detectPageType, detectSearchIntent, searchIntentDisplayLabel } from './seoUtils';

function searchIntentFromKeyword(keyword: string): string {
	return searchIntentDisplayLabel(detectSearchIntent(keyword));
}

function authorityFitLabel(fit: Topic['authorityFit']): string {
	if (fit === 'achievable') return 'Start Now';
	if (fit === 'buildToward') return 'Build Toward';
	return 'Long-Term';
}

function funnelStageLabel(funnel: Topic['funnel']): string {
	const map: Record<Topic['funnel'], string> = {
		tofu: 'ToFu',
		mofu: 'MoFu',
		bofu: 'BoFu'
	};
	return map[funnel] ?? funnel;
}

function slugifyFilenamePart(s: string): string {
	return s.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'export';
}

export function buildExportFilenameBase(params: {
	siteName: string;
	targetName: string;
}): string {
	const site = slugifyFilenamePart(params.siteName);
	const target = slugifyFilenamePart(params.targetName);
	const day = new Date().toISOString().slice(0, 10);
	return `strategy-${site}-${target}-${day}`;
}

function csvEscapeCell(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return '""';
	const s = String(value);
	if (/[",\r\n]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return `"${s}"`;
}

function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
	const lines = [headers.map(csvEscapeCell).join(',')];
	for (const row of rows) {
		lines.push(row.map((c) => csvEscapeCell(c)).join(','));
	}
	return lines.join('\r\n');
}

export function downloadStrategyCsv(params: {
	topics: Topic[];
	siteName: string;
	targetName: string;
	filterLabel: string;
}): void {
	const { topics, siteName, targetName, filterLabel } = params;
	if (topics.length === 0) return;

	const headers = [
		'Priority',
		'Topic title',
		'Primary keyword',
		'AI reasoning',
		'Page type',
		'Intent',
		'Monthly searches (US)',
		'Difficulty',
		'CPC (USD)',
		'KGR score',
		'Authority fit',
		'Topic status',
		'Cluster ID'
	];

	const rows = topics.map((t) => [
		t.priority,
		t.title,
		t.keyword,
		t.reasoning,
		detectPageType(t.keyword),
		searchIntentFromKeyword(t.keyword),
		t.volume,
		t.kd,
		Number(t.cpc.toFixed(4)),
		t.kgrScore != null ? String(t.kgrScore) : '',
		authorityFitLabel(t.authorityFit),
		t.status,
		t.clusterId ?? ''
	]);

	const csvBody = rowsToCsv(headers, rows as (string | number)[][]);
	const metaCsv =
		`"Site","${siteName.replace(/"/g, '""')}"\r\n` +
		`"Target","${targetName.replace(/"/g, '""')}"\r\n` +
		`"Filter","${filterLabel.replace(/"/g, '""')}"\r\n` +
		`"Exported (UTC)","${new Date().toISOString()}"\r\n` +
		`\r\n` +
		csvBody;

	const blob = new Blob(['\uFEFF' + metaCsv], { type: 'text/csv;charset=utf-8' });
	const base = buildExportFilenameBase({ siteName, targetName });
	triggerDownload(blob, `${base}.csv`);
}

function aoaToSheet(data: (string | number)[][]) {
	return XLSX.utils.aoa_to_sheet(data);
}

export function downloadStrategyXlsx(params: {
	topics: Topic[];
	siteName: string;
	targetName: string;
	filterLabel: string;
}): void {
	const { topics, siteName, targetName, filterLabel } = params;
	if (topics.length === 0) return;

	const wb = XLSX.utils.book_new();

	const metaRows: (string | number)[][] = [
		['Site', siteName],
		['Target', targetName],
		['Filter', filterLabel],
		['Exported (UTC)', new Date().toISOString()],
		['Topics exported', topics.length]
	];
	XLSX.utils.book_append_sheet(wb, aoaToSheet(metaRows), 'Export info');

	const combinedHeaders = [
		'Priority',
		'Topic title',
		'Primary keyword',
		'AI reasoning',
		'Page type',
		'Intent',
		'Monthly searches (US)',
		'Difficulty',
		'CPC (USD)',
		'KGR score',
		'Authority fit',
		'Topic status',
		'Cluster ID'
	];
	const combinedRows: (string | number)[][] = [
		combinedHeaders,
		...topics.map((t) => [
			t.priority,
			t.title,
			t.keyword,
			t.reasoning,
			detectPageType(t.keyword),
			searchIntentFromKeyword(t.keyword),
			t.volume,
			t.kd,
			Number(t.cpc.toFixed(4)),
			t.kgrScore != null ? t.kgrScore : '',
			authorityFitLabel(t.authorityFit),
			t.status,
			t.clusterId ?? ''
		])
	];
	XLSX.utils.book_append_sheet(wb, aoaToSheet(combinedRows), 'Combined');

	const topicsHeaders = [
		'Priority',
		'Topic title',
		'AI reasoning',
		'Funnel stage',
		'Monthly searches (US)',
		'Difficulty',
		'CPC (USD)',
		'Authority fit',
		'Topic status',
		'Cluster ID'
	];
	const topicsRows: (string | number)[][] = [
		topicsHeaders,
		...topics.map((t) => [
			t.priority,
			t.title,
			t.reasoning,
			funnelStageLabel(t.funnel),
			t.volume,
			t.kd,
			Number(t.cpc.toFixed(4)),
			authorityFitLabel(t.authorityFit),
			t.status,
			t.clusterId ?? ''
		])
	];
	XLSX.utils.book_append_sheet(wb, aoaToSheet(topicsRows), 'Topics view');

	const kwHeaders = [
		'Keyword',
		'Topic title',
		'Page type',
		'Monthly searches (US)',
		'Competition',
		'Intent',
		'Authority fit',
		'Topic status'
	];
	const kwRows: (string | number)[][] = [
		kwHeaders,
		...topics.map((t) => [
			t.keyword,
			t.title,
			detectPageType(t.keyword),
			t.volume,
			t.kd,
			searchIntentFromKeyword(t.keyword),
			authorityFitLabel(t.authorityFit),
			t.status
		])
	];
	XLSX.utils.book_append_sheet(wb, aoaToSheet(kwRows), 'Keywords view');

	const base = buildExportFilenameBase({ siteName, targetName });
	XLSX.writeFile(wb, `${base}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
