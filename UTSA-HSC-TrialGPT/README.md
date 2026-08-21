# UTSA-HSC-TrialGPT  
Locally Deployed Eligibility Evidence Extraction Framework

## Overview
UTSA-HSC-TrialGPT is a re-engineered adaptation of the NCI's TrialGPT work: Jin, Q., Wang, Z., Floudas, C.S. et al. Matching patients to clinical trials with large language models. Nat Commun 15, 9074 (2024). https://doi.org/10.1038/s41467-024-53081-z. 
This system adapts the TrialGPT reasoning approach to perform automated extraction of clinical trial eligibility evidence from EHR notes using locally deployed large language models (LLMs) or APIs for use inside protected health information (PHI) environments.

The system is designed to support clinical trial sites by extracting eligibility-relevant evidence from local EHR-derived documentation for specific studies, enabling accurate and efficient screening workflows.

## Minimum Requirements
No Docker or complex container orchestration is required. You only need:
- **Python 3.11+**
- **Node.js 20+**
- **pnpm** (`npm install -g pnpm`)
- **GNU Make** (Standard on Linux/Mac)

## Quickstart & Commands

We have configured a unified `Makefile` for the simplest possible setup and execution chain. Run these commands from the root directory:

### 1. Initial Setup
```bash
make setup
```
*What it does: Creates a local Python virtual environment (`venv`), installs all backend packages from `requirements.txt`, and installs frontend TypeScript dependencies via `pnpm`.*

### 2. Development Mode (Recommended for Hackathon Iteration)
```bash
make dev
```
*What it does: Starts both the FastAPI backend and the Vite frontend dev server concurrently. It enables hot-reloading for UI changes. The UI will be accessible at `http://localhost:5173`, proxying API requests to the backend.*

### 3. Production Build
```bash
make build
```
*What it does: Compiles the TypeScript frontend into highly optimized static HTML/JS/CSS assets placed in `ui/dist/`.*

### 4. Production Run
```bash
make start
```
*What it does: Starts the FastAPI backend on port 8000, serving the REST APIs and statically serving the `ui/dist/` production frontend.*

### 5. Cleanup Workspace
```bash
make clean
```
*What it does: Safely removes `venv`, `node_modules`, `dist`, and Python caches.*

## Directory Structure

```text
UTSA-HSC-TrialGPT/
│
├── api/                   # FastAPI backend implementation
│   ├── main.py            # Primary entry point & static file server
│   ├── routers/           # REST endpoints (patients, trials, pipeline, explain)
│   └── services/          # Business logic & LLM connection adapters
│
├── core/                  # Core domain logic
│   ├── schemas.py         # Strict Pydantic models for type safety
│   ├── ingestion_engine.py# Document ingestion & pipeline tools
│   └── twin_builder.py    # Generates structured 'Digital Twins' of patients
│
├── ui/                    # Frontend UI application
│   ├── index.html         # Main HTML entrypoint
│   ├── vite.config.ts     # Vite build and proxy configuration
│   └── src/               # TypeScript frontend code
│       ├── main.ts        # Application orchestrator
│       ├── api.ts         # Strictly typed API client wrapper
│       └── views/         # Dashboard & Patient sub-views
│
├── generators/            # Python scripts for creating synthetic Hackathon data
│   ├── gen_1_baseline.py
│   └── gen_2_longitudinal.py
│
├── data/                  # SQLite DBs and JSON outputs
├── Makefile               # Unified execution entry point
├── requirements.txt       # Python dependencies
└── .gitignore             # Standard git rules for Python & Node
```

## Data Privacy Notice
This repository contains only non-PHI source code and synthetic or illustrative example files. No protected health information (PHI), identifiable patient data, or confidential institutional information is stored or distributed through this repository.
