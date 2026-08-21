.PHONY: setup dev build start clean help

# Default target
help:
	@echo "TrialGPT Minimal Setup & Execution Chain"
	@echo "----------------------------------------"
	@echo "make setup  - Install all backend and frontend dependencies"
	@echo "make dev    - Run the backend and frontend in development mode"
	@echo "make build  - Build the frontend for production"
	@echo "make start  - Run the backend serving the production frontend"
	@echo "make clean  - Remove caches, virtual environments, and build artifacts"

setup:
	@echo "=> Setting up Python Virtual Environment..."
	python3 -m venv venv
	@echo "=> Installing Python Dependencies (CPU version to prevent stalling)..."
	. venv/bin/activate && pip install --upgrade pip && pip install torch --extra-index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt
	@echo "=> Installing Frontend Dependencies..."
	cd ui && pnpm install
	@echo "=> Setup Complete! You can now run 'make dev' to start the application."

dev:
	@echo "=> Starting FastAPI Backend and Vite Frontend concurrently..."
	@# We use trap to kill background processes when the user presses Ctrl+C
	bash -c "trap 'kill 0' SIGINT; . venv/bin/activate && uvicorn api.main:app --reload --port 8000 & cd ui && pnpm run dev & wait"

build:
	@echo "=> Building Vite Frontend for Production..."
	cd ui && pnpm run build
	@echo "=> Build Complete! Frontend static files are in ui/dist/"

start:
	@echo "=> Starting Production Server..."
	. venv/bin/activate && uvicorn api.main:app --host 0.0.0.0 --port 8000

clean:
	@echo "=> Cleaning up artifacts..."
	rm -rf venv
	rm -rf ui/node_modules
	rm -rf ui/dist
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "=> Clean Complete!"
