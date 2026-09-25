from sqlalchemy import text
from database import engine

def migrate():
    print("Running database migrations...")
    with engine.connect() as conn:
        # Add columns to patients if they do not exist
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS max_difficulty_ceiling INTEGER DEFAULT 10;"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS target_sessions INTEGER DEFAULT 4;"))
        conn.commit()
        print("Successfully updated patients table columns.")

if __name__ == "__main__":
    migrate()
