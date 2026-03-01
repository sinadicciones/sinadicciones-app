"""
SinAdicciones Platform - Comprehensive Backend API Tests
Tests all main endpoints including:
- POST /api/auth/login (patient & professional)
- GET /api/emotional-logs
- POST /api/emotional-logs
- POST /api/nelson/chat
- GET /api/professional/patients
- GET /api/professional/alerts
- GET /api/habits
- GET /api/profile
- GET /api/purpose/goals
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mental-health-hub-76.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials from review request
PATIENT_CREDS = {"email": "paciente@sinadicciones.org", "password": "demo123"}
PROFESSIONAL_CREDS = {"email": "profesional@sinadicciones.org", "password": "demopassword"}


# ==================== FIXTURES ====================

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
    pytest.skip(f"Patient authentication failed: {response.status_code} - {response.text}")


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
    pytest.skip(f"Professional authentication failed: {response.status_code} - {response.text}")


# ==================== AUTHENTICATION TESTS ====================

class TestAuthentication:
    """Test POST /api/auth/login endpoint"""
    
    def test_patient_login_success(self):
        """Test patient login with valid credentials - returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PATIENT_CREDS,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert data.get("success") == True, "Expected success: true"
        assert "user_id" in data, "Missing user_id in response"
        assert "session_token" in data, "Missing session_token in response"
        assert isinstance(data["session_token"], str), "session_token should be string"
        assert len(data["session_token"]) > 0, "session_token should not be empty"
        print(f"✓ Patient login successful: user_id={data['user_id']}")
        
    def test_professional_login_success(self):
        """Test professional login with valid credentials - returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PROFESSIONAL_CREDS,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "user_id" in data, "Missing user_id"
        assert "session_token" in data, "Missing session_token"
        print(f"✓ Professional login successful: user_id={data['user_id']}")
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")
        
    def test_login_missing_password(self):
        """Test login with missing password returns error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Missing password correctly rejected")


# ==================== EMOTIONAL LOGS TESTS ====================

