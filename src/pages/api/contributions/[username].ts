import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory cache with TTL
interface CacheEntry {
	data: ContributionData;
	timestamp: number;
	ttl: number;
}

interface ContributionData {
	user: {
		username: string;
		name?: string;
		avatar?: string;
		url: string;
	};
	contributions: ContributionDay[];
	summary: {
		total: number;
		year: number;
	};
	metadata: {
		cached: boolean;
		cached_at?: string;
		fetched_at: string;
	};
}

interface ContributionDay {
	date: string; // YYYY-MM-DD
	count: number;
	level: 'none' | 'low' | 'mid' | 'high'; // intensity level
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const GITHUB_USER_URL = (username: string) => `https://github.com/${username}`;

/**
 * Validates username format (alphanumeric, hyphens, no spaces)
 */
function validateUsername(username: string): boolean {
	if (!username || username.length === 0 || username.length > 39) {
		return false;
	}
	return /^[a-zA-Z0-9-]+$/.test(username);
}

/**
 * Checks if cached entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
	const age = Date.now() - entry.timestamp;
	return age < entry.ttl;
}

/**
 * Retrieves from cache if valid, otherwise returns null
 */
function getFromCache(username: string): ContributionData | null {
	const entry = cache.get(username.toLowerCase());
	if (!entry) return null;

	if (!isCacheValid(entry)) {
		cache.delete(username.toLowerCase());
		return null;
	}

	return entry.data;
}

/**
 * Stores data in cache with TTL
 */
function setCache(username: string, data: ContributionData): void {
	cache.set(username.toLowerCase(), {
		data,
		timestamp: Date.now(),
		ttl: CACHE_TTL,
	});
}

/**
 * Fetches and parses GitHub contribution data from HTML
 */
async function fetchGitHubContributions(username: string): Promise<ContributionData> {
	const profileUrl = GITHUB_USER_URL(username);

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		const response = await fetch(profileUrl, {
			headers: {
				'User-Agent': 'Mona-Mayhem/1.0 (+https://github.com/PesanduJayasinghe/mona-mayhem)',
			},
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (response.status === 404) {
			throw { status: 404, message: `GitHub user "${username}" not found` };
		}

		if (!response.ok) {
			throw { status: response.status, message: `GitHub returned ${response.status}` };
		}

		const html = await response.text();

		// Parse user info from HTML
		const userName = extractUserName(html);
		const avatar = extractAvatar(html, username);

		// Extract contribution data from the calendar graph SVG
		const contributions = extractContributions(html);

		// Validate contributions were parsed
		if (contributions.length === 0) {
			console.warn(`[contributions API] No contribution data parsed for user "${username}" - HTML structure may have changed`);
		}

		const totalContributions = calculateTotal(contributions);
		const year = new Date().getFullYear();

		const data: ContributionData = {
			user: {
				username,
				name: userName || username,
				avatar,
				url: profileUrl,
			},
			contributions,
			summary: {
				total: totalContributions,
				year,
			},
			metadata: {
				cached: false,
				fetched_at: new Date().toISOString(),
			},
		};

		return data;
	} catch (error: any) {
		// Handle abort error (timeout)
		if (error.name === 'AbortError') {
			throw { status: 504, message: 'GitHub request timeout (10s exceeded)' };
		}

		if (error.status) {
			throw error;
		}

		console.error(`[contributions API] Fetch error for user "${username}":`, error.message);
		throw { status: 503, message: 'Failed to fetch GitHub data' };
	}
}

/**
 * Extracts user display name from HTML
 */
function extractUserName(html: string): string | undefined {
	const nameMatch = html.match(/class="p-nickname vcard-username d-block"[^>]*>([^<]+)<\/span>/);
	return nameMatch ? nameMatch[1].trim() : undefined;
}

/**
 * Extracts avatar URL from HTML
 */
function extractAvatar(html: string, username: string): string {
	return `https://avatars.githubusercontent.com/u/${username}?v=4`;
}

/**
 * Parses contribution data from GitHub's contribution graph
 * Looks for rect elements with data-date and data-level attributes
 */
function extractContributions(html: string): ContributionDay[] {
	const contributions: ContributionDay[] = [];

	// Match contribution rect pattern: data-date="YYYY-MM-DD" data-level="..." data-count="N"
	const rectPattern = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="([^"]*)"[^>]*data-count="(\d+)"/g;

	let match;
	while ((match = rectPattern.exec(html)) !== null) {
		const [, date, level, count] = match;
		const normalizedLevel = normalizeLevel(level);

		contributions.push({
			date,
			count: parseInt(count, 10),
			level: normalizedLevel,
		});
	}

	// Sort by date ascending
	contributions.sort((a, b) => a.date.localeCompare(b.date));

	return contributions;
}

/**
 * Normalizes GitHub contribution levels to standard levels
 */
function normalizeLevel(level: string): 'none' | 'low' | 'mid' | 'high' {
	if (!level || level === 'None' || level === '') return 'none';
	if (level === 'L1 Low') return 'low';
	if (level === 'L2 Medium') return 'mid';
	if (level === 'L3 High' || level === 'L4') return 'high';
	return 'none';
}

/**
 * Calculates total contributions from the data
 */
function calculateTotal(contributions: ContributionDay[]): number {
	return contributions.reduce((sum, day) => sum + day.count, 0);
}

/**
 * Formats error response
 */
function errorResponse(status: number, message: string) {
	return new Response(
		JSON.stringify({
			error: message,
			status,
			timestamp: new Date().toISOString(),
		}),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=60',
			},
		}
	);
}

/**
 * Main API handler
 */
export const GET: APIRoute = async ({ params }) => {
	const username = params.username;

	// Validate username format
	if (!validateUsername(username)) {
		return errorResponse(400, `Invalid username format: "${username}". Must be alphanumeric with hyphens, 1-39 characters.`);
	}

	try {
		// Check cache first
		let cachedData = getFromCache(username);
		let data: ContributionData;
		let fromCache = false;

		if (cachedData) {
			fromCache = true;
			// Clone to avoid mutating cached data
			data = JSON.parse(JSON.stringify(cachedData));
			data.metadata.cached = true;
			data.metadata.cached_at = new Date().toISOString();
		} else {
			// Fetch fresh data
			data = await fetchGitHubContributions(username);
			setCache(username, data);
		}

		return new Response(JSON.stringify(data, null, 2), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Cache-Control': fromCache ? 'public, max-age=3600' : 'public, max-age=600',
			},
		});
	} catch (error: any) {
		const status = error.status || 500;
		const message = error.message || 'Internal server error';
		return errorResponse(status, message);
	}
};

/**
 * Handle CORS preflight requests
 */
export const OPTIONS: APIRoute = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '3600',
		},
	});
};
