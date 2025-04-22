import { DBTypes } from '../types';

export async function isNewJob(db: D1Database, id: string) {
	const result = await db.prepare('SELECT COUNT(*) as count FROM Job WHERE id = ?').bind(id).first<{ count: number }>();
	return result?.count === 0;
}

export async function findNewJobs(db: D1Database, ids: Array<string>): Promise<Array<string>> {
	if (!ids || ids.length === 0) {
		return [];
	}
	
	const BATCH_SIZE = 100;
	const existingIds = new Set<string>();
	
	for (let i = 0; i < ids.length; i += BATCH_SIZE) {
		const batchIds = ids.slice(i, i + BATCH_SIZE);
		const placeholders = batchIds.map(() => '?').join(',');
		const sql = `SELECT id FROM Job WHERE id IN (${placeholders})`;
		const stmt = db.prepare(sql).bind(...batchIds);
		const result = await stmt.all<{ id: string }>();
		
		result.results.forEach(row => existingIds.add(row.id));
	}
	const newJobIds = ids.filter(id => !existingIds.has(id));
	
	return newJobIds;
}

export async function saveJob(db: D1Database, job: DBTypes.Job) {
	await db
		.prepare(
			'INSERT INTO Job (id, region, field, description, visa_sponsor, experience, swedish, skills, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(job.id, job.region, job.field, job.description, job.visa_sponsor, job.experience, job.swedish, job.skills.join(','), job.education)
		.run();
}

export async function deleteExpiredJobs(db: D1Database, currentIds: Array<string>, field: string, region: string): Promise<number> {
	if (!currentIds || currentIds.length === 0) {
		return 0;
	}
	
	const BATCH_SIZE = 100;
	
	// 首先获取该领域和地区的所有职位ID
	const allJobs = await db.prepare('SELECT id FROM Job WHERE field = ? AND region = ?')
		.bind(field, region)
		.all<{ id: string }>();
	
	const existingIds = new Set(currentIds);
	const jobsToDelete = allJobs.results.filter(job => !existingIds.has(job.id));
	
	// 批量删除过期职位
	for (let i = 0; i < jobsToDelete.length; i += BATCH_SIZE) {
		const batch = jobsToDelete.slice(i, i + BATCH_SIZE);
		const placeholders = batch.map(() => '?').join(',');
		const sql = `DELETE FROM Job WHERE id IN (${placeholders})`;
		await db.prepare(sql).bind(...batch.map(job => job.id)).run();
	}

	return jobsToDelete.length;
}
