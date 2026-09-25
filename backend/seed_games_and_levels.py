import json
from database import SessionLocal
from models.game import Game
from models.patient import Patient
from models.user import User
from models.reminder import Reminder
from models.task import PatientTask
from pwdlib import PasswordHash

# Define the 10 levels for each game containing both standard and easier_variant.
GAMES_DATA = {
    1: {
        "title": "Remember the Sequence",
        "game_type": "sequence_recall",
        "description": "Remember the order of flashed pictures to improve attention and short-term recall.",
        "instructions": "Watch the sequence of pictures carefully, then click them in the same order.",
        "cultural_theme": "NER folk instruments and elements",
        "levels": {
            str(lvl): {
                "standard": {
                    "sequence_length": max(2, min(8, lvl // 2 + 2)),
                    "flash_speed": max(0.5, round(2.0 - (lvl * 0.15), 2)),
                    "choices_count": max(3, min(6, lvl // 3 + 3)),
                    "time_limit": max(30, 120 - (lvl * 8))
                },
                "easier_variant": {
                    "sequence_length": max(2, min(7, (lvl // 2 + 1))),
                    "flash_speed": max(0.7, round(2.3 - (lvl * 0.15), 2)),
                    "choices_count": max(3, min(5, lvl // 3 + 2)),
                    "time_limit": max(45, 150 - (lvl * 8))
                }
            } for lvl in range(1, 11)
        }
    },
    2: {
        "title": "Familiar Landmark & Picture Match",
        "game_type": "memory_recall",
        "description": "Match familiar picture pairs and landmark photos to improve recognition and working memory.",
        "instructions": "Look at the cards and match the identical regional icons and landmarks.",
        "cultural_theme": "NER landmarks and icons",
        "levels": {
            str(lvl): {
                "standard": {
                    "pairs": max(2, min(8, lvl // 2 + 2)),
                    "time_limit": max(40, 120 - (lvl * 8)),
                    "card_show_time": max(0, round(3.0 - (lvl * 0.3), 2)),
                    "use_similar": lvl in [5, 7, 9, 10]
                },
                "easier_variant": {
                    "pairs": max(2, min(7, lvl // 2 + 1)),
                    "time_limit": max(60, 150 - (lvl * 8)),
                    "card_show_time": max(0.5, round(4.0 - (lvl * 0.3), 2)),
                    "use_similar": False
                }
            } for lvl in range(1, 11)
        }
    },
    3: {
        "title": "Traditional Recipe Sequencer",
        "game_type": "object_recognition",
        "description": "Arrange the steps to cook traditional North Eastern delicacies in correct chronological order.",
        "instructions": "Place the preparation steps in the correct cooking sequence.",
        "cultural_theme": "NER culinary traditions",
        "levels": {
            str(lvl): {
                "standard": {
                    "choices_count": max(3, min(8, lvl // 2 + 3)),
                    "time_limit": max(15, 90 - (lvl * 7)),
                    "use_similar_distractors": lvl in [5, 7, 9, 10]
                },
                "easier_variant": {
                    "choices_count": max(3, min(6, lvl // 2 + 2)),
                    "time_limit": max(30, 120 - (lvl * 7)),
                    "use_similar_distractors": False
                }
            } for lvl in range(1, 11)
        }
    },
    4: {
        "title": "Folk Rhythm Match",
        "game_type": "attention_concentration",
        "description": "Match traditional drumbeats and horn sounds to boost auditory memory and recognition.",
        "instructions": "Listen to the traditional instrument pattern and select the correct matching sequence.",
        "cultural_theme": "NER folk instruments",
        "levels": {
            str(lvl): {
                "standard": {
                    "grid_size": max(4, min(12, lvl + 3)),
                    "rounds": max(3, min(8, lvl // 2 + 3)),
                    "time_limit": max(15, 60 - (lvl * 4)),
                    "similarity": "high" if lvl >= 5 else "low"
                },
                "easier_variant": {
                    "grid_size": max(4, min(9, lvl + 2)),
                    "rounds": max(3, min(6, lvl // 2 + 2)),
                    "time_limit": max(25, 90 - (lvl * 4)),
                    "similarity": "low"
                }
            } for lvl in range(1, 11)
        }
    },
    5: {
        "title": "Mood & Memory Stories",
        "game_type": "emotional_engagement",
        "description": "Emotional engagement through familiar stories, music and memories.",
        "instructions": "Listen to the story and answer the simple questions.",
        "cultural_theme": "NER traditions and histories",
        "levels": {
            str(lvl): {
                "standard": {
                    "story_length": "long" if lvl >= 7 else ("medium" if lvl >= 4 else "short"),
                    "questions_count": max(1, min(3, lvl // 3 + 1)),
                    "question_complexity": "high" if lvl >= 7 else ("medium" if lvl >= 4 else "simple"),
                    "time_limit": max(45, 120 - (lvl * 6))
                },
                "easier_variant": {
                    "story_length": "medium" if lvl >= 7 else "short",
                    "questions_count": max(1, min(2, lvl // 3 + 1)),
                    "question_complexity": "simple",
                    "time_limit": max(60, 150 - (lvl * 6))
                }
            } for lvl in range(1, 11)
        }
    }
}

def seed_games_and_levels():
    db = SessionLocal()
    try:
        # 1. Seed Games
        print("Seeding Games & 10 difficulty levels...")
        for game_id, data in GAMES_DATA.items():
            game = db.query(Game).filter(Game.id == game_id).first()
            if not game:
                game = Game(
                    id=game_id,
                    title=data["title"],
                    game_type=data["game_type"],
                    description=data["description"],
                    instructions=data["instructions"],
                    difficulty="1",
                    language="English",
                    cultural_theme=data["cultural_theme"],
                    voice_enabled=True,
                    is_active=True
                )
                db.add(game)
                db.flush()
                print(f"Created Game {game_id}: {data['title']}")
            
            # Set the content JSON with levels
            game.content = {"levels": data["levels"]}
            db.commit()
            print(f"Configured 10 levels for Game {game_id}.")

        # 2. Update/Seed Patients & Dedicated User Credentials
        print("\nSeeding Users & Patients...")
        
        ph = PasswordHash.recommended()
        
        # Seed Doctor
        doc = db.query(User).filter((User.email == "doctor@smritisetu.in") | (User.email == "doctor@example.com")).first()
        if not doc:
            doc = User(name="Dr. Somo", email="doctor@smritisetu.in", role="doctor", password=ph.hash("doctor123"), state="Assam", language="English")
            db.add(doc)
        else:
            doc.email = "doctor@smritisetu.in"
            doc.role = "doctor"
            doc.password = ph.hash("doctor123")
        
        # Seed Caregiver
        cg = db.query(User).filter((User.email == "caregiver@smritisetu.in") | (User.email == "user@example.com")).first()
        if not cg:
            cg = User(name="Caregiver User", email="caregiver@smritisetu.in", role="caregiver", password=ph.hash("caregiver123"), state="Assam", language="Assamese")
            db.add(cg)
        else:
            cg.email = "caregiver@smritisetu.in"
            cg.role = "caregiver"
            cg.password = ph.hash("caregiver123")
        db.commit()

        patients_data = [
            {"id": 2, "name": "Priya Das", "email": "priya.das@smritisetu.in", "age": 68, "gender": "Female", "state": "Assam", "language": "Assamese"},
            {"id": 3, "name": "Lobsang Sangma", "email": "lobsang.sangma@smritisetu.in", "age": 72, "gender": "Male", "state": "Meghalaya", "language": "Assamese"},
            {"id": 4, "name": "Thangjam Ibocha", "email": "thangjam.ibocha@smritisetu.in", "age": 65, "gender": "Male", "state": "Manipur", "language": "Meitei"},
            {"id": 5, "name": "Lalhmingliani", "email": "lalhmingliani@smritisetu.in", "age": 70, "gender": "Female", "state": "Mizoram", "language": "Mizo"},
            {"id": 6, "name": "Pynshngainiaw Lyngdoh", "email": "pynshngainiaw.lyngdoh@smritisetu.in", "age": 67, "gender": "Male", "state": "Meghalaya", "language": "Khasi"},
            {"id": 7, "name": "Tashi Lepcha", "email": "tashi.lepcha@smritisetu.in", "age": 74, "gender": "Male", "state": "Sikkim", "language": "Nepali"},
            {"id": 8, "name": "Sengbat Sangma", "email": "sengbat.sangma@smritisetu.in", "age": 69, "gender": "Male", "state": "Meghalaya", "language": "Garo"},
            {"id": 9, "name": "Biplab Debbarma", "email": "biplab.debbarma@smritisetu.in", "age": 71, "gender": "Male", "state": "Tripura", "language": "Bengali"},
            {"id": 10, "name": "Koj Tasso", "email": "koj.tasso@smritisetu.in", "age": 73, "gender": "Male", "state": "Arunachal Pradesh", "language": "English"},
            {"id": 11, "name": "Sentila Ao", "email": "sentila.ao@smritisetu.in", "age": 66, "gender": "Female", "state": "Nagaland", "language": "English"},
            {"id": 12, "name": "Ramesh Kumar", "email": "ramesh.kumar@smritisetu.in", "age": 75, "gender": "Male", "state": "Assam", "language": "Hindi"}
        ]
        
        for p_data in patients_data:
            user = db.query(User).filter(User.email == p_data["email"]).first()
            if not user:
                user = User(
                    name=p_data["name"],
                    email=p_data["email"],
                    role="patient",
                    password=ph.hash("patient123"),
                    state=p_data["state"],
                    language=p_data["language"]
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                user.name = p_data["name"]
                user.password = ph.hash("patient123")
                user.role = "patient"
                user.state = p_data["state"]
                user.language = p_data["language"]
                db.commit()

            p = db.query(Patient).filter(Patient.id == p_data["id"]).first()
            if not p:
                p = Patient(
                    id=p_data["id"],
                    user_id=user.id,
                    name=p_data["name"],
                    age=p_data["age"],
                    gender=p_data["gender"],
                    state=p_data["state"],
                    language=p_data["language"]
                )
                db.add(p)
                print(f"Created Patient {p_data['name']}")
            else:
                p.user_id = user.id
                p.name = p_data["name"]
                p.age = p_data["age"]
                p.gender = p_data["gender"]
                p.state = p_data["state"]
                p.language = p_data["language"]
                print(f"Updated Patient {p_data['name']} (User ID {user.id})")
        db.commit()

        # Clear old reminders and tasks for reproducible seeding
        db.query(Reminder).delete()
        db.query(PatientTask).delete()
        db.commit()

        demo_reminders = [
            # Priya Das (Assamese)
            Reminder(
                patient_id=2,
                title="পুৱাৰ ঔষধ",
                description="ৰাতিপুৱাৰ আহাৰৰ পিছত খাব লাগে (প্ৰিয়া দাস)",
                reminder_type="Medication",
                scheduled_time="08:30",
                recurrence="daily",
                language="Assamese",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=2,
                title="পানী খোৱা",
                description="পানী খাবলৈ সময় হৈছে।",
                reminder_type="hydration",
                scheduled_time="12:00",
                recurrence="daily",
                language="Assamese",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=2,
                title="মৰমৰ প্ৰিয়া (Dear Priya)",
                description="আপুনি বহুত ভাল খেলিছে, এনেকৈয়ে খেলি থাকক!",
                reminder_type="encouragement",
                scheduled_time="15:00",
                recurrence="daily",
                language="Assamese",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=2,
                title="দুপৰীয়াৰ খোজ কঢ়া",
                description="১০ মিনিটৰ বাবে চোতালত ফুৰক",
                reminder_type="Daily Routine",
                scheduled_time="16:00",
                recurrence="daily",
                language="Assamese",
                active=True,
                completed=False
            ),
            # Lobsang Sangma (English)
            Reminder(
                patient_id=3,
                title="Morning Blood Pressure Pill",
                description="Take 1 tablet after breakfast",
                reminder_type="Medication",
                scheduled_time="08:30",
                recurrence="daily",
                language="English",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=3,
                title="Drink Water",
                description="Time to drink water.",
                reminder_type="hydration",
                scheduled_time="12:00",
                recurrence="daily",
                language="English",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=3,
                title="Well Done!",
                description="Superb progress today! We are proud of you.",
                reminder_type="encouragement",
                scheduled_time="15:00",
                recurrence="daily",
                language="English",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=3,
                title="Cognitive Exercise Time",
                description="Play Remember the Sequence game",
                reminder_type="Cognitive Activity",
                scheduled_time="10:00",
                recurrence="daily",
                language="English",
                active=True,
                completed=False
            ),
            # Ramesh Kumar (Hindi)
            Reminder(
                patient_id=12,
                title="सुबह की दवा",
                description="नाश्ते के बाद 1 गोली लें (रमेश कुमार)",
                reminder_type="Medication",
                scheduled_time="08:30",
                recurrence="daily",
                language="Hindi",
                active=True,
                completed=False
            ),
            Reminder(
                patient_id=12,
                title="पानी पीना",
                description="पानी पीने का समय हो गया है।",
                reminder_type="hydration",
                scheduled_time="12:00",
                recurrence="daily",
                language="Hindi",
                active=True,
                completed=False
            )
        ]
        db.add_all(demo_reminders)
        print("Seeded demo reminders including hydration and Hindi.")

        tasks_count = db.query(PatientTask).count()
        if tasks_count == 0:
            demo_tasks = [
                # Priya Das
                PatientTask(
                    patient_id=2,
                    title="মগজুৰ খেল খেলা",
                    description="যিকোনো একটা খেলা স্তৰ সম্পূৰ্ণ কৰক",
                    task_type="Cognitive Game",
                    due_time="11:00",
                    status="Pending",
                    language="Assamese"
                ),
                PatientTask(
                    patient_id=2,
                    title="পুৱাৰ ঔষধ খোৱা",
                    description="পিল আৰু পানী লওক",
                    task_type="Medication",
                    due_time="08:45",
                    status="Pending",
                    language="Assamese"
                ),
                # Lobsang Sangma
                PatientTask(
                    patient_id=3,
                    title="Play Cognitive Game",
                    description="Complete level 2 of memory recall",
                    task_type="Cognitive Game",
                    due_time="11:30",
                    status="Pending",
                    language="English"
                ),
                PatientTask(
                    patient_id=3,
                    title="Routine Morning Walk",
                    description="Walk in the park for 15 minutes",
                    task_type="Daily Routine",
                    due_time="07:30",
                    status="Completed",
                    language="English"
                ),
                # Ramesh Kumar (Hindi)
                PatientTask(
                    patient_id=12,
                    title="दिमागी खेल खेलना",
                    description="कोई भी एक खेल का स्तर पूरा करें",
                    task_type="Cognitive Game",
                    due_time="11:00",
                    status="Pending",
                    language="Hindi"
                ),
                PatientTask(
                    patient_id=12,
                    title="सुबह की दवा लेना",
                    description="दवा और पानी लें",
                    task_type="Medication",
                    due_time="08:45",
                    status="Pending",
                    language="Hindi"
                )
            ]
            db.add_all(demo_tasks)
            print("Seeded demo tasks including Hindi.")

        db.commit()
        print("\nSeeding successfully completed!")
    except Exception as e:
        db.rollback()
        print("Error seeding games/patients:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed_games_and_levels()
