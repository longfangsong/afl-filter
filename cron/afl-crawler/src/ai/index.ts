import { GenerativeModel, GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { JobPosting } from '../types/index.js';
export class AIService {
	private models: Array<GenerativeModel>;
  private currentIndex: number;

	constructor(env: Env) {
    const tokens = env.GOOGLE_AI_STUDIO_TOKENS.split(',').map(token => token.trim());
		const genAI = tokens.map(token => new GoogleGenerativeAI(token));
    this.models = genAI.map(ai => ai.getGenerativeModel({
      model: 'models/gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            visa_sponsor: { type: SchemaType.BOOLEAN, nullable: true },
            experience: { type: SchemaType.NUMBER, nullable: true },
            swedish: { type: SchemaType.STRING, format: "enum", enum: ["true", "false", "likely", "null"] },
            education: { type: SchemaType.STRING, nullable: true },
            skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['visa_sponsor', 'experience', 'swedish', 'skills', 'education'],
        },
      },
    }));
    this.currentIndex = Math.floor(Math.random() * this.models.length);
	}

	async analyzeJobPosting(jobPosting: JobPosting): Promise<{visa_sponsor: boolean | null, experience: number | null, swedish: boolean | null | "likely", skills: Array<string>, education: string | null}> {
		try {
			const description = jobPosting.description.replace(/<[^>]*>/g, '');

			const extractionPrompt = `
      <system>
        Extract the following information from this job posting:
        1. Does it provide visa sponsorship? (If it explicitly mentioned requiring a working permit or sweden citizenship, it is false; if it is not mentioned, leave it as null)
        2. Minimal required years of experience? (number, if it is not mentioned, leave it as null)
        3. Does it require Swedish language skills? (If it explicitly mentioned requiring Swedish language skills, it is true; else if it just metioned Swedish is merit, it is false; else if the job description is written in Swedish, it is "likely"; else if it is not mentioned, leave it as null)
        4. Which technical skills are required? (list of strings, put required skills in the first place, then merit skills)
        5. Minimal required education. (string, for example "Bachelor", "Master", "PhD", if it is not mentioned, leave it as null)
        Return only a JSON object with these keys, leave the keys empty if the information is not provided: visa_sponsor, experience, swedish, skills, education
      </system>
      <job_posting>
        <languages>
          ${jobPosting.languages
						.filter((language) => language.required)
						.map((language) => `<language>${language.name}</language>`)
						.join('')}
        </languages>
        <work_experiences>
          ${jobPosting.workExperiences
						.filter((experience) => experience.required)
						.map((experience) => `<experience>${experience.name}</experience>`)
						.join('')}
        </work_experiences>
        <description>
          ${description}
        </description>
      </job_posting>`;

			// 添加重试逻辑处理速率限制
			const maxRetries = 32;
			let retryCount = 0;
			let lastError;

			while (retryCount < maxRetries) {
				try {
          const ai = this.models[this.currentIndex];
					const extractionResult = await ai.generateContent(extractionPrompt);
					const response = extractionResult.response;
          console.log(`${jobPosting.id} 使用 ${this.currentIndex} 号模型分析完成`);
					const result = JSON.parse(response.text());
					return {
						...result,
						swedish: result.swedish === "true" ? true : result.swedish === "false" ? false : result.swedish === "likely" ? "likely" : null
					};
				} catch (error) {
					lastError = error;
					// 检查是否是速率限制错误
					if (error instanceof Error && (error.message.includes('rate limit') || error.message.includes('429'))) {
						retryCount++;
            this.currentIndex = (this.currentIndex + 1) % this.models.length;
            console.log(error.message);
						console.log(`遇到速率限制，切换到下一个模型（${this.currentIndex})...`);
            if (error.message.trim().endsWith('}]')) {
              // const delay = 1000;
              // await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.log('未知速率限制，等待60秒...');
              const delay = 60000;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
					} else {
						// 如果不是速率限制错误，直接抛出
						throw error;
					}
				}
			}
			
			// 如果所有重试都失败了
			console.error(`分析职位信息失败，已重试 ${maxRetries} 次:`, lastError);
			throw new Error(`达到最大重试次数 (${maxRetries})，无法分析职位信息`);
		} catch (error) {
			console.error('分析职位信息时出错:', error);
			throw error;
		}
	}
}
