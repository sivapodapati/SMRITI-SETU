import json
from database import SessionLocal
from models.game_content import GameContent
from models.game import Game
from sqlalchemy import text

# Define the dynamic stories for Game 5 (Mood & Memory Stories)
STORIES_DATA = {
    "Assam": [
        {
            "content_id": "story_assam_tea_l1",
            "level": 1,
            "title": "The Golden Tea Gardens of Assam / অসমৰ চাহ বাগিচা",
            "data": {
                "story_text": {
                    "English": "Assam is world-famous for its rich, golden-colored black tea. The first tea gardens were established in the beautiful Assam valley in Chabua. Pluckers carry bamboo baskets on their backs to collect tender leaves.",
                    "Assamese": "অসম ইয়াৰ সোণালী ৰঙৰ কহুৱা চাহৰ বাবে বিশ্ববিখ্যাত। চাবুৱাত অসমৰ প্ৰথম চাহ বাগিচা স্থাপন কৰা হৈছিল। পাত চিঙা লোকসকলে কোমল চাহ পাতবোৰ গোটাবলৈ পিঠিত বাঁহৰ পাচি লয়।",
                    "Hindi": "असम अपनी समृद्ध, सुनहरे रंग की काली चाय के लिए विश्व प्रसिद्ध है। पहली चाय की बागान चाबुआ की सुंदर असम घाटी में स्थापित किए गए थे। पत्तियां तोड़ने वाले लोग कोमल पत्तियों को इकट्ठा करने के लिए अपनी पीठ पर बांस की टोकरियां ले जाते हैं।"
                },
                "questions": [
                    {
                        "id": "q1",
                        "question_text": {
                            "English": "What is Assam world-famous for?",
                            "Assamese": "অসম বিশ্বত কিহৰ বাবে বিখ্যাত?",
                            "Hindi": "असम विश्व में किसलिए प्रसिद्ध है?"
                        },
                        "options": {
                            "English": ["Golden Tea", "Apples", "Spices"],
                            "Assamese": ["সোণালী চাহ", "আপেল", "মছলা"],
                            "Hindi": ["सुनहरी चाय", "सेब", "मसाले"]
                        },
                        "correct_idx": 0
                    },
                    {
                        "id": "q2",
                        "question_text": {
                            "English": "What do pluckers carry on their backs?",
                            "Assamese": "পাত চিঙা লোকসকলে পিঠিত কি লৈ যায়?",
                            "Hindi": "पत्तियां तोड़ने वाले अपनी पीठ पर क्या ले जाते हैं?"
                        },
                        "options": {
                            "English": ["Leather bags", "Bamboo baskets", "Plastic buckets"],
                            "Assamese": ["চামৰাৰ বেগ", "বাঁহৰ পাচি", "প্লাষ্টিকৰ বাল্টি"],
                            "Hindi": ["चमड़े के बैग", "बांस की टोकरियां", "प्लास्टिक की बाल्टियां"]
                        },
                        "correct_idx": 1
                    }
                ]
            }
        },
        {
            "content_id": "story_assam_tea_l2",
            "level": 2,
            "title": "The River Island of Majuli / নদী দ্বীপ মাজুলী",
            "data": {
                "story_text": {
                    "English": "Majuli is the largest river island in the world, located in the Brahmaputra River in Assam. It is the hub of Assamese Neo-Vaishnavite culture and famous for its satras and traditional clay mask-making.",
                    "Assamese": "মাজুলী বিশ্বৰ সৰ্ববৃহৎ নদী দ্বীপ, যি অসমৰ ব্ৰহ্মপুত্ৰ নদীত অৱস্থিত। ই অসমীয়া নব্য-বৈষ্ণৱ সংস্কৃতিৰ প্ৰাণকেন্দ্ৰ আৰু সত্ৰসমূহ তথা পৰম্পৰাগত মাটিৰ মুখা শিল্পৰ বাবে বিখ্যাত।",
                    "Hindi": "माजुली दुनिया का सबसे बड़ा नदी द्वीप है, जो असम में ब्रह्मपुत्र नदी में स्थित है। यह असमिया नव-वैष्णव संस्कृति का केंद्र है और अपने सत्रों और पारंपरिक मिट्टी के मुखौटे बनाने के लिए प्रसिद्ध है।"
                },
                "questions": [
                    {
                        "id": "q1",
                        "question_text": {
                            "English": "In which river is Majuli located?",
                            "Assamese": "মাজুলী কোনখন নদীত অৱস্থিত?",
                            "Hindi": "माजुली किस नदी में स्थित है?"
                        },
                        "options": {
                            "English": ["Ganga", "Brahmaputra", "Yamuna"],
                            "Assamese": ["গংগা", "ব্ৰহ্মপুত্ৰ", "যমুনা"],
                            "Hindi": ["गंगा", "ब्रह्मपुत्र", "यमुना"]
                        },
                        "correct_idx": 1
                    },
                    {
                        "id": "q2",
                        "question_text": {
                            "English": "What craft is Majuli famous for?",
                            "Assamese": "মাজুলী কোনটো শিল্পৰ বাবে বিখ্যাত?",
                            "Hindi": "माजुली किस शिल्प के लिए प्रसिद्ध है?"
                        },
                        "options": {
                            "English": ["Clay mask-making", "Metal casting", "Silk weaving"],
                            "Assamese": ["মাটিৰ মুখা শিল্প", "ধাতু গলাই সজা শিল্প", "ৰেচম বোৱা"],
                            "Hindi": ["मिट्टी के मुखौटे बनाना", "धातु ढलाई", "रेशम बुनाई"]
                        },
                        "correct_idx": 0
                    }
                ]
            }
        }
    ],
    "Manipur": [
        {
            "content_id": "story_manipur_loktak_l2",
            "level": 2,
            "title": "The Floating Lake of Loktak / লোকটাক হ্ৰদ",
            "data": {
                "story_text": {
                    "English": "Loktak Lake in Manipur is famous for its unique floating islands called phumdis. Keibul Lamjao National Park on this lake is the only floating national park in the world and home to the endangered Sangai brow-antlered deer.",
                    "Meitei": "মণিপুৰগী লোকটাক পাৎ অসি ফু মদোম চংবা ফুন্দি কাংবুশিংগীদমক মমিং চৎলী। পাৎ অসিদা লৈবা কৈবুল লামজাও নেস্নেল পার্ক অসি মালেমগী অমত্তা ঙাইরবা মোদোল চংবা পার্কনি অমসুং মসিদা সাংগাই নাম্বা অমসুং মাংখিগদৌরবা শাজি লৈ।",
                    "Hindi": "मणिपुर की लोकतक झील अपने अनोखे तैरते हुए द्वीपों के लिए प्रसिद्ध है जिन्हें फुमदी कहा जाता है। इस झील पर स्थित कीबुल लामजाओ राष्ट्रीय उद्यान दुनिया का एकमात्र तैरता हुआ राष्ट्रीय उद्यान है और यह लुप्तप्राय संगाई हिरण का घर है।"
                },
                "questions": [
                    {
                        "id": "q1",
                        "question_text": {
                            "English": "What are the unique floating islands on Loktak called?",
                            "Meitei": "লোকটাক পাৎ অসিদা লৈবা ফুন্দি কাংবুশিং অসিবু করম্না কৌবগে?",
                            "Hindi": "लोकतक झील पर तैरते हुए अनोखे द्वीपों को क्या कहा जाता है?"
                        },
                        "options": {
                            "English": ["Phumdis", "Silt islands", "Coral reefs"],
                            "Meitei": ["ফুমদি", "কোংগোল", "শমোং"],
                            "Hindi": ["फुमदी", "गाद द्वीप", "मूंगा चट्टानें"]
                        },
                        "correct_idx": 0
                    },
                    {
                        "id": "q2",
                        "question_text": {
                            "English": "Which endangered animal is found in Keibul Lamjao?",
                            "Meitei": "কৈবুল লামজাওদা ফংবা মাংখিগদৌরবা শাজি অসি করমণি?",
                            "Hindi": "कीबुल लामजाओ में कौन सा लुप्तप्राय जानवर पाया जाता है?"
                        },
                        "options": {
                            "English": ["Sangai Deer", "Red Panda", "One-horned Rhino"],
                            "Meitei": ["সাংগাই শাজি", "অঙৌবা পান্ডা", "গণ্ডার"],
                            "Hindi": ["संगाई हिरण", "लाल पांडा", "एक सींग वाला गैंडा"]
                        },
                        "correct_idx": 0
                    }
                ]
            }
        }
    ],
    "Meghalaya": [
        {
            "content_id": "story_meghalaya_rootbridges_l3",
            "level": 3,
            "title": "The Living Root Bridges of Cherrapunji",
            "data": {
                "story_text": {
                    "English": "In Meghalaya, the Khasi people train the aerial roots of rubber fig trees to cross rushing rivers. It takes decades for these bridges to grow strong, and they can last for hundreds of years, becoming stronger with age.",
                    "Khasi": "Ha Meghalaya, ki briew Khasi ki pyndonkam ia ki thied tynrai jong ki dieng rubber ban shna jingkieng ia ki wah bashah. Ka shim por da ki phew snem ban khiah bad ki lah ban sah da ki spah snem.",
                    "Hindi": "मेघालय में, खासी लोग रबर अंजीर के पेड़ों की हवाई जड़ों को बहती नदियों को पार करने के लिए प्रशिक्षित करते हैं। इन पुलों को मजबूत होने में दशकों लग जाते हैं, और वे सदियों तक बने रह सकते हैं।"
                },
                "questions": [
                    {
                        "id": "q1",
                        "question_text": {
                            "English": "Which tree roots are used to make the living bridges?",
                            "Khasi": "Kiei ki thied dieng ba la pyndonkam ban shna ia ki jingkieng?",
                            "Hindi": "जीवित पुलों को बनाने के लिए किस पेड़ की जड़ों का उपयोग किया जाता है?"
                        },
                        "options": {
                            "English": ["Rubber Fig Tree", "Banyan Tree", "Oak Tree"],
                            "Khasi": ["Dieng Rubber", "Dieng Banyan", "Dieng Oak"],
                            "Hindi": ["रबर अंजीर का पेड़", "बरगद का पेड़", "बलूत का पेड़"]
                        },
                        "correct_idx": 0
                    },
                    {
                        "id": "q2",
                        "question_text": {
                            "English": "Who trains these living root bridges?",
                            "Khasi": "Kiei ki briew ba shna ia ki jingkieng root?",
                            "Hindi": "इन जीवित जड़ पुलों को कौन प्रशिक्षित करता है?"
                        },
                        "options": {
                            "English": ["Khasi people", "Garo people", "Naga people"],
                            "Khasi": ["Ki Khasi", "Ki Garo", "Ki Naga"],
                            "Hindi": ["खासी लोग", "गारो लोग", "नागा लोग"]
                        },
                        "correct_idx": 0
                    }
                ]
            }
        }
    ],
    "Mizoram": [
        {
            "content_id": "story_mizoram_cheraw_l4",
            "level": 4,
            "title": "The Cheraw Bamboo Dance of Mizoram",
            "data": {
                "story_text": {
                    "English": "The Cheraw is a traditional Mizo dance where dancers step in and out of bamboo staves tapped together by performers on the ground. It is performed during festivals and is a symbol of Mizo cultural heritage.",
                    "Mizo": "Cheraw hi Mizo lam tualchhung thil a ni a, tualchhung lamtute chuan hnuailam bami chhu ri karah an ke an rap lutin an la chhuak leh thin a ni. Hei hi ropui taka lam thin a ni.",
                    "Hindi": "चेराव एक पारंपरिक मिज़ो नृत्य है जहाँ नर्तक ज़मीन पर कलाकारों द्वारा आपस में टकराए जाने वाले बांस के डंडों के बीच कदम रखते हैं। यह त्योहारों के दौरान किया जाता है।"
                },
                "questions": [
                    {
                        "id": "q1",
                        "question_text": {
                            "English": "What objects are tapped together in the Cheraw dance?",
                            "Mizo": "Cheraw lamah hian engnge kan inchhu ri thin?",
                            "Hindi": "चेराव नृत्य में किन वस्तुओं को आपस में टकराया जाता है?"
                        },
                        "options": {
                            "English": ["Bamboo staves", "Metal rods", "Wooden drums"],
                            "Mizo": ["Mau staves", "Thir tlawn", "Khuang te"],
                            "Hindi": ["बांस के डंडे", "धातु की छड़ें", "लकड़ी के ढोल"]
                        },
                        "correct_idx": 0
                    }
                ]
            }
        }
    ]
}

