import { JobPosting, SearchResponse } from '../types/index.js';

const myHeaders = new Headers();
myHeaders.append('Content-Type', 'application/json');

async function searchOnce(field: string, region: string, startIndex: number, maxRecords: number): Promise<SearchResponse> {
	const raw = JSON.stringify({
		filters: [
			{
				type: 'occupationField',
				value: field,
			},
			{
				type: 'region',
				value: region,
			},
		],
		fromDate: null,
		order: 'relevance',
		maxRecords: maxRecords,
		startIndex: startIndex,
		toDate: new Date().toISOString(),
		source: 'pb',
	});

	const requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
	};

	const response = await fetch('https://platsbanken-api.arbetsformedlingen.se/jobs/v1/search', requestOptions);
	const data = await response.json<SearchResponse>();
	return data;
}

export async function allIdsForFieldAndRegion(field: string, region: string): Promise<string[]> {
	const result: string[] = [];
	const response = await searchOnce(field, region, 0, 100);
	result.push(...response.ads.map((ad) => ad.id));
	const pages = Math.ceil(response.numberOfAds / 100);
	for (let i = 1; i < pages; i++) {
		const response = await searchOnce(field, region, i * 100, 100);
		result.push(...response.ads.map((ad) => ad.id));
	}
	return result;
}

export async function getJobPosting(id: string): Promise<JobPosting> {
	const response = await fetch(`https://platsbanken-api.arbetsformedlingen.se/jobs/v1/job/${id}`);
	const data = await response.json<JobPosting>();
	return data;
}
