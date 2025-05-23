/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/wrangler/configuration/
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
import { DBTypes } from './types';

interface FieldRegionCombination {
	field: string;
	region: string;
}

export default {
	async fetch(req) {
		const url = new URL(req.url);

		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '* * * * *');
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler.jsonc's
	// [[triggers]] configuration.
	async scheduled(event, env): Promise<void> {
		console.log(`开始执行定时任务: ${event.cron}`);
		try {
			const aiService = new AIService(env);
			let combinations: FieldRegionCombination[] = [];

			// 尝试从 KV 中读取待检查的组合
			const storedCombinations = await env.KV.get('field-region-to-check');
			if (storedCombinations && storedCombinations !== '[]') {
				combinations = JSON.parse(storedCombinations);
			} else {
				// 如果 KV 中不存在，生成所有可能的组合
				for (const field of Object.keys(fieldMap)) {
					for (const region of Object.keys(regionMap)) {
						combinations.push({ field, region });
					}
				}
				// 随机打乱顺序
				combinations.sort(() => Math.random() - 0.5);
				// 存储到 KV
				await env.KV.put('field-region-to-check', JSON.stringify(combinations));
			}

			// 如果没有待检查的组合，直接返回
			if (combinations.length === 0) {
				console.log('没有待检查的组合');
				return;
			}

			// 持续处理组合，直到列表为空或出错
			while (combinations.length > 0) {
				const currentCombination = combinations[0];
				console.log(`正在抓取领域: ${fieldMap[currentCombination.field as keyof typeof fieldMap]}, 地区: ${regionMap[currentCombination.region as keyof typeof regionMap]}`);

				try {
					// 获取该领域和地区的所有职位ID
					const ids = await allIdsForFieldAndRegion(currentCombination.field, currentCombination.region);
					console.log(`找到 ${ids.length} 个职位`);

					// 删除数据库中已不存在的职位
					const deletedCount = await deleteExpiredJobs(env.DB, ids, currentCombination.field, currentCombination.region);
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
								field: currentCombination.field as keyof typeof fieldMap,
								region: currentCombination.region as keyof typeof regionMap,
								description: jobPosting.description,
								lastApplicationDate: new Date(jobPosting.lastApplicationDate).getTime(),
								...analysisResult,
							};

							// 保存到数据库
							await saveJob(env.DB, job);
						} catch (jobError) {
							console.error(`处理职位 ${id} 时出错:`, jobError);
						}
					}

					// 成功处理完当前组合，从列表中移除
					combinations.shift();
					// 更新 KV 中的组合列表
					await env.KV.put('field-region-to-check', JSON.stringify(combinations));
					console.log(`成功处理组合，剩余 ${combinations.length} 个组合待检查`);

				} catch (error) {
					console.error(`处理组合时出错:`, error);
					// 发生错误时，将剩余组合写回 KV
					await env.KV.put('field-region-to-check', JSON.stringify(combinations));
					console.log(`已将剩余 ${combinations.length} 个组合写回 KV`);
					// 出错时退出循环
					break;
				}
			}

			console.log(`处理完成`);
		} catch (error) {
			console.error(`定时任务执行失败:`, error);
		}
	},
} satisfies ExportedHandler<Env>;
