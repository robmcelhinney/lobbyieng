.PHONY: build-db dev

build-db:
	uv run python parser.py

dev:
	npm run dev