# Dynamic Recipes for Game 3 (Traditional Recipe Sequencer)
RECIPES_DATA = {
    "Assam": [
        {
            "content_id": "recipe_masor_tenga_l1",
            "level": 1,
            "title": "Assamese Masor Tenga (Sour Fish Curry)",
            "data": {
                "dishIcon": "🐟",
                "steps": [
                    {"id": "s1", "emoji": "🧂", "text": "1. Marinate fresh fish slices with turmeric & salt"},
                    {"id": "s2", "emoji": "🍳", "text": "2. Shallow fry fish in hot mustard oil"},
                    {"id": "s3", "emoji": "🍅", "text": "3. Sauté Elephant Apple or tomatoes, add water and simmer"}
                ]
            }
        }
    ],
    "Manipur": [
        {
            "content_id": "recipe_kangshoi_l2",
            "level": 2,
            "title": "Manipuri Kangshoi (Veg & Fish Stew)",
            "data": {
                "dishIcon": "🥗",
                "steps": [
                    {"id": "s1", "emoji": "🧄", "text": "1. Boil water with ginger, garlic & fermented Ngari fish"},
                    {"id": "s2", "emoji": "🥬", "text": "2. Add fresh seasonal green vegetables"},
                    {"id": "s3", "emoji": "🐟", "text": "3. Sauté pan-roasted dried fish and simmer together"}
                ]
            }
        }
    ],
    "Meghalaya": [
        {
            "content_id": "recipe_jadoh_l3",
            "level": 3,
            "title": "Meghalaya Jadoh (Khasi Rice with Meat)",
            "data": {
                "dishIcon": "🍲",
                "steps": [
                    {"id": "s1", "emoji": "🧅", "text": "1. Heat mustard oil and sauté chopped onions & ginger"},
                    {"id": "s2", "emoji": "🥩", "text": "2. Sauté meat pieces with black pepper & turmeric"},
                    {"id": "s3", "emoji": "🌾", "text": "3. Add washed short-grain hill rice and roast lightly"},
                    {"id": "s4", "emoji": "🔥", "text": "4. Pour rich meat broth, cover and simmer until fluffy"}
                ]
            }
        }
    ]
}

