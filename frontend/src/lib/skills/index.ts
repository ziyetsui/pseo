import catalog from './catalog.generated.json';

export type SkillPhase = {
  id: string;
  title: string;
  description: string;
  number: string;
};

export type Skill = {
  id: string;
  title: string;
  description: string;
  phase: string;
  markdown: string;
  installCommand: string;
  agentPrompt: string;
  sourceUrl: string;
};

export const phases: SkillPhase[] = catalog.phases;
export const skills: Skill[] = catalog.skills;
export const ALL_SKILLS_INSTALL_COMMAND = catalog.installCommand;
export const ALL_SKILLS_AGENT_PROMPT = catalog.agentPrompt;
export const SKILLS_ARCHIVE_URL = catalog.archiveUrl;
export const SKILLS_ARCHIVE_SHA256 = catalog.sha256;
