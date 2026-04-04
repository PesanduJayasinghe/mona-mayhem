/**
 * GitHub Contributions API Proxy
 * 
 * Server-side proxy that fetches contribution data from GitHub's .contribs JSON endpoint
 * to bypass CORS restrictions. Implements caching with 1-hour TTL.
 * 
 * Endpoint: GET /api/contributions/[username]
 * Source: https://github.com/{username}.contribs
 */

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
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const GITHUB_CONTRIBS_URL = (username: string) => `https://github.com/${username}.contribs`;
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
 * GitHub .contribs API response structure
 */
interface GitHubContribsResponse {
	schema: string;
	generated_at: string;
	from: string;
	to: string;
	total_contributions: number;
	weeks: Array<{
		first_day: string;
		contribution_days: Array<{
			count: number;
			level: number;
			weekday: number;
		}>;
	}>;
}

/**
 * Fetches GitHub contribution data from the .contribs JSON endpoint
 */
async function fetchGitHubContributions(username: string): Promise<ContributionData> {
	const contribsUrl = GITHUB_CONTRIBS_URL(username);

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		const response = await fetch(contribsUrl, {
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

		const githubData: GitHubContribsResponse = await response.json();

		// Transform GitHub's nested structure into flat array
		const contributions = transformContributions(githubData.weeks);

		// Extract year from the 'to' date
		const year = new Date(githubData.to).getFullYear();

		const data: ContributionData = {
			user: {
				username,
				name: username,
				avatar: `https://avatars.githubusercontent.com/${username}`,
				url: GITHUB_USER_URL(username),
			},
			contributions,
			summary: {
				total: githubData.total_contributions,
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
 * Transforms GitHub's nested weeks structure into a flat array of contribution days
 */
function transformContributions(weeks: GitHubContribsResponse['weeks']): ContributionDay[] {
	const contributions: ContributionDay[] = [];

	for (const week of weeks) {
		const firstDayDate = new Date(week.first_day);

		for (const day of week.contribution_days) {
			// Calculate the date by adding weekday offset to first_day
			const date = new Date(firstDayDate);
			date.setDate(date.getDate() + day.weekday);
			
			contributions.push({
				date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
				count: day.count,
				level: mapLevelToString(day.level),
			});
		}
	}

	// Sort by date ascending
	contributions.sort((a, b) => a.date.localeCompare(b.date));

	return contributions;
}

/**
 * Maps GitHub's numeric levels (0-4) to our string levels
 */
function mapLevelToString(level: number): 'none' | 'low' | 'mid' | 'high' {
	if (level === 0) return 'none';
	if (level === 1) return 'low';
	if (level === 2) return 'mid';
	if (level >= 3) return 'high';
	return 'none';
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
