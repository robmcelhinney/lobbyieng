.PHONY: install build-db dev lint typecheck build

install:
	npm ci
	uv sync

build-db:
	uv run python parser.py

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npx tsc --noEmit

build:
	npm run build
