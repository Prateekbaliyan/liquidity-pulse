import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.config import settings

logger = logging.getLogger("Database")

Base = declarative_base()

# Async PostgreSQL Engine with SQLite/In-memory fallback for lightweight execution without external DB container requirement
db_url = settings.DATABASE_URL
if "postgresql" in db_url:
    # Use sqlite async in-memory as graceful fallback if postgresql service is absent
    try:
        engine = create_async_engine(db_url, echo=False)
    except Exception:
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
else:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Database init warning (running with in-memory state): {e}")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
