/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your Worker in action
 * - Run `npm run deploy` to publish your Worker
 *
 * Bind resources to your Worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { allIdsForFieldAndRegion, getJobPosting } from './crawler/index';
import { AIService } from './ai/index';
import { findNewJobs, saveJob, deleteExpiredJobs } from './db/index';
import { fieldMap, regionMap } from './data';
import { DBTypes, OllamaChatResponse } from './types';

export default {
	async fetch(req, env, ctx) {
		const url = new URL(req.url);

		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '* * * * *');
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler.jsonc's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx): Promise<void> {
		// 导入所需的模块
		console.log(`开始执行定时任务: ${event.cron}`);

		try {
			const aiService = new AIService(env);
			// 生成所有可能的领域和地区组合
			const combinations = [];
			for (const field of Object.keys(fieldMap)) {
				for (const region of Object.keys(regionMap)) {
					combinations.push({ field, region });
				}
			}

			// 随机选择20个组合
			const selectedCombinations = combinations
				.sort(() => Math.random() - 0.5)
				.slice(0, 25);

			// 处理选中的组合
			for (const { field, region } of selectedCombinations) {
				console.log(`正在抓取领域: ${fieldMap[field as keyof typeof fieldMap]}, 地区: ${regionMap[region as keyof typeof regionMap]}`);

				// 获取该领域和地区的所有职位ID
				const ids = await allIdsForFieldAndRegion(field, region);
				console.log(`找到 ${ids.length} 个职位`);

				// 删除数据库中已不存在的职位
				const deletedCount = await deleteExpiredJobs(env.DB, ids, field, region);
				console.log(`已删除 ${deletedCount} 个过期的职位`);

				// 查找数据库中不存在的新职位
				const newJobIds = await findNewJobs(env.DB, ids);
				console.log(`其中 ${newJobIds.length} 个是新职位`);

				// 处理每个新职位
				for (const id of newJobIds) {
					try {
						// 获取职位详情
						const jobPosting = await getJobPosting(id);

						// 使用AI分析职位
						const analysisResult = await aiService.analyzeJobPosting(jobPosting);
						// 创建职位记录
						const job: DBTypes.Job = {
							id: jobPosting.id,
							field: field as keyof typeof fieldMap,
							region: region as keyof typeof regionMap,
							description: jobPosting.description,
							lastApplicationDate: new Date(jobPosting.lastApplicationDate).getTime(),
							...analysisResult,
						};

						// 保存到数据库
						await saveJob(env.DB, job);
						// console.log(`已保存职位: ${jobPosting.id}`);
					} catch (jobError) {
						console.error(`处理职位 ${id} 时出错:`, jobError);
					}
				}
			}

			console.log(`定时任务完成`);
		} catch (error) {
			console.error(`定时任务执行失败:`, error);
		}
	},
} satisfies ExportedHandler<Env>;
