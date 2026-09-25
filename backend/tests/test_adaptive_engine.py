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
from services.adaptive_engine import calculate_next_level

class TestAdaptiveEngine(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        
        # 1. Create a test user
        self.user_id = 999
        self.test_user = self.db.query(User).filter(User.id == self.user_id).first()
        if not self.test_user:
            self.test_user = User(
                id=self.user_id,
                name="Test User",
                email="test_user@example.com",
                role="patient",
                password="abc"
            )
            self.db.add(self.test_user)
            self.db.commit()
        
        # 2. Create a test patient (Patient 999)
        self.patient_id = 999
        self.test_patient = self.db.query(Patient).filter(Patient.id == self.patient_id).first()
        if not self.test_patient:
            self.test_patient = Patient(
                id=self.patient_id,
                user_id=self.user_id,
                name="Test Patient A",
                language="English"
            )
            self.db.add(self.test_patient)
            self.db.commit()
            
        # 3. Ensure Game 2 (Familiar Picture Matching) exists
        self.game_id = 2
        self.game = self.db.query(Game).filter(Game.id == self.game_id).first()
        if not self.game:
            self.game = Game(
                id=self.game_id,
                title="Familiar Picture Matching",
                game_type="memory_recall",
                difficulty="1",
                is_active=True
            )
            self.db.add(self.game)
            self.db.commit()

        # Clean existing test performance records for this patient
        self.db.query(GamePerformance).filter(
            GamePerformance.patient_id == self.patient_id
        ).delete()
        self.db.commit()

    def tearDown(self):
        # Cleanup test records
        self.db.query(GamePerformance).filter(
            GamePerformance.patient_id == self.patient_id
        ).delete()
        self.db.commit()
        
        # Delete test patient and user
        if self.test_patient:
            self.db.delete(self.test_patient)
        if self.test_user:
            self.db.delete(self.test_user)
        self.db.commit()
        self.db.close()

    def test_default_start_level(self):
        # With no performance, next difficulty should be Level 1
        result = calculate_next_level(self.db, self.patient_id, self.game_id)
        self.assertEqual(result["current_level"], 1)
        self.assertEqual(result["next_level"], 1)
        self.assertEqual(result["decision"], "maintain")

    def test_adaptation_progression(self):
        # Insert an excellent performance at Level 3
        perf = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=95.0,
            attempts=3,
            correct_answers=3,
            difficulty="3",
            engagement_score=90.0,
            hints_used=0,
            status="completed"
        )
        self.db.add(perf)
        self.db.commit()

        # Calculate next difficulty
        result = calculate_next_level(self.db, self.patient_id, self.game_id)
        self.assertEqual(result["current_level"], 3)
        self.assertEqual(result["next_level"], 4)
        self.assertEqual(result["decision"], "increase")
        self.assertEqual(result["support_level"], "low")

    def test_adaptation_regression_single_struggle(self):
        # Insert a struggle attempt at Level 5
        perf = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=30.0,
            attempts=8,
            correct_answers=3,
            difficulty="5",
            engagement_score=35.0,
            hints_used=4,
            status="failed"
        )
        self.db.add(perf)
        self.db.commit()

        # Calculate next difficulty
        result = calculate_next_level(self.db, self.patient_id, self.game_id)
        self.assertEqual(result["current_level"], 5)
        self.assertEqual(result["next_level"], 4)
        self.assertEqual(result["decision"], "decrease")
        self.assertEqual(result["support_level"], "medium")

    def test_adaptation_regression_consecutive_struggles(self):
        # Insert two consecutive struggle attempts at Level 5
        perf1 = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=40.0,
            attempts=9,
            correct_answers=3,
            difficulty="5",
            engagement_score=30.0,
            hints_used=3,
            status="completed"
        )
        perf2 = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=20.0,
            attempts=10,
            correct_answers=2,
            difficulty="5",
            engagement_score=25.0,
            hints_used=4,
            status="failed"
        )
        self.db.add(perf1)
        self.db.add(perf2)
        self.db.commit()

        # Calculate next difficulty
        result = calculate_next_level(self.db, self.patient_id, self.game_id)
        self.assertEqual(result["current_level"], 5)
        self.assertEqual(result["next_level"], 4)
        self.assertEqual(result["decision"], "decrease")
        self.assertEqual(result["support_level"], "high")  # Should be high due to consecutive struggles!
        self.assertIn("struggled", result["reason"])

if __name__ == "__main__":
    unittest.main()
