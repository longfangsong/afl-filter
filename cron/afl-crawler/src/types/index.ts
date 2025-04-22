import { regionMap, fieldMap } from '../data';

export namespace DBTypes {
  export interface Job {
    id: string;
    field: keyof typeof fieldMap;
    region: keyof typeof regionMap;
    description: string; 
    // created_at: string;
    visa_sponsor: boolean | null;
    experience: number | null;
    swedish: boolean | null | "likely";
    skills: Array<string>;
    education: string | null;
    lastApplicationDate: number | null;
  }
}


export interface SearchResponse {
  ads: Array<{id: string}>;
  numberOfAds: number;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  languages: Array<{name: string, required: boolean}>;
  workExperiences: Array<{name: string, required: boolean}>;
  lastApplicationDate: string;
  application: {
    webAddress: string;
  };
}

export interface OllamaChatResponse {
	model: string;
	created_at: string;
	message: {
		role: string;
		content: string;
	};
	done: boolean;
}
