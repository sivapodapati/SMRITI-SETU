from database import SessionLocal
from models.game import Game
from models.localization import GameLocalization


# =========================================================
# SUPPORTED NER LANGUAGES
# =========================================================

LANGUAGES = [
    "English",
    "Assamese",
    "Bengali",
    "Meitei",
    "Khasi",
    "Mizo",
    "Nagamese",
    "Nepali",
    "Kokborok",
    "Garo"
]


# =========================================================
# LOCALIZED GAME CONTENT
#
# Game 1 = Remember the Sequence
# Game 2 = Familiar Picture Matching
# Game 3 = Find the Familiar Object
# Game 4 = Find the Different One
# Game 5 = Mood & Memory Stories
# =========================================================

LOCALIZED_CONTENT = {

    # =====================================================
    # GAME 1 — REMEMBER THE SEQUENCE
    # =====================================================
    1: {
        "English": {
            "title": "Remember the Sequence",
            "description": "Remember the order of flashed pictures to improve attention and short-term recall.",
            "instructions": "Watch the sequence of pictures carefully, then click them in the same order.",
            "start_button": "Start Game",
            "feedback_message": "Perfect! You remembered the exact sequence.",
            "hint_message": "Watch the flashing sequence again."
        },
        "Assamese": {
            "title": "ক্ৰমটো মনত ৰাখক",
            "description": "মনোযোগ আৰু হ্ৰস্বম্যাদী স্মৃতি উন্নত কৰিবলৈ জিলিকি উঠা ছবিবোৰৰ ক্ৰমটো মনত ৰাখক।",
            "instructions": "ছবিবোৰ জিলিকি উঠাৰ ক্ৰমটো ভালদৰে চাওক, তাৰ পিছত একে ক্ৰমত ক্লিক কৰক।",
            "start_button": "খেল আৰম্ভ কৰক",
            "feedback_message": "অতি সুন্দৰ! আপুনি সঠিক ক্ৰমটো মনত ৰাখিলে।",
            "hint_message": "জিলিকি উঠা ছবিবোৰ আকৌ ভালদৰে চাওক।"
        },
        "Bengali": {
            "title": "ক্রমটি মনে রাখুন",
            "description": "মনোযোগ এবং স্বল্পমেয়াদী স্মৃতি উন্নত করতে ফ্ল্যাশ করা ছবিগুলির ক্রমটি মনে রাখুন।",
            "instructions": "ছবিগুলির ফ্ল্যাশ হওয়ার ক্রমটি মনোযোগ সহকারে দেখুন এবং একই ক্রমে ক্লিক করুন।",
            "start_button": "খেলা শুরু করুন",
            "feedback_message": "অসাধারণ! আপনি সঠিক ক্রমটি মনে রেখেছেন।",
            "hint_message": "ধৈর্য ধরুন এবং ছবিগুলির ক্রমটি আবার লক্ষ্য করুন।"
        },
        "Meitei": {
            "title": "ꯁꯦꯛꯌꯨꯑꯦꯟꯁ ꯅꯤꯡꯁꯤꯡꯕꯤꯌꯨ",
            "description": "ꯑꯀꯥꯏꯕꯥ ꯑꯃꯁꯨꯡ ꯃꯇꯝ ꯇꯦꯟꯅꯥ ꯅꯤꯡꯁꯤꯡꯕꯒꯤ ꯄꯣꯠꯁꯛꯁꯤꯡ ꯃꯥꯟꯅꯕꯥ ꯃꯇꯦꯡ ꯄꯥꯡꯖꯅꯕꯥ꯫",
            "instructions": "ꯄꯤꯛꯁꯔꯁꯤꯡ ꯐ꯭ꯂꯦꯁ ꯇꯧꯔꯀꯄꯥ ꯃꯇꯨꯡ ꯏꯟꯅ ꯃꯥꯟꯅ ꯁꯦꯛꯌꯨꯑꯦꯟꯁꯇꯥ ꯀ꯭ꯂꯤꯛ ꯇꯧꯕꯤꯌꯨ꯫",
            "start_button": "ꯒꯦꯝ ꯍꯥꯏꯔꯕꯥ",
            "feedback_message": "ꯑꯆꯨꯝꯕꯅꯤ! ꯅꯍꯥꯛꯅꯥ ꯁꯦꯛꯌꯨꯑꯦꯟꯁ ꯅꯤꯡꯁꯤꯡꯂꯦ꯫",
            "hint_message": "ꯐ꯭ꯂꯦꯁ ꯇꯧꯔꯀꯄꯥ ꯑꯗꯨ ꯑꯃꯨꯛꯇꪪ ꯌꯦꯡꯕꯤꯌꯨ꯫"
        },
        "Khasi": {
            "title": "Kynmaw ïa ka Jingïabud",
            "description": "Kynmaw ïa ka jingïabud ki dur ban pynbha ïa ka jingkynmaw kaba lyngkot.",
            "instructions": "Peit bha ïa ka jingfleiñ ki dur bad click katkum ka jingïabud.",
            "start_button": "Sdang ka Game",
            "feedback_message": "Bha bha! Phi la kynmaw tikar ïa ka jingïabud.",
            "hint_message": "Peit pat ïa ka jingfleiñ ki dur."
        },
        "Mizo": {
            "title": "A in dawt dan hriat reng",
            "description": "Thil lem in dawt dan hriat chhuah leh ngaihtuahna siamthat tur.",
            "instructions": "Thil lem rawn eng in dawt dan en la, a eng dan ang chiah khan thlang rawh.",
            "start_button": "Game Tan",
            "feedback_message": "Tha tak! I hre hneh hle mai.",
            "hint_message": "A rawn en dan kha en nawn leh rawh."
        },
        "Nagamese": {
            "title": "Sequence Monot Rakhibo",
            "description": "Monojog aru short-term memory bhal koribo.",
            "instructions": "Sequence tu bhalke saok aru ekeke sequence te click korok.",
            "start_button": "Game Suru Korok",
            "feedback_message": "Bohut bhal! Apuni thik sequence bisari paisa.",
            "hint_message": "Sequence tu akol saok."
        },
        "Nepali": {
            "title": "क्रम सम्झनुहोस्",
            "description": "ध्यान र अल्पकालीन स्मरण शक्ति सुधार गर्न देखापर्ने तस्बिरहरूको क्रम सम्झनुहोस्।",
            "instructions": "तस्बिरहरू देखापर्ने क्रम ध्यानपूर्वक हेर्नुहोस् र त्यसै क्रममा क्लिक गर्नुहोस्।",
            "start_button": "खेल सुरु गर्नुहोस्",
            "feedback_message": "धेरै राम्रो! तपाईंले सही क्रम सम्झनुभयो।",
            "hint_message": "देखापरेको क्रम फेरि एकपटक ध्यान दिएर हेर्नुहोस्।"
        },
        "Kokborok": {
            "title": "Chini Thokmani Bostu Mone Rakhnai",
            "description": "Monojog aro mone rakhnai khomota khoromkha.",
            "instructions": "Bostu bilak ni mone rakhnai khomota sai aro milai.",
            "start_button": "Game Khulnai",
            "feedback_message": "Boro bhal! Nwng mone rakhnai khungnai.",
            "hint_message": "Samay lai sai."
        },
        "Garo": {
            "title": "In dawt dan niobo",
            "description": "Sequence neng·ramgo niobo.",
            "instructions": "Mese·ani chinrangko neng·ramgo niobo, jeka on·a gita dakaibo.",
            "start_button": "A·bachengbo",
            "feedback_message": "Namgipa kam!",
            "hint_message": "Mese·pil·bo"
        }
    },

    # =====================================================
    # GAME 2 — FAMILIAR PICTURE MATCHING
    # =====================================================
    2: {
        "English": {
            "title": "Familiar Picture Matching",
            "description": "Match familiar pictures to improve memory and recall.",
            "instructions": "Look at the pictures carefully and match the same pictures.",
            "start_button": "Start Game",
            "feedback_message": "Well done! You found the matching pictures.",
            "hint_message": "Take your time and look carefully."
        },
        "Assamese": {
            "title": "চিনাকি ছবিৰ মিল",
            "description": "চিনাকি ছবিবোৰ মিলাই স্মৃতি আৰু মনত পেলোৱাৰ ক্ষমতা উন্নত কৰক।",
            "instructions": "ছবিবোৰ ভালদৰে চাওক আৰু একে ছবিবোৰ মিলাওক।",
            "start_button": "খেল আৰম্ভ কৰক",
            "feedback_message": "বৰ ভাল! আপুনি মিল থকা ছবিবোৰ বিচাৰি পাইছে।",
            "hint_message": "সময় লৈ ছবিবোৰ ভালদৰে চাওক।"
        },
        "Bengali": {
            "title": "পরিচিত ছবি মেলানো",
            "description": "স্মৃতিশক্তি উন্নত করতে জোড়ায় জোড়ায় পরিচিত ছবিগুলি মেলান।",
            "instructions": "ছবিগুলি মনোযোগ সহকারে দেখুন এবং একই ছবিগুলি জোড়ায় মেলান।",
            "start_button": "খেলা শুরু করুন",
            "feedback_message": "খুব ভালো! আপনি সবকটি জোড়া খুঁজে পেয়েছেন।",
            "hint_message": "তাড়াহুড়ো না করে মনোযোগ দিয়ে দেখুন।"
        },
        "Meitei": {
            "title": "ꯈꯪꯕ ꯄꯤꯛꯁꯔꯁꯤꯡ ꯃꯥꯟꯅꯕ",
            "description": "ꯈꯪꯕ ꯄꯤꯛꯁꯔꯁꯤꯡ ꯃꯥꯟꯅꯗꯨꯅꯥ ꯃꯦꯃꯣꯔꯤ ꯑꯃꯁꯨꯡ ꯃꯥꯡꯗꯨ ꯈꯪꯕꯒꯤ ꯃꯇꯦꯡ ꯄꯥꯡꯖꯅꯕꯥ꯫",
            "instructions": "ꯄꯤꯛꯁꯔꯁꯤꯡ ꯌꯦꯡꯗꯨꯅꯥ ꯃꯥꯟꯅ ꯄꯤꯛꯁꯔꯁꯤꯡ ꯃꯥꯟꯅꯕꯤꯌꯨ꯫",
            "start_button": "ꯒꯦꯝ ꯍꯥꯏꯔꯕꯥ",
            "feedback_message": "ꯌꯥꯝ ꯐꯖꯅꯥ! ꯃꯥꯟꯅ ꯄꯤꯛꯁꯔꯁꯤꯡ ꯐꯪꯂꯦ꯫",
            "hint_message": "ꯃꯇꯝ ꯂꯧꯅꯥ ꯄꯤꯛꯁꯔꯁꯤꯡ ꯌꯦꯡꯕꯤꯌꯨ꯫"
        },
        "Khasi": {
            "title": "Ka Jingïasyrïem ki Dur",
            "description": "Pynïasyrïem ïa ki dur kiba phi ithuh ban pynbha ïa ka jingkynmaw.",
            "instructions": "Peit bha ïa ki dur bad pynïasyrïem ïa ki dur kiba ïasyriem.",
            "start_button": "Sdang ka Game",
            "feedback_message": "Ka long kaba bha! Phi la lap ïa ki dur kiba ïahap.",
            "hint_message": "Shim por bad peit bha."
        },
        "Mizo": {
            "title": "Thil Hriat Zawngte Inmil",
            "description": "Thil familiar te inmil chhuahin hriatna leh hre thiamna siamthat tur.",
            "instructions": "Thil lemte fîmkhur taka en la, a inmil te chu thlang rawh.",
            "start_button": "Game Tan",
            "feedback_message": "Tha tak! Thil inmil te i hmu.",
            "hint_message": "Hun la la, fîmkhur taka en rawh."
        },
        "Nagamese": {
            "title": "Porichit Picture Milai",
            "description": "Porichit picture bilak milai memory aru monot rakhibole help koribo.",
            "instructions": "Picture bilak bhalke sai aru ekeke picture milai dibo.",
            "start_button": "Game Suru Korok",
            "feedback_message": "Bohut bhal! Apuni matching picture bilak bisari paisa.",
            "hint_message": "Time loi bhalke saok."
        },
        "Nepali": {
            "title": "परिचित तस्बिर मिलान",
            "description": "परिचित तस्बिरहरू मिलाएर स्मरण शक्ति र सम्झने क्षमता सुधार गर्नुहोस्।",
            "instructions": "तस्बिरहरू ध्यान दिएर हेर्नुहोस् र उस्तै तस्बिरहरू मिलाउनुहोस्।",
            "start_button": "खेल सुरु गर्नुहोस्",
            "feedback_message": "धेरै राम्रो! तपाईंले मिल्ने तस्बिरहरू फेला पार्नुभयो।",
            "hint_message": "समय लिएर ध्यानपूर्वक हेर्नुहोस्।"
        },
        "Kokborok": {
            "title": "Chini Thokmani Bostu Milai",
            "description": "Chini thokmani bostu milai sikhi aro mone rakhnai khomota khoromkha.",
            "instructions": "Bostu bilak bhal khoromkha ni sai aro milai.",
            "start_button": "Game Khulnai",
            "feedback_message": "Boro bhal! Nwng mil thokmani bostu khungnai.",
            "hint_message": "Samay lai bhal khoromkha ni sai."
        },
        "Garo": {
            "title": "Chinko matchatgipa",
            "description": "Match familiar pictures.",
            "instructions": "Mese·gipa gita dakaibo, chinko neng·ramgo niobo.",
            "start_button": "A·bachengbo",
            "feedback_message": "Namgipa kam!",
            "hint_message": "Mese·pil·bo"
        }
    },

    # =====================================================
    # GAME 3 — FIND THE FAMILIAR OBJECT
    # =====================================================
    3: {
        "English": {
            "title": "Find the Familiar Object",
            "description": "Identify familiar objects to improve attention and object recognition.",
            "instructions": "Look at the objects and select the object that matches the given prompt.",
            "start_button": "Start Game",
            "feedback_message": "Well done! You found the correct object.",
            "hint_message": "Look carefully before choosing."
        },
        "Assamese": {
            "title": "চিনাকি বস্তুটো বিচাৰি উলিয়াওক",
            "description": "চিনাকি বস্তু চিনাক্ত কৰি মনোযোগ আৰু বস্তু চিনাৰ ক্ষমতা উন্নত কৰক।",
            "instructions": "বস্তুবোৰ চাওক আৰু দিয়া নিৰ্দেশনাৰ সৈতে মিল থকা বস্তুটো বাছনি কৰক।",
            "start_button": "খেল আৰম্ভ কৰক",
            "feedback_message": "বৰ ভাল! আপুনি সঠিক বস্তুটো বিচাৰি পাইছে।",
            "hint_message": "বাছনি কৰাৰ আগতে ভালদৰে চাওক।"
        },
        "Bengali": {
            "title": "পরিচিত বস্তু খুঁজুন",
            "description": "মনোযোগ এবং বস্তু চেনার ক্ষমতা বাড়াতে সঠিক বস্তুটি সনাক্ত করুন।",
            "instructions": "ছবিগুলি দেখুন এবং নির্দেশিত বস্তুটি বেছে নিন।",
            "start_button": "খেলা শুরু করুন",
            "feedback_message": "অসাধারণ! আপনি সঠিক বস্তুটি খুঁজে পেয়েছেন।",
            "hint_message": "নির্বাচন করার আগে ছবিগুলি ভালো করে দেখে নিন।"
        },
        "Meitei": {
            "title": "ꯈꯪꯕ ꯄꯣꯠꯁꯛ ꯐꯪꯕ",
            "description": "ꯈꯪꯕ ꯄꯣꯠꯁꯛ ꯈꯪꯗꯨꯅꯥ ꯅꯣꯡꯃꯤꯠ ꯑꯃꯁꯨꯡ ꯃꯃꯜ ꯈꯪꯕꯒꯤ ꯃꯇꯦꯡ ꯄꯥꯡꯖꯅꯕꯥ꯫",
            "instructions": "ꯄꯣꯠꯁꯛꯁꯤꯡ ꯌꯦꯡꯗꯨꯅꯥ ꯄꯤꯔꯤꯕ ꯄꯥꯡꯊꯣꯛ ꯃꯇꯨꯡ ꯏꯟꯅ ꯄꯣꯠꯁꯛ ꯈꯟꯕꯤꯌꯨ꯫",
            "start_button": "ꯒꯦꪝ ꯍꯥꯏꯔꯕꯥ",
            "feedback_message": "ꯌꯥꯝ ꯐꯖꯅꯥ! ꯄꯣꯠꯁꯛ ꯑꯗꯨ ꯐꯪꯂꯦ꯫",
            "hint_message": "ꯈꯟꯕꯒꯤ ꯃꯃꯥꯡꯗꯥ ꯌꯦꯡꯕꯤꯌꯨ꯫"
        },
        "Khasi": {
            "title": "Pynïoh ïa ka Tiar Kaba Ithuh",
            "description": "Pynithuh ïa ki tiar kiba phi ithuh ban pynbha ïa ka jingpyrkhat bad jingithuh.",
            "instructions": "Peit ïa ki tiar bad jied ïa ka tiar kaba ïahap bad ka jingpynbna.",
            "start_button": "Sdang ka Game",
            "feedback_message": "Ka long kaba bha! Phi la lap ïa ka tiar kaba dei.",
            "hint_message": "Peit bha shuwa ban jied."
        },
        "Mizo": {
            "title": "Thil Familiar Zawn",
            "description": "Thil familiar te hriat chhuahin ngaihtuahna leh thil hriatna siamthat tur.",
            "instructions": "Thil te en la, pekchhuah ni thil te zinga thil inmil chu thlang rawh.",
            "start_button": "Game Tan",
            "feedback_message": "Tha tak! Thil dik chu i hmu.",
            "hint_message": "Thlan hmaah fîmkhur taka en rawh."
        },
        "Nagamese": {
            "title": "Porichit Bosotu Bisarok",
            "description": "Porichit bosotu chinibo aru monojog aru object recognition bhal koribo.",
            "instructions": "Bosotu bilak sai aru prompt logot mil thoka bosotu select korok.",
            "start_button": "Game Suru Korok",
            "feedback_message": "Bohut bhal! Apuni thik bosotu tu bisari paisa.",
            "hint_message": "Select kora age bhalke saok."
        },
        "Nepali": {
            "title": "परिचित वस्तु खोज्नुहोस्",
            "description": "परिचित वस्तुहरू पहिचान गरेर ध्यान र वस्तु चिन्ने क्षमता सुधार गर्नुहोस्।",
            "instructions": "वस्तुहरू हेर्नुहोस् र दिइएको निर्देशनसँग मिल्ने वस्तु छान्नुहोस्।",
            "start_button": "खेल सुरु गर्नुहोस्",
            "feedback_message": "धेरै राम्रो! तपाईंले सही वस्तु फेला पार्नुभयो।",
            "hint_message": "छान्नुअघि ध्यानपूर्वक हेर्नुहोस्।"
        },
        "Kokborok": {
            "title": "Chini Thokmani Bostu Khungnai",
            "description": "Chini thokmani bostu khungnai no monojog aro bostu chini thokmani khomota khoromkha.",
            "instructions": "Bostu bilak sai aro prompt logot mil thokmani bostu bachai.",
            "start_button": "Game Khulnai",
            "feedback_message": "Boro bhal! Nwng thik bostu khungnai.",
            "hint_message": "Bachai hma bhal khoromkha ni sai."
        },
        "Garo": {
            "title": "Bostuko niobo",
            "description": "Identify familiar objects.",
            "instructions": "Bosturangko niobo, seokbo.",
            "start_button": "A·bachengbo",
            "feedback_message": "Namgipa kam!",
            "hint_message": "Mese·pil·bo"
        }
    },

    # =====================================================
    # GAME 4 — FIND THE DIFFERENT ONE
    # =====================================================
    4: {
        "English": {
            "title": "Find the Different One",
            "description": "Improve attention and concentration by identifying the different item.",
            "instructions": "Look carefully and select the item that is different from the others.",
            "start_button": "Start Game",
            "feedback_message": "Great job! You found the different item.",
            "hint_message": "Compare the items carefully."
        },
        "Assamese": {
            "title": "বেলেগটো বিচাৰি উলিয়াওক",
            "description": "বেলেগ বস্তু চিনাক্ত কৰি মনোযোগ আৰু একাগ্ৰতা উন্নত কৰক।",
            "instructions": "ভালদৰে চাওক আৰু আনবোৰতকৈ বেলেগ বস্তুটো বাছনি কৰক।",
            "start_button": "খেল আৰম্ভ কৰক",
            "feedback_message": "বৰ ভাল! আপুনি বেলেগ বস্তুটো বিচাৰি পাইছে।",
            "hint_message": "বস্তুবোৰ ভালদৰে তুলনা কৰক।",
        },
        "Bengali": {
            "title": "আলাদা বস্তুটি খুঁজুন",
            "description": "মনোযোগ এবং একাগ্রতা উন্নত করতে দল থেকে আলাদা বস্তুটি সনাক্ত করুন।",
            "instructions": "মনোযোগ দিয়ে দেখুন এবং বাকিদের থেকে আলাদা বস্তুটি বেছে নিন।",
            "start_button": "খেলা শুরু করুন",
            "feedback_message": "খুব ভালো! আপনি আলাদা বস্তুটি খুঁজে পেয়েছেন।",
            "hint_message": "বস্তুগুলির মধ্যে তুলনা করুন।"
        },
        "Meitei": {
            "title": "ꯑꯅꯧꯕ ꯑꯃ ꯐꯪꯕ",
            "description": "ꯑꯅꯧꯕ ꯄꯣꯠꯁꯛ ꯈꯪꯗꯨꯅꯥ ꯅꯣꯡꯃꯤꯠ ꯑꯃꯁꯨꯡ ꯑꯀꯥꯏꯕꯥ ꯁꯤꯡꯁꯤꯟꯅꯕꯥ꯫",
            "instructions": "ꯌꯦꯡꯖꯅꯅꯥ ꯌꯦꯡꯗꯨꯅꯥ ꯑꯅꯧꯕ ꯄꯣꯠꯁꯛ ꯑꯗꯨ ꯈꯟꯕꯤꯌꯨ꯫",
            "start_button": "ꯒꯦꪝ ꯍꯥꯏꯔꯕꯥ",
            "feedback_message": "ꯐꯖꯅꯥ ꯇꯧꯔꯦ! ꯑꯅꯧꯕ ꯄꯣꯠꯁꯛ ꯐꯪꯂꯦ꯫",
            "hint_message": "ꯄꯣꯠꯁꯛꯁꯤꯡ ꯃꯥꯟꯅꯗꯨꯅꯥ ꯌꯦꯡꯕꯤꯌꯨꪫ"
        },
        "Khasi": {
            "title": "Lap ïa Kaba Ïapher",
            "description": "Pynbha ïa ka jingpyrkhat bad jingpynleit jingmut da kaba lap ïa kaba ïapher.",
            "instructions": "Peit bha bad jied ïa ka tiar kaba ïapher na kiwei pat.",
            "start_button": "Sdang ka Game",
            "feedback_message": "Ka long kaba bha! Phi la lap ïa kaba ïapher.",
            "hint_message": "Pynïanujor bha ïa ki tiar."
        },
        "Mizo": {
            "title": "Danglam Zawn",
            "description": "Thil danglam hriat chhuahin ngaihtuahna leh concentration siamthat tur.",
            "instructions": "Fîmkhur taka en la, thil danglam chu thlang rawh.",
            "start_button": "Game Tan",
            "feedback_message": "Tha tak! Thil danglam chu i hmu.",
            "hint_message": "Thil te fîmkhur taka tehkhin rawh."
        },
        "Nagamese": {
            "title": "Different Tu Bisarok",
            "description": "Different item chinibo aru monojog aru concentration bhal koribo.",
            "instructions": "Bhalke sai aru sobor pora different item tu select korok.",
            "start_button": "Game Suru Korok",
            "feedback_message": "Bohut bhal! Apuni different item tu bisari paisa.",
            "hint_message": "Item bilak bhalke compare korok."
        },
        "Nepali": {
            "title": "फरक वस्तु खोज्नुहोस्",
            "description": "फरक वस्तु पहिचान गरेर ध्यान र एकाग्रता सुधार गर्नुहोस्।",
            "instructions": "ध्यान दिएर हेर्नुहोस् र अरूभन्दा फरक वस्तु छान्नुहोस्।",
            "start_button": "खेल सुरु गर्नुहोस्",
            "feedback_message": "धेरै राम्रो! तपाईंले फरक वस्तु फेला पार्नुभयो।",
            "hint_message": "वस्तुहरू ध्यानपूर्वक तुलना गर्नुहोस्।"
        },
        "Kokborok": {
            "title": "Beda Bostu Khungnai",
            "description": "Beda bostu khungnai no monojog aro concentration khoromkha.",
            "instructions": "Bhal khoromkha ni sai aro bising bostu khou bachai.",
            "start_button": "Game Khulnai",
            "feedback_message": "Boro bhal! Nwng beda bostu khungnai.",
            "hint_message": "Bostu bilak bhal khoromkha ni tulona korok."
        },
        "Garo": {
            "title": "Dingtanggipako seokbo",
            "description": "Identify the different item.",
            "instructions": "Chongmot dingtanggipako bisarobo.",
            "start_button": "A·bachengbo",
            "feedback_message": "Namgipa kam!",
            "hint_message": "Mese·pil·bo"
        }
    },

    # =====================================================
    # GAME 5 — MOOD & MEMORY STORIES
    # =====================================================
    5: {
        "English": {
            "title": "Mood & Memory Stories",
            "description": "Emotional engagement through familiar stories, music and memories.",
            "instructions": "Listen to the story and answer the simple questions.",
            "start_button": "Start Story",
            "feedback_message": "Wonderful! Thank you for sharing your memory.",
            "hint_message": "Listen carefully and take your time."
        },
        "Assamese": {
            "title": "মনোভাৱ আৰু স্মৃতিৰ কাহিনী",
            "description": "চিনাকি কাহিনী, সংগীত আৰু স্মৃতিৰ জৰিয়তে মানসিক আৰু আৱেগিক সংযোগ বৃদ্ধি কৰক।",
            "instructions": "কাহিনীটো শুনক আৰু সহজ প্ৰশ্নবোৰৰ উত্তৰ দিয়ক।",
            "start_button": "কাহিনী আৰম্ভ কৰক",
            "feedback_message": "বৰ সুন্দৰ! আপোনাৰ স্মৃতি ভাগ-বতৰা কৰাৰ বাবে ধন্যবাদ।",
            "hint_message": "মনোযোগেৰে শুনক আৰু সময় লৈ উত্তৰ দিয়ক।"
        },
        "Bengali": {
            "title": "মনোভাব ও স্মৃতির গল্প",
            "description": "পরিচিত গল্প, সঙ্গীত এবং স্মৃতির মাধ্যমে আবেগপূর্ণ সংযোগ স্থাপন করুন।",
            "instructions": "গল্পটি শুনুন এবং সহজ প্রশ্নগুলির উত্তর দিন।",
            "start_button": "গল্প শুরু করুন",
            "feedback_message": "চমৎকার! আপনার স্মৃতি ভাগ করে নেওয়ার জন্য ধন্যবাদ।",
            "hint_message": "গল্পটি মনোযোগ সহকারে শুনুন।"
        },
        "Meitei": {
            "title": "ꯃꯣꯗ ꯑꯃꯁꯨꯡ ꯃꯦꯃꯣꯔꯤ ꯋꯥꯔꯤ",
            "description": "ꯈꯪꯕ ꯋꯥꯔꯤ, ꯁꯥꯎꯟꯗ ꯑꯃꯁꯨꯡ ꯃꯦꯃꯣꯔꯤ ꯃꯇꯦꯡꯅꯥ ꯑꯣꯏꯕꯥ ꯐꯖꯕ ꯑꯃꯁꯨꯡ ꯑꯦꯃꯣꯁꯟꯅꯥ ꯆꯠꯅꯕꯥ꯫",
            "instructions": "ꯋꯥꯔꯤ ꯇꯥꯕꯤꯌꯨ ꯑꯃꯁꯨꯡ ꯑꯆꯨꪝꯕ ꯋꯥꯍꯟꯁꯤꯡꯒꯤ ꯄꯥꯎꯈꯨꯝ ꯄꯤꯌꯨ꯫",
            "start_button": "ꯋꯥꯔꯤ ꯍꯥꯏꯔꯕꯥ",
            "feedback_message": "ꯌꯥꪝ ꯐꯖꯅꯥ! ꯅꯍꯥꯛꯀꯤ ꯃꯦꯃꯣꯔꯤ ꯁꯤꯟꯅꯕꯗꯥ ꯇꯥꯖꯕꯥ꯫",
            "hint_message": "ꯌꯥꪝ ꯐꯖꯅꯥ ꯇꯥꯕꯤꯌꯨ ꯑꯃꯁꯨꯡ ꯃꯇꯝ ꯂꯧꯅꯥ ꯄꯥꯎꯈꯨꪝ ꯄꯤꯌꯨ꯫"
        },
        "Khasi": {
            "title": "Ki Jingïathuhkhana bad Jingkynmaw",
            "description": "Pynïakynduh ïa ka jingsngew lyngba ki jingïathuhkhana, ka sur bad ki jingkynmaw kiba ithuh.",
            "instructions": "Sngap ïa ka jingïathuhkhana bad jubab ïa ki jingkylli kiba suk.",
            "start_button": "Sdang ka Jingïathuhkhana",
            "feedback_message": "Ka long kaba itynnad! Khublei ba phi la ïasam ïa ka jingkynmaw.",
            "hint_message": "Sngap bha bad shim por."
        },
        "Mizo": {
            "title": "Mood leh Hriatna Thawnthu",
            "description": "Thawnthu familiar, hla leh hriatna hmangin rilru leh emotion inzawmna siam tur.",
            "instructions": "Thawnthu chu ngai rawh, chutah zawhna awlsam te chhanna pe rawh.",
            "start_button": "Thawnthu Tan",
            "feedback_message": "Tih tak! I hriatna i share avangin lawmthu kan hrilh e.",
            "hint_message": "Fîmkhur taka ngai rawh, hun la la."
        },
        "Nagamese": {
            "title": "Mood aru Memory Story",
            "description": "Porichit story, music aru memory pora emotional aru mental engagement barhabole.",
            "instructions": "Story tu hunokoi hunok aru simple question bilak answer korok.",
            "start_button": "Story Suru Korok",
            "feedback_message": "Bohut bhal! Apuni nijor memory share kora karone dhonyobad.",
            "hint_message": "Bhalke hunok aru time loi answer korok."
        },
        "Nepali": {
            "title": "मूड र स्मृतिका कथाहरू",
            "description": "परिचित कथा, संगीत र सम्झनाहरू मार्फत भावनात्मक र मानसिक सहभागिता बढाउनुहोस्।",
            "instructions": "कथा सुन्नुहोस् र सरल प्रश्नहरूको उत्तर दिनुहोस्।",
            "start_button": "कथा सुरु गर्नुहोस्",
            "feedback_message": "अति राम्रो! आफ्नो स्मृति साझा गर्नुभएकोमा धन्यवाद।",
            "hint_message": "ध्यान दिएर सुन्नुहोस् र समय लिएर उत्तर दिनुहोस्।"
        },
        "Kokborok": {
            "title": "Mood aro Sikhi Khothok",
            "description": "Chini khothok, music aro sikhi no moner khushi aro emotional engagement barhabole.",
            "instructions": "Khothok khou sunai aro simple question bilakni jawab diok.",
            "start_button": "Khothok Khulnai",
            "feedback_message": "Boro bhal! Nwngni sikhi share khoromkha karone dhonnobad.",
            "hint_message": "Bhal khoromkha ni sunai, samay lai jawab diok."
        },
        "Garo": {
            "title": "Golipko knange",
            "description": "Listen to the story and answer questions.",
            "instructions": "Golipko knange chongmot sing·anirangko on·bo.",
            "start_button": "A·bachengbo",
            "feedback_message": "Namgipa kam!",
            "hint_message": "Mese·pil·bo"
        }
    }
}


