"""
Seed script to create initial Super Admin and Station Admin for development
Usage: python seed_admin.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Requires: pip install bcrypt asyncpg

try:
    import bcrypt
except ImportError:
    print("Install bcrypt: pip install bcrypt")
    sys.exit(1)

# Copy .env from backend
import subprocess

DEFAULT_ADMIN_EMAIL = "admin@station.gov.in"
DEFAULT_ADMIN_PASSWORD = "Admin@123"
DEFAULT_ADMIN_NAME = "Station Administrator"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()

print("=" * 60)
print("REVA AI — Admin Seed Script")
print("=" * 60)
print()
print(f"Default admin credentials for development:")
print(f"  Email:    {DEFAULT_ADMIN_EMAIL}")
print(f"  Password: {DEFAULT_ADMIN_PASSWORD}")
print()
print("Password hash:")
print(hash_password(DEFAULT_ADMIN_PASSWORD))
print()
print("To create admin, run this SQL after migrating your database:")
print("""
-- First get your station ID:
SELECT id FROM police_stations LIMIT 1;

-- Then create admin (replace <STATION_ID> and <HASH>):
INSERT INTO police_users (id, station_id, name, email, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  '<STATION_ID>',
  'Station Administrator',
  'admin@station.gov.in',
  '<HASH>',
  'STATION_ADMIN',
  true
);
""")
