# Project skills

These skills are vendored from the local `skills-tools` shelf so the project
keeps the same working rules on any machine. Keep the set small: every skill
adds a line to the model context on every turn.

| Skill | Source | License |
| --- | --- | --- |
| `security-audit` | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | MIT, `LICENSES/cloudflare.txt` |
| `api-and-interface-design` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT, `LICENSES/osmani.txt` |
| `performance-optimization` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT, `LICENSES/osmani.txt` |
| `shipping-and-launch` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT, `LICENSES/osmani.txt` |
| `git-workflow-and-versioning` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT, `LICENSES/osmani.txt` |
| `verification-before-completion` | [obra/superpowers](https://github.com/obra/superpowers) | MIT, `LICENSES/superpowers.txt` |

OpenCode discovers these automatically from `.opencode/skills/`. The project
also has globally installed design, review, testing and debugging skills; this
folder only adds the ones specific to backend, security, performance and
release work.
