export interface Job {
  id: string;
  region: string;
  field: string;
  description: string;
  visa_sponsor: boolean | null;
  experience: number | null;
  swedish: boolean | 'likely' | null;
  skills: string | null;
  education: string | null;
  lastApplicationDate: number | null;
} 