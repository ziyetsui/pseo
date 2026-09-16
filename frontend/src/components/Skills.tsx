import type { Locale } from '@/lib/catalog/types';
import { skills, phases, ALL_SKILLS_INSTALL_COMMAND, ALL_SKILLS_AGENT_PROMPT, SKILLS_ARCHIVE_URL, type Skill } from '@/lib/skills';
import { SkillsCopy } from './SkillsCopy';
import { SkillsMarkdown } from './SkillsMarkdown';
import '@/styles/skills.css';

function InstallCommand({ command }: { command: string }) {
  return <div className="skills-command">
    <pre tabIndex={0} aria-label="Installation command"><code><span className="skills-command-name">npx</span>{command.startsWith('npx') ? command.slice(3) : command}</code></pre>
    <SkillsCopy text={command} label="Copy install command" iconOnly />
  </div>;
}

function AgentInstructions({ prompt }: { prompt: string }) {
  return <div className="skills-agent-instructions">
    <SkillsCopy text={prompt} label="Copy agent instructions" />
    <details><summary>Read the instructions</summary><pre tabIndex={0}>{prompt}</pre></details>
  </div>;
}

export function SkillsIndex({ locale }: { locale: Locale }) {
  return <main id="main" className="skills-page" lang="en">
    <h1>A skill for every step of programmatic SEO</h1>
    <p className="skills-paragraph skills-lede">Paste this command into your coding agent to install the complete toolkit:</p>
    <InstallCommand command={ALL_SKILLS_INSTALL_COMMAND} />
    <p className="skills-paragraph skills-command-note">Ask your agent to run it in your project, then start <code>/pseo</code> with your website or idea. It reads <code>docs/pseo/project.json</code>, works out which stage you’re in, and calls the next skill. New project? It will help create the project record.</p>
    <AgentInstructions prompt={ALL_SKILLS_AGENT_PROMPT} />
    <p className="skills-install-note">Requires Node.js 22.20.0+ and a coding agent that supports skills. You can also run the command in a terminal, or <a href={SKILLS_ARCHIVE_URL} download>download all skills</a>. Project-specific adapters are marked below.</p>
    <section className="skills-section-heading" aria-labelledby="available-skills">
      <h2 id="available-skills">Available skills <span>{skills.length}</span></h2>
      <p className="skills-paragraph">Grouped by the six phases of the main /pseo table, in the order a real project runs them. Click any skill to see what it does, what it needs, and what it delivers.</p>
    </section>
    <div className="skills-groups">
      {phases.map(phase => <section key={phase.id} aria-labelledby={`skills-phase-${phase.id}`}>
        <h3 className="skills-section-title" id={`skills-phase-${phase.id}`}>{phase.title}</h3>
        <p className="skills-paragraph skills-section-blurb">{phase.description}</p>
        <div className="skills-card">{skills.filter(skill => skill.phase === phase.id).map(skill => <a className="skills-row" key={skill.id} href={`/${locale}/skills/${skill.id}`}>
          <span className="skills-row-body"><span className="skills-row-name">/{skill.id}</span><span className="skills-row-description">{skill.description}</span></span>
        </a>)}</div>
      </section>)}
    </div>
  </main>;
}

export function SkillDetail({ locale, skill }: { locale: Locale; skill: Skill }) {
  const phase = phases.find(item => item.id === skill.phase);
  const related = skills.filter(item => item.phase === skill.phase && item.id !== skill.id);
  return <main id="main" className="skills-page skills-detail" lang="en">
    <a className="skills-back" href={`/${locale}/skills`}>← All skills</a>
    <p className="skills-eyebrow">{phase?.title}</p>
    <h1>/{skill.id}</h1>
    <p className="skills-paragraph skills-lede">{skill.description}</p>
    <InstallCommand command={skill.installCommand} />
    <AgentInstructions prompt={skill.agentPrompt} />
    <p className="skills-install-note">Installs the complete toolkit so related skills are available. Paste the instructions into your coding agent and add your website or project context. <a href={skill.sourceUrl}>Read SKILL.md</a></p>
    <section className="skills-document" aria-labelledby="skill-document-title">
      <h2 id="skill-document-title">The complete skill</h2>
      <p className="skills-install-note">Original instructions in Chinese, with code and technical terms preserved.</p>
      <SkillsMarkdown markdown={skill.markdown} sourceUrl={skill.sourceUrl} />
      <details className="skills-raw-source"><summary>View original Markdown</summary><pre tabIndex={0}>{skill.markdown}</pre></details>
    </section>
    {related.length > 0 && <section className="skills-related" aria-labelledby="related-skills">
      <h2 id="related-skills">In the same phase</h2>
      <div className="skills-card">{related.map(item => <a className="skills-row" key={item.id} href={`/${locale}/skills/${item.id}`}><span className="skills-row-body"><span className="skills-row-name">/{item.id}</span><span className="skills-row-description">{item.description}</span></span></a>)}</div>
    </section>}
  </main>;
}