# =========================================================
# SEED DATABASE
# =========================================================

def seed_localizations():

    db = SessionLocal()

    try:

        created = 0
        skipped = 0

        # Clean existing localizations to ensure fresh reseed
        db.query(GameLocalization).delete()
        db.commit()

        for game_id, language_content in LOCALIZED_CONTENT.items():

            # Check game
            game = (
                db.query(Game)
                .filter(Game.id == game_id)
                .first()
            )

            if not game:
                print(f"Game {game_id} not found. Skipping.")
                continue

            for language in LANGUAGES:

                content = language_content.get(language)

                if not content:
                    print(
                        f"Missing content: Game {game_id} - {language}"
                    )
                    continue

                localization = GameLocalization(
                    game_id=game_id,
                    language=language,
                    title=content["title"],
                    description=content["description"],
                    instructions=content["instructions"],
                    start_button=content["start_button"],
                    feedback_message=content["feedback_message"],
                    hint_message=content["hint_message"],
                    voice_enabled=True
                )

                db.add(localization)
                created += 1

        db.commit()

        print()
        print("========================================")
        print("Localization seeding completed")
        print("========================================")
        print(f"Created : {created}")
        print(f"Skipped : {skipped}")
        print("========================================")

    except Exception as e:

        db.rollback()
        print("ERROR:", e)

    finally:

        db.close()


if __name__ == "__main__":
    seed_localizations()