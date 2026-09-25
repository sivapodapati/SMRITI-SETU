from sqlalchemy import text
from database import engine

def add_column():
    try:
        with engine.connect() as conn:
            # Check if column reason already exists
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='game_performances' AND column_name='reason';"
            )).first()
            
            if not result:
                print("Adding column 'reason' to 'game_performances' table...")
                conn.execute(text("ALTER TABLE game_performances ADD COLUMN reason TEXT;"))
                conn.commit()
                print("Column 'reason' added successfully!")
            else:
                print("Column 'reason' already exists.")
    except Exception as e:
        print("Error altering table:", e)

if __name__ == "__main__":
    add_column()
