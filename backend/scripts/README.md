# Backend Scripts

This folder contains database setup scripts for ProMag.

## Run order

1. `scripts/01_migrate.sh` creates/updates all tables using Django migrations.
2. `scripts/02_seed_demo.sh` inserts demo records for projects/tasks/milestones/risks.

## Usage (Railway shell or local backend folder)

```bash
bash scripts/01_migrate.sh
bash scripts/02_seed_demo.sh
```
