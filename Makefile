.PHONY: autonomy.run autonomy.help
autonomy.run:
	gh workflow run autonomous-agent-loop.yml -f agent_name=$(agent) -f max_issues=$(max_issues)
autonomy.help:
	@echo "make autonomy.run agent=codex max_issues=3"
