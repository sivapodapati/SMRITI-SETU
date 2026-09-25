from database import engine

try:
    with engine.connect() as connection:
        print("✅ PostgreSQL connected successfully!")
        print("✅ Database: cognitive_assistance")
except Exception as e:
    print("❌ Database connection failed!")
    print(e)