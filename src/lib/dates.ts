const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	second: 'numeric',
	timeZoneName: 'short',
});
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
});
const dateUtcFormatter = new Intl.DateTimeFormat('en-CA', {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC',
});
export function formatDate(isoString: string | null | undefined, utc = false): string {
	if (isoString == null) return '?';
	const date = new Date(isoString);
	if (isNaN(date.valueOf())) return '?';
	return utc ? dateUtcFormatter.format(date) : dateFormatter.format(date);
}

export function formatDateTime(isoString: string | null | undefined): string {
	if (isoString == null) return '?';
	const date = new Date(isoString);
	if (isNaN(date.valueOf())) return '?';
	return dateTimeFormatter.format(date);
}
