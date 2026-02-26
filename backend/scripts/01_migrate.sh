#!/usr/bin/env bash
set -e
python3 manage.py migrate --noinput
echo "Migrations applied."
