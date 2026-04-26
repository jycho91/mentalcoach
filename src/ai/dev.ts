import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-regulation-revision-flow.ts';
import '@/ai/flows/generate-regulation-draft-flow.ts';
import '@/ai/flows/answer-compliance-question.ts';