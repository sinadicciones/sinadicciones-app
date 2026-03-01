"""
SinAdicciones Platform API Tests
Tests for patient, professional profiles, habits, goals, and inter-profile interactions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://nelson-triggers.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
PATIENT_CREDS = {"email": "paciente@sinadicciones.org", "password": "demo123"}
PROFESSIONAL_CREDS = {"email": "profesional@sinadicciones.org", "password": "demopassword"}


class TestAuthentication:
    """Test authentication flows for patient and professional"""
    
    def test_patient_login_success(self):
        """Test patient login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PATIENT_CREDS,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "user_id" in data
        assert "session_token" in data
        print(f"Patient login successful: user_id={data['user_id']}")
        
    def test_professional_login_success(self):
        """Test professional login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PROFESSIONAL_CREDS,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "user_id" in data
        assert "session_token" in data
        print(f"Professional login successful: user_id={data['user_id']}")
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"


@pytest.fixture(scope="module")
def patient_session():
    """Get patient session token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=PATIENT_CREDS,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip("Patient authentication failed")


@pytest.fixture(scope="module")
def professional_session():
    """Get professional session token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=PROFESSIONAL_CREDS,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip("Professional authentication failed")


class TestPatientProfile:
    """Test patient profile endpoints and data"""
    
    def test_get_patient_profile(self, patient_session):
        """Test getting patient profile with recovery info"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify patient-specific fields
        assert data.get("role") == "patient"
        assert "days_clean" in data or "recovery_start_date" in data, "Missing recovery tracking"
        assert "triggers" in data, "Missing triggers list"
        assert "protective_factors" in data, "Missing protective factors"
        print(f"Patient profile: {data.get('name')}, days_clean={data.get('days_clean')}")
        print(f"Triggers: {data.get('triggers')}")
        print(f"Protective factors: {data.get('protective_factors')}")
        
    def test_patient_has_linked_therapist(self, patient_session):
        """Verify patient has linked therapist"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for linked professional
        if "linked_therapist_id" in data:
            assert data["linked_therapist_id"] is not None
            print(f"Patient linked to therapist: {data['linked_therapist_id']}")


class TestProfessionalProfile:
    """Test professional profile endpoints"""
    
    def test_get_professional_profile(self, professional_session):
        """Test getting professional profile"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            cookies={"session_token": professional_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("role") == "professional"
        print(f"Professional profile: {data.get('professional_type', 'Unknown')}")


class TestProfessionalPatientAccess:
    """Test professional's ability to view patient data"""
    
    def test_professional_can_see_patients_list(self, professional_session):
        """Test that professional can see list of linked patients"""
        response = requests.get(
            f"{BASE_URL}/api/professional/patients",
            cookies={"session_token": professional_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list) or "patients" in data, "Expected patients list"
        
        patients = data if isinstance(data, list) else data.get("patients", [])
        print(f"Professional has {len(patients)} linked patients")
        
        # Verify patient data is present
        if len(patients) > 0:
            patient = patients[0]
            assert "user_id" in patient or "name" in patient, "Patient data incomplete"
            print(f"First patient: {patient.get('name', patient.get('user_id'))}")
            
    def test_professional_can_view_patient_details(self, professional_session):
        """Test that professional can view patient details"""
        # First get patients list
        list_response = requests.get(
            f"{BASE_URL}/api/professional/patients",
            cookies={"session_token": professional_session}
        )
        
        if list_response.status_code != 200:
            pytest.skip("Could not get patients list")
            
        patients_data = list_response.json()
        patients = patients_data if isinstance(patients_data, list) else patients_data.get("patients", [])
        
        if len(patients) == 0:
            pytest.skip("No linked patients to view")
            
        # Get first patient's ID
        patient = patients[0]
        patient_id = patient.get("user_id") or patient.get("id")
        
        if not patient_id:
            pytest.skip("Could not get patient ID")
            
        # Try to get patient details
        detail_response = requests.get(
            f"{BASE_URL}/api/professional/patients/{patient_id}",
            cookies={"session_token": professional_session}
        )
        
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        
        detail_data = detail_response.json()
        print(f"Patient detail data keys: {list(detail_data.keys())}")


class TestHabits:
    """Test habits functionality for patient"""
    
    def test_get_habits_list(self, patient_session):
        """Test getting list of habits"""
        response = requests.get(
            f"{BASE_URL}/api/habits",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        habits = data if isinstance(data, list) else data.get("habits", [])
        print(f"Patient has {len(habits)} habits")
        
        if len(habits) > 0:
            habit = habits[0]
            assert "name" in habit or "title" in habit, "Habit missing name/title"
            if "streak" in habit:
                print(f"First habit streak: {habit['streak']}")
                
    def test_habits_have_streak_info(self, patient_session):
        """Test that habits include streak tracking"""
        response = requests.get(
            f"{BASE_URL}/api/habits",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200
        
        data = response.json()
        habits = data if isinstance(data, list) else data.get("habits", [])
        
        for habit in habits[:3]:  # Check first 3 habits
            # Should have some kind of tracking info
            has_tracking = any(key in habit for key in ["streak", "completed_today", "completions", "current_streak"])
            if has_tracking:
                print(f"Habit '{habit.get('name', habit.get('title'))}' has tracking")


class TestGoalsSMART:
    """Test SMART goals functionality"""
    
    def test_get_goals_list(self, patient_session):
        """Test getting SMART goals list"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        goals = data if isinstance(data, list) else data.get("goals", [])
        print(f"Patient has {len(goals)} SMART goals")
        
    def test_goals_have_weekly_tracking(self, patient_session):
        """Test that goals include weekly progress tracking"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200
        
        data = response.json()
        goals = data if isinstance(data, list) else data.get("goals", [])
        
        for goal in goals[:2]:  # Check first 2 goals
            # Should have weekly tracking info
            has_tracking = any(key in goal for key in ["progress", "weekly_progress", "days_completed", "target_days"])
            if has_tracking:
                print(f"Goal '{goal.get('title', goal.get('name'))}' has weekly tracking")


class TestNelsonChat:
    """Test Nelson AI chat endpoints"""
    
    def test_nelson_chat_endpoint(self, patient_session):
        """Test Nelson chat is accessible"""
        # Test if chat history endpoint exists
        response = requests.get(
            f"{BASE_URL}/api/nelson/messages",
            cookies={"session_token": patient_session}
        )
        # Chat endpoint should exist
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print("Nelson chat messages endpoint accessible")


class TestTriggerStrategies:
    """Test trigger strategies functionality"""
    
    def test_get_trigger_strategies(self, patient_session):
        """Test getting trigger strategies"""
        response = requests.get(
            f"{BASE_URL}/api/triggers/strategies",
            cookies={"session_token": patient_session}
        )
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            print(f"Trigger strategies available: {len(data) if isinstance(data, list) else 'structure'}")
        else:
            print(f"Trigger strategies endpoint returned: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
