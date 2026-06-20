.PHONY: verify version.bump autonomy.run autonomy.help
verify:
	npm run verify

version.bump:
	npm run version:bump -- $(bump)

autonomy.run:
	gh workflow run autonomous-agent-loop.yml -f agent_name=$(agent) -f max_issues=$(max_issues)
autonomy.help:
	@echo "make autonomy.run agent=codex max_issues=3"
	@echo "make verify"
	@echo "make version.bump bump=patch"
