import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ria_advisor.db")

# Supabase direct connections resolve to IPv6 on Render (unreachable).
# Force IPv4 by adding ?host= with the IPv4-only transaction pooler hostname.
# This rewrites db.xxx.supabase.co → aws-0-ap-south-1.pooler.supabase.com (IPv4 only).
if "supabase.co" in DATABASE_URL and "pooler.supabase.com" not in DATABASE_URL:
    # Extract project ref from hostname: db.<ref>.supabase.co
    import re
    m = re.search(r"db\.([a-z0-9]+)\.supabase\.co", DATABASE_URL)
    if m:
        ref = m.group(1)
        # Replace direct host with transaction pooler (IPv4, port 6543)
        DATABASE_URL = re.sub(
            r"db\.[a-z0-9]+\.supabase\.co:\d+",
            f"aws-0-ap-south-1.pooler.supabase.com:6543",
            DATABASE_URL,
        )

# SQLite needs check_same_thread=False; PostgreSQL does not need it
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
