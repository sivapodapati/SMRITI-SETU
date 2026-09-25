import unittest
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.user import User
from models.patient import Patient
from models.game import Game
from models.performance import GamePerformance
from models.recommendation import RecommendationHistory
from services.recommendation_engine import get_patient_recommendation, get_domain_profiles

class TestRecommendationEngine(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        
        # 1. Create a test user
        self.user_id = 888
        self.test_user = self.db.query(User).filter(User.id == self.user_id).first()
        if not self.test_user:
            self.test_user = User(
                id=self.user_id,
                name="Recommendation Test User",
                email="rec_test_user@example.com",
                role="patient",
                password="abc"
            )
            self.db.add(self.test_user)
            self.db.commit()
        
        # 2. Create a test patient
        self.patient_id = 888
        self.test_patient = self.db.query(Patient).filter(Patient.id == self.patient_id).first()
        if not self.test_patient:
            self.test_patient = Patient(
                id=self.patient_id,
                user_id=self.user_id,
                name="Test Patient B",
                language="English"
            )
            self.db.add(self.test_patient)
            self.db.commit()
            
        # 3. Ensure Games 1-5 exist in the DB
        self.games = {}
        for game_id in range(1, 6):
            game = self.db.query(Game).filter(Game.id == game_id).first()
            if not game:
                game = Game(
                    id=game_id,
                    title=f"Test Game {game_id}",
                    game_type="memory_recall",
                    difficulty="1",
                    is_active=True
                )
                self.db.add(game)
                self.db.commit()
            self.games[game_id] = game

        # Clean existing test records for this patient
        self.db.query(GamePerformance).filter(
            GamePerformance.patient_id == self.patient_id
        ).delete()
        self.db.query(RecommendationHistory).filter(
            RecommendationHistory.patient_id == self.patient_id
        ).delete()
        self.db.commit()

    def tearDown(self):
        # Cleanup test records
        self.db.query(GamePerformance).filter(
            GamePerformance.patient_id == self.patient_id
        ).delete()
        self.db.query(RecommendationHistory).filter(
            RecommendationHistory.patient_id == self.patient_id
        ).delete()
        self.db.commit()
        
        if self.test_patient:
            self.db.delete(self.test_patient)
        if self.test_user:
            self.db.delete(self.test_user)
        self.db.commit()
        self.db.close()

    def test_default_recommendation(self):
        # When no performance exists, should return a safe default recommendation
        result = get_patient_recommendation(self.db, self.patient_id)
        self.assertEqual(result["patient_id"], self.patient_id)
        self.assertIn(result["recommended_game_id"], [1, 2, 3, 4, 5])
        self.assertEqual(result["recommended_level"], 1)
        self.assertEqual(result["reason"], "Let's try a gentle cognitive activity today to start your brain exercise routine.")

    def test_lowest_domain_recommendation(self):
        # Give excellent performances for games 1, 2, 3, 5
        # and a low/struggle performance for game 4 (Attention / Concentration)
        for g_id in [1, 2, 3, 5]:
            p = GamePerformance(
                patient_id=self.patient_id,
                game_id=g_id,
                score=90.0,
                attempts=1,
                correct_answers=1,
                difficulty="2",
                engagement_score=90.0,
                status="completed"
            )
            self.db.add(p)
            
        # Game 4 is struggling
        p_fail = GamePerformance(
            patient_id=self.patient_id,
            game_id=4,
            score=30.0,
            attempts=5,
            correct_answers=1,
            difficulty="2",
            engagement_score=35.0,
            hints_used=3,
            status="failed"
        )
        self.db.add(p_fail)
        self.db.commit()

        # Recommendation should select Game 4 (Attention)
        result = get_patient_recommendation(self.db, self.patient_id)
        self.assertEqual(result["recommended_game_id"], 4)
        self.assertEqual(result["domain"], "attention_concentration")
        self.assertIn("Recent game performance in this activity area is lower", result["reason"])
        self.assertEqual(result["flow_zone"], "support_offered")

    def test_repetition_prevention(self):
        # If Game 4 is the lowest domain but was played in the absolute last session,
        # repetition penalty should push the engine to select the next best game.
        for g_id in [1, 2, 3, 5]:
            p = GamePerformance(
                patient_id=self.patient_id,
                game_id=g_id,
                score=80.0,
                attempts=1,
                correct_answers=1,
                difficulty="2",
                engagement_score=80.0,
                status="completed"
            )
            self.db.add(p)
            
        p_fail = GamePerformance(
            patient_id=self.patient_id,
            game_id=4,
            score=30.0,
            attempts=5,
            correct_answers=1,
            difficulty="2",
            engagement_score=35.0,
            hints_used=3,
            status="failed"
        )
        self.db.add(p_fail)
        self.db.commit()

        # Re-query and verify Game 4 was recommended first
        result1 = get_patient_recommendation(self.db, self.patient_id)
        self.assertEqual(result1["recommended_game_id"], 4)

        # Now suppose they just played Game 4 in the very last session (latest record)
        # Re-running recommendation should recommend a different game because of repetition penalty
        result2 = get_patient_recommendation(self.db, self.patient_id)
        self.assertNotEqual(result2["recommended_game_id"], 4)
