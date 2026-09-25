from database import SessionLocal, engine
from models.game import Game
from models.localization import GameLocalization

def seed_family_game():
    db = SessionLocal()
    try:
        # Check if Game 6 exists
        game = db.query(Game).filter(Game.id == 6).first()
        levels_10 = {
            str(lvl): {
                "standard": {
                    "choices_count": max(2, min(6, lvl // 2 + 2)),
                    "time_limit": max(20, 70 - (lvl * 4))
                },
                "easier_variant": {
                    "choices_count": max(2, min(4, lvl // 3 + 2)),
                    "time_limit": max(30, 90 - (lvl * 4))
                }
            } for lvl in range(1, 11)
        }
        if not game:
            game = Game(
                id=6,
                title="Family Member Recognition",
                description="Recognize family members and practice memory association.",
                game_type="Family Recognition",
                difficulty=1,
                language="English",
                cultural_theme="Familiar faces",
                instructions="Look at the photo of your family member and choose their relationship or name.",
                voice_enabled=True,
                content={"levels": levels_10},
                is_active=True
            )
            db.add(game)
            db.commit()
            db.refresh(game)
            print("Seeded Game 6 successfully.")
        else:
            game.content = {"levels": levels_10}
            db.commit()
            print("Updated Game 6 with 10 levels.")

        # Seed Localizations for Game 6
        localizations_data = [
            {
                "language": "English",
                "title": "Family Member Recognition",
                "description": "Recognize family members and practice memory association.",
                "instructions": "Look at the photo of your family member and choose their relationship.",
                "start_button": "Start Game",
                "feedback_message": "Good job!",
                "hint_message": "Who is this person?",
                "voice_enabled": True
            },
            {
                "language": "Assamese",
                "title": "পৰিয়ালৰ সদস্য চিনাক্তকৰণ",
                "description": "পৰিয়ালৰ সদস্যসকলক চিনি পাওক আৰু স্মৃতিৰ সম্পৰ্ক অনুশীলন কৰক।",
                "instructions": "পৰিয়ালৰ সদস্যজনৰ ফটোখন চাওক আৰু তেওঁৰ সৈতে থকা সম্পৰ্ক বাছক।",
                "start_button": "খেল আৰম্ভ কৰক",
                "feedback_message": "বঢ়িয়া হৈছে!",
                "hint_message": "এইজন কোন হয়?",
                "voice_enabled": True
            },
            {
                "language": "Bengali",
                "title": "পরিবারের सदस्य সনাক্তকরণ",
                "description": "পরিবারের সদস্যদের চিনুন এবং স্মৃতির সম্পর্ক অনুশীলন করুন।",
                "instructions": "পরিবারের সদস্যের ছবি দেখুন এবং তাদের সাথে আপনার সম্পর্ক নির্বাচন করুন।",
                "start_button": "খেলা শুরু করুন",
                "feedback_message": "খুব ভালো!",
                "hint_message": "ইনি কে হন?",
                "voice_enabled": True
            },
            {
                "language": "Meitei",
                "title": "ইমুং মনুং খঙদোকপা",
                "description": "ইমুং মনুংগী মীশিং খঙদোকপা অমসুং নীংশিংবা হেনগৎহনবা।",
                "instructions": "নহাক্কী ইমুং মনুংগী মী অমগী লাই ময়েক য়েংলগা মখোয়গা লৈনবা মরী বাখল্লো।",
                "start_button": "শন্নবা হৌরকসি",
                "feedback_message": "য়াম্না ফৈ!",
                "hint_message": "মী অসি কনানো?",
                "voice_enabled": True
            },
            {
                "language": "Khasi",
                "title": "Ithuh Iaki Dkhot Longiing",
                "description": "Ithuh ia ki dkhot jong ka ïing ka sem bad pynkhlaiñ ïa ka jingshemphang.",
                "instructions": "Peit ia ka dur jong u/ka dkhot longïing jong phi bad jied ia ka jingïadei.",
                "start_button": "Sdang Jingïaleh",
                "feedback_message": "Bha bha!",
                "hint_message": "Uei une/uno?",
                "voice_enabled": True
            },
            {
                "language": "Mizo",
                "title": "Chhungte Hriatfiahna",
                "description": "Mahni chhungte hmel leh inlaichinna hriat chhuah leh hriatrengna lam sawizawina.",
                "instructions": "I chhungte thlalak en la, in inlaichinna jied rawh.",
                "start_button": "Bawl Rawh",
                "feedback_message": "Tha lutuk!",
                "hint_message": "Tunge he mi hi?",
                "voice_enabled": True
            },
            {
                "language": "Hindi",
                "title": "पारिवारिक सदस्य पहचान",
                "description": "पारिवारिक सदस्यों को पहचानें और स्मृति जुड़ाव का अभ्यास करें।",
                "instructions": "अपने परिवार के सदस्य की फोटो देखें और उनका संबंध चुनें।",
                "start_button": "खेल शुरू करें",
                "feedback_message": "बहुत अच्छे!",
                "hint_message": "यह व्यक्ति कौन है?",
                "voice_enabled": True
            }
        ]

        for data in localizations_data:
            existing = db.query(GameLocalization).filter(
                GameLocalization.game_id == 6,
                GameLocalization.language == data["language"]
            ).first()
            if not existing:
                loc = GameLocalization(
                    game_id=6,
                    language=data["language"],
                    title=data["title"],
                    description=data["description"],
                    instructions=data["instructions"],
                    start_button=data["start_button"],
                    feedback_message=data["feedback_message"],
                    hint_message=data["hint_message"],
                    voice_enabled=data["voice_enabled"]
                )
                db.add(loc)
                print(f"Seeded localization for {data['language']}")
        db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_family_game()