def seed_content():
    db = SessionLocal()
    try:
        # Clear existing game content
        print("Clearing old game content...")
        db.execute(text("TRUNCATE TABLE game_contents RESTART IDENTITY CASCADE;"))
        db.commit()

        # 1. Seed Game 5 Stories
        print("Seeding Game 5 (Stories) personalized content...")
        for state, stories in STORIES_DATA.items():
            for s in stories:
                # We seed multiple records of the same story in different languages for complete localization
                languages = ["English", "Assamese", "Meitei", "Mizo", "Khasi", "Hindi"]
                for lang in languages:
                    # Resolve localized title and data
                    story_text = s["data"]["story_text"].get(lang, s["data"]["story_text"]["English"])
                    
                    localized_questions = []
                    for q in s["data"]["questions"]:
                        q_text = q["question_text"].get(lang, q["question_text"]["English"])
                        opts = q["options"].get(lang, q["options"]["English"])
                        localized_questions.append({
                            "id": q["id"],
                            "question_text": q_text,
                            "options": opts,
                            "correct_idx": q["correct_idx"]
                        })
                    
                    content_record = GameContent(
                        game_id=5,
                        level=s["level"],
                        state=state,
                        language=lang,
                        content_id=s["content_id"],
                        title=s["title"],
                        data={
                            "story_text": story_text,
                            "questions": localized_questions
                        },
                        is_active=True
                    )
                    db.add(content_record)
        
        # 2. Seed Game 3 Recipes
        print("Seeding Game 3 (Recipes) personalized content...")
        for state, recipes in RECIPES_DATA.items():
            for r in recipes:
                languages = ["English", "Assamese", "Meitei", "Mizo", "Khasi", "Hindi"]
                for lang in languages:
                    content_record = GameContent(
                        game_id=3,
                        level=r["level"],
                        state=state,
                        language=lang,
                        content_id=r["content_id"],
                        title=r["title"],
                        data=r["data"],
                        is_active=True
                    )
                    db.add(content_record)

        # 3. Seed Fallbacks / Defaults for Game 1, 2, 3, 4, 5
        print("Seeding default / fallback contents for levels 1-10...")
        for game_id in [1, 2, 3, 4, 5]:
            for level in range(1, 11):
                # Generate generic config depending on level
                if game_id == 1:
                    data = {
                        "sequence_length": max(2, min(8, level // 2 + 2)),
                        "flash_speed": max(0.5, round(2.0 - (level * 0.15), 2)),
                        "choices_count": max(3, min(6, level // 3 + 3)),
                        "time_limit": max(30, 120 - (level * 8))
                    }
                    title = f"Remember the Sequence L{level}"
                elif game_id == 2:
                    data = {
                        "pairs": max(2, min(8, level // 2 + 2)),
                        "time_limit": max(40, 120 - (level * 8)),
                        "card_show_time": max(0, round(3.0 - (level * 0.3), 2)),
                        "use_similar": level in [5, 7, 9, 10]
                    }
                    title = f"Landmark & Picture Match L{level}"
                elif game_id == 3:
                    # Default recipe fallback
                    data = {
                        "dishIcon": "🍲",
                        "steps": [
                            {"id": "s1", "emoji": "🍳", "text": "1. Chop ingredients"},
                            {"id": "s2", "emoji": "🔥", "text": "2. Cook on medium flame"},
                            {"id": "s3", "emoji": "🧂", "text": "3. Add salt and serve"}
                        ]
                    }
                    title = f"Traditional Recipe L{level}"
                elif game_id == 4:
                    data = {
                        "choices_count": max(3, min(6, level // 2 + 2)),
                        "sequence_length": max(1, min(4, level // 3 + 1)),
                        "time_limit": max(30, 90 - (level * 5))
                    }
                    title = f"Folk Rhythm Match L{level}"
                else: # game_id == 5
                    data = {
                        "story_text": "Welcome to your cognitive care companion. Let's do a simple recall exercise. Focus on your daily routine.",
                        "questions": [
                            {
                                "id": "q1",
                                "question_text": "What is the purpose of this exercise?",
                                "options": ["Cognitive Care", "Cooking", "Shopping"],
                                "correct_idx": 0
                            }
                        ]
                    }
                    title = f"Encouragement Story L{level}"

                # Seed for all states and languages as fallback
                content_record = GameContent(
                    game_id=game_id,
                    level=level,
                    state="Default",
                    language="English",
                    content_id=f"fallback_g{game_id}_l{level}",
                    title=title,
                    data=data,
                    is_active=True
                )
                db.add(content_record)

        db.commit()
        print("Successfully seeded all personalized game contents!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_content()
