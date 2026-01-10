#!/bin/bash
# Script to run the parser on the remote server (45.150.9.229)
# This script should be run from the server, not from local machine

# Configuration
DB_HOST="vedamatch-ragdatabase-cog4dx"
DB_PORT="5432"
DB_USER="raguser"
DB_PASSWORD="krishna1284radha"
DB_NAME="ragdb"

# Set environment variables
export USE_LOCAL_SQLITE=false
export DB_HOST=$DB_HOST
export DB_PORT=$DB_PORT
export DB_USER=$DB_USER
export DB_PASSWORD=$DB_PASSWORD
export DB_NAME=$DB_NAME

# Install Python dependencies if not already installed
pip install -r requirements.txt

# Initialize database
python run_parser.py --init-db

# Parse Bhagavad-gita (both languages)
echo "=== Parsing Bhagavad-gita ==="
python run_parser.py --book bg --lang all

# Uncomment below to parse other scriptures:
# echo "=== Parsing Srimad-Bhagavatam ==="
# python run_parser.py --book sb --lang all

# echo "=== Parsing Caitanya-caritamrita ==="
# python run_parser.py --book cc --lang all

echo "=== Parsing Complete ==="
