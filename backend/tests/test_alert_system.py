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
from models.alert import CaregiverAlert
from services.alert_service import check_and_generate_alerts

class TestAlertSystem(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        
        # 1. Create a test user
        self.user_id = 888
        self.test_user = self.db.query(User).filter(User.id == self.user_id).first()
        if not self.test_user:
            self.test_user = User(
                id=self.user_id,
                name="Test Alert User",
                email="test_alert_user@example.com",
                role="patient",
                password="abc"
            )
            self.db.add(self.test_user)
            self.db.commit()
        
        # 2. Create a test patient (Patient 888)
        self.patient_id = 888
        self.test_patient = self.db.query(Patient).filter(Patient.id == self.patient_id).first()
        if not self.test_patient:
            self.test_patient = Patient(
                id=self.patient_id,
                user_id=self.user_id,
                name="Test Alert Patient",
                language="English"
            )
            self.db.add(self.test_patient)
            self.db.commit()
            
        # 3. Ensure Game 1 exists
        self.game_id = 1
        self.game = self.db.query(Game).filter(Game.id == self.game_id).first()
        if not self.game:
            self.game = Game(
                id=self.game_id,
                title="Remember the Sequence",
                game_type="memory_recall",
                difficulty="1",
                is_active=True
            )
            self.db.add(self.game)
            self.db.commit()

        # Clean existing test performance and alert records for this patient
        self.db.query(GamePerformance).filter(
            GamePerformance.patient_id == self.patient_id
        ).delete()
        self.db.query(CaregiverAlert).filter(
            CaregiverAlert.patient_id == self.patient_id
        ).delete()
        self.db.commit()

    def tearDown(self):
        # Cleanup test records
        self.db.query(GamePerformance).filter(
            GamePerformance.patient_id == self.patient_id
        ).delete()
        self.db.query(CaregiverAlert).filter(
            CaregiverAlert.patient_id == self.patient_id
        ).delete()
        self.db.commit()
        
        # Delete test patient and user
        if self.test_patient:
            self.db.delete(self.test_patient)
        if self.test_user:
            self.db.delete(self.test_user)
        self.db.commit()
        self.db.close()

    def test_repeated_failures_alert(self):
        # Insert 2 failures
        for _ in range(2):
            p = GamePerformance(
                patient_id=self.patient_id,
                game_id=self.game_id,
                score=20.0,
                attempts=5,
                correct_answers=1,
                difficulty="3",
                status="failed"
            )
            self.db.add(p)
        self.db.commit()

        # Create current failing performance
        current_perf = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=15.0,
            attempts=5,
            correct_answers=1,
            difficulty="3",
            status="failed"
        )
        self.db.add(current_perf)
        self.db.commit()

        # Run alerts checker
        check_and_generate_alerts(self.db, current_perf, {})

        # Query created alerts
        alerts = self.db.query(CaregiverAlert).filter(
            CaregiverAlert.patient_id == self.patient_id,
            CaregiverAlert.alert_type == "Repeated Failures"
        ).all()
        self.assertTrue(len(alerts) >= 1)
        self.assertEqual(alerts[0].severity, "HIGH")

    def test_sudden_decline_alert(self):
        # Insert a good performance history
        for _ in range(3):
            p = GamePerformance(
                patient_id=self.patient_id,
                game_id=self.game_id,
                score=90.0,
                attempts=5,
                correct_answers=5,
                difficulty="4",
                status="completed"
            )
            self.db.add(p)
        self.db.commit()

        # Current performance is very bad (e.g. 30%)
        current_perf = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=30.0,
            attempts=5,
            correct_answers=1,
            difficulty="4",
            status="failed"
        )
        self.db.add(current_perf)
        self.db.commit()

        # Run alerts checker
        check_and_generate_alerts(self.db, current_perf, {})

        # Query alerts
        alerts = self.db.query(CaregiverAlert).filter(
            CaregiverAlert.patient_id == self.patient_id,
            CaregiverAlert.alert_type == "Performance Decline"
        ).all()
        self.assertTrue(len(alerts) >= 1)

    def test_milestone_improvement_alert(self):
        # Current perfect performance at Level 6
        current_perf = GamePerformance(
            patient_id=self.patient_id,
            game_id=self.game_id,
            score=100.0,
            attempts=5,
            correct_answers=5,
            difficulty="6",
            status="completed"
        )
        self.db.add(current_perf)
        self.db.commit()

        check_and_generate_alerts(self.db, current_perf, {})

        alerts = self.db.query(CaregiverAlert).filter(
            CaregiverAlert.patient_id == self.patient_id,
            CaregiverAlert.alert_type == "Milestone Improvement"
        ).all()
        self.assertTrue(len(alerts) >= 1)

if __name__ == "__main__":
    unittest.main()