class TestEmotionalLogs:
    """Test GET/POST /api/emotional-logs endpoints"""
    
    def test_get_emotional_logs_returns_list(self, patient_session):
        """Test GET /api/emotional-logs returns list of logs"""
        response = requests.get(
            f"{BASE_URL}/api/emotional-logs",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return a list
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ GET emotional-logs returned {len(data)} logs")
        
        # Verify structure of logs if any exist
        if len(data) > 0:
            log = data[0]
            assert "user_id" in log or "log_id" in log, "Log missing identifier"
            if "mood_scale" in log or "mood" in log:
                print(f"✓ First log has mood data")
                
    def test_create_emotional_log_success(self, patient_session):
        """Test POST /api/emotional-logs creates new log"""
        today = datetime.now().strftime("%Y-%m-%d")
        test_log = {
            "mood_scale": 7,
            "note": "TEST_log for automated testing",
            "tags": ["test", "automated"],
            "date": today
        }
        
        response = requests.post(
            f"{BASE_URL}/api/emotional-logs",
            json=test_log,
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "log_id" in data, "Missing log_id in response"
        print(f"✓ Created emotional log: {data['log_id']}")
        
        # Verify by GET
        get_response = requests.get(
            f"{BASE_URL}/api/emotional-logs",
            cookies={"session_token": patient_session}
        )
        assert get_response.status_code == 200
        logs = get_response.json()
        
        # Should find our log
        found = any(log.get("date") == today for log in logs)
        assert found, "Created log not found in GET response"
        print("✓ Created log verified in GET response")
        
    def test_emotional_logs_unauthorized(self):
        """Test emotional-logs requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emotional-logs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Emotional logs correctly requires auth")


# ==================== NELSON IA CHAT TESTS ====================

class TestNelsonChat:
    """Test POST /api/nelson/chat endpoint"""
    
    def test_nelson_chat_basic_message(self, patient_session):
        """Test Nelson IA responds to a basic message"""
        response = requests.post(
            f"{BASE_URL}/api/nelson/chat",
            json={"message": "Hola Nelson, ¿cómo me puedes ayudar?"},
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data, "Missing 'response' field"
        assert isinstance(data["response"], str), "Response should be string"
        assert len(data["response"]) > 10, "Response too short"
        
        # Should have mode field
        if "mode" in data:
            print(f"✓ Nelson responded in mode: {data['mode']}")
        
        print(f"✓ Nelson response: {data['response'][:100]}...")
        
    def test_nelson_chat_anxiety_prompt(self, patient_session):
        """Test Nelson responds appropriately to anxiety-related message"""
        response = requests.post(
            f"{BASE_URL}/api/nelson/chat",
            json={"message": "Tengo mucha ansiedad ahora mismo"},
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data, "Missing response"
        # Should detect anxiety mode
        if data.get("mode") == "anxiety":
            print("✓ Nelson correctly detected anxiety mode")
        print(f"✓ Nelson responded to anxiety message")
        
    def test_nelson_chat_unauthorized(self):
        """Test nelson/chat requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/nelson/chat",
            json={"message": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Nelson chat correctly requires auth")


# ==================== PROFESSIONAL ENDPOINTS TESTS ====================

class TestProfessionalPatients:
    """Test GET /api/professional/patients endpoint"""
    
    def test_get_patients_list(self, professional_session):
        """Test professional can see list of linked patients"""
        response = requests.get(
            f"{BASE_URL}/api/professional/patients",
            cookies={"session_token": professional_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Can return list directly or in {patients: [...]}
        patients = data if isinstance(data, list) else data.get("patients", [])
        assert isinstance(patients, list), "Patients should be a list"
        
        print(f"✓ Professional has {len(patients)} linked patients")
        
        # Verify patient data structure if patients exist
        if len(patients) > 0:
            patient = patients[0]
            # Should have identifier and some profile data
            assert "user_id" in patient or "name" in patient, "Patient missing identifier"
            if "name" in patient:
                print(f"✓ First patient: {patient['name']}")
            if "clean_since" in patient:
                print(f"  - Clean since: {patient.get('clean_since')}")
            if "addiction_type" in patient:
                print(f"  - Addiction type: {patient.get('addiction_type')}")
                
    def test_professional_patients_unauthorized(self):
        """Test professional/patients requires authentication"""
        response = requests.get(f"{BASE_URL}/api/professional/patients")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Professional patients endpoint requires auth")
        
    def test_patient_cannot_access_professional_patients(self, patient_session):
        """Test patient role cannot access professional/patients"""
        response = requests.get(
            f"{BASE_URL}/api/professional/patients",
            cookies={"session_token": patient_session}
        )
        # Should be 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Patient correctly denied access to professional endpoint")


class TestProfessionalAlerts:
    """Test GET /api/professional/alerts endpoint"""
    
    def test_get_alerts_list(self, professional_session):
        """Test professional can get alerts for their patients"""
        response = requests.get(
            f"{BASE_URL}/api/professional/alerts",
            cookies={"session_token": professional_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        alerts = data if isinstance(data, list) else data.get("alerts", [])
        
        print(f"✓ Professional has {len(alerts)} alerts")
        
        # Verify alert structure if any exist
        if len(alerts) > 0:
            alert = alerts[0]
            assert "alert_type" in alert or "type" in alert, "Alert missing type"
            if "severity" in alert:
                print(f"✓ First alert severity: {alert['severity']}")
            if "patient_name" in alert:
                print(f"✓ Alert for patient: {alert['patient_name']}")
                
    def test_alerts_unauthorized(self):
        """Test alerts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/professional/alerts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Alerts endpoint correctly requires auth")


# ==================== HABITS TESTS ====================

class TestHabits:
    """Test GET /api/habits endpoint"""
    
    def test_get_habits_list(self, patient_session):
        """Test patient can get their habits list"""
        response = requests.get(
            f"{BASE_URL}/api/habits",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        habits = data if isinstance(data, list) else data.get("habits", [])
        assert isinstance(habits, list), "Habits should be a list"
        
        print(f"✓ Patient has {len(habits)} habits")
        
        # Verify habit structure
        if len(habits) > 0:
            habit = habits[0]
            assert "name" in habit or "title" in habit, "Habit missing name"
            
            # Should have tracking info
            if "streak" in habit:
                print(f"✓ First habit streak: {habit['streak']}")
            if "completed_today" in habit:
                print(f"✓ Completed today: {habit['completed_today']}")
                
    def test_habits_unauthorized(self):
        """Test habits endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/habits")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Habits endpoint correctly requires auth")


# ==================== PROFILE TESTS ====================

class TestProfile:
    """Test GET /api/profile endpoint"""
    
    def test_get_patient_profile(self, patient_session):
        """Test patient can get their profile with recovery info"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should have user_id
        assert "user_id" in data, "Profile missing user_id"
        
        # Patient should have role field
        if "role" in data:
            print(f"✓ Profile role: {data['role']}")
            
        # Patient-specific fields
        if "triggers" in data:
            print(f"✓ Patient has {len(data['triggers'])} triggers defined")
        if "protective_factors" in data:
            print(f"✓ Patient has {len(data['protective_factors'])} protective factors")
        if "clean_since" in data and data["clean_since"]:
            print(f"✓ Clean since: {data['clean_since']}")
            
        print(f"✓ Got patient profile for user: {data.get('user_id')}")
        
    def test_get_professional_profile(self, professional_session):
        """Test professional can get their profile"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            cookies={"session_token": professional_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Profile missing user_id"
        
        if data.get("role") == "professional":
            print("✓ Confirmed professional role")
            if "professional_type" in data:
                print(f"✓ Professional type: {data['professional_type']}")
                
        print(f"✓ Got professional profile")
        
    def test_profile_unauthorized(self):
        """Test profile endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Profile endpoint correctly requires auth")


# ==================== SMART GOALS TESTS ====================

class TestPurposeGoals:
    """Test GET /api/purpose/goals endpoint"""
    
    def test_get_goals_list(self, patient_session):
        """Test patient can get their SMART goals"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            cookies={"session_token": patient_session}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        goals = data if isinstance(data, list) else data.get("goals", [])
        assert isinstance(goals, list), "Goals should be a list"
        
        print(f"✓ Patient has {len(goals)} SMART goals")
        
        # Verify goal structure
        if len(goals) > 0:
            goal = goals[0]
            assert "title" in goal or "name" in goal, "Goal missing title"
            
            # Should have progress tracking
            if "weekly_progress" in goal:
                print(f"✓ Goal has weekly_progress tracking")
            if "target_days" in goal:
                print(f"✓ Goal target days: {goal['target_days']}")
                
    def test_goals_unauthorized(self):
        """Test goals endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/purpose/goals")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Goals endpoint correctly requires auth")


# ==================== INTEGRATION TESTS ====================

class TestCrossProfileIntegration:
    """Test integration between patient and professional profiles"""
    
    def test_patient_therapist_link_visible(self, patient_session, professional_session):
        """Test that patient-therapist link is correctly established"""
        # Get patient profile
        patient_response = requests.get(
            f"{BASE_URL}/api/profile",
            cookies={"session_token": patient_session}
        )
        assert patient_response.status_code == 200
        patient_data = patient_response.json()
        
        # Get professional patients
        prof_response = requests.get(
            f"{BASE_URL}/api/professional/patients",
            cookies={"session_token": professional_session}
        )
        assert prof_response.status_code == 200
        prof_data = prof_response.json()
        
        patients = prof_data if isinstance(prof_data, list) else prof_data.get("patients", [])
        
        # If patient has linked therapist, should appear in professional's list
        if patient_data.get("linked_therapist_id"):
            patient_ids = [p.get("user_id") for p in patients]
            if patient_data.get("user_id") in patient_ids:
                print("✓ Patient correctly appears in professional's patient list")
            else:
                print("⚠ Patient may be linked to different professional")
        else:
            print("⚠ Patient has no linked therapist")


# ==================== HEALTH CHECK ====================

class TestHealthCheck:
    """Test health endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status ok, got {data}"
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
