"""
Test suite for SMART Goals Weekly System
Testing endpoints:
- POST /api/purpose/goals - Create new goal with target_days
- POST /api/purpose/goals/{goal_id}/toggle-day - Toggle day completion
- GET /api/purpose/goals - List goals with weekly_progress
- GET /api/purpose/goals/monthly-analysis - Get monthly analysis
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://nelson-triggers.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "paciente@sinadicciones.org"
TEST_PASSWORD = "demo123"


class TestSMARTGoals:
    """Test suite for SMART Goals Weekly System"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"No session_token in response: {data}"
        return data["session_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ============== GET Goals Tests ==============
    
    def test_get_goals_success(self, auth_headers):
        """Test GET /api/purpose/goals - should return list of goals"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"GET goals failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Found {len(data)} existing goals")
    
    def test_get_goals_unauthorized(self):
        """Test GET /api/purpose/goals without auth - should return 401"""
        response = requests.get(f"{BASE_URL}/api/purpose/goals")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    # ============== CREATE Goal Tests ==============
    
    def test_create_goal_success(self, auth_headers):
        """Test POST /api/purpose/goals - create goal with target_days"""
        goal_data = {
            "area": "health",
            "title": "TEST_Meditar 10 minutos cada mañana",
            "description": "Practicar meditación matutina para reducir ansiedad",
            "target_days": 5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals",
            json=goal_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create goal failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True, f"Expected success=True, got {data}"
        assert "goal_id" in data, f"No goal_id in response: {data}"
        assert data["goal_id"].startswith("goal_"), f"Invalid goal_id format: {data['goal_id']}"
        
        print(f"Created goal with ID: {data['goal_id']}")
        
        # Store goal_id for later tests
        TestSMARTGoals.created_goal_id = data["goal_id"]
    
    def test_create_goal_with_different_target_days(self, auth_headers):
        """Test creating goal with different target_days values"""
        goal_data = {
            "area": "relationships",
            "title": "TEST_Llamar a familia 3 veces por semana",
            "description": "Mantener conexión familiar",
            "target_days": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals",
            json=goal_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create goal failed: {response.text}"
        data = response.json()
        assert data.get("success") is True
        
        # Verify goal was created correctly by fetching it
        get_response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        goals = get_response.json()
        
        # Find the created goal
        created_goal = next((g for g in goals if g.get("goal_id") == data["goal_id"]), None)
        assert created_goal is not None, f"Could not find created goal {data['goal_id']}"
        assert created_goal.get("target_days") == 3, f"Expected target_days=3, got {created_goal.get('target_days')}"
        
        print(f"Goal created with target_days=3 verified")
        
        # Store for cleanup
        TestSMARTGoals.created_goal_id_2 = data["goal_id"]
    
    def test_create_goal_default_target_days(self, auth_headers):
        """Test that goal defaults to target_days=5 if not specified"""
        goal_data = {
            "area": "work",
            "title": "TEST_Trabajar en proyecto personal",
            "description": "Avanzar en desarrollo de habilidades"
            # Note: no target_days specified
        }
        
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals",
            json=goal_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create goal failed: {response.text}"
        data = response.json()
        
        # Verify goal has default target_days
        get_response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            headers=auth_headers
        )
        goals = get_response.json()
        
        created_goal = next((g for g in goals if g.get("goal_id") == data["goal_id"]), None)
        assert created_goal is not None
        assert created_goal.get("target_days") == 5, f"Expected default target_days=5, got {created_goal.get('target_days')}"
        
        print(f"Goal defaulted to target_days=5 as expected")
        
        # Store for cleanup
        TestSMARTGoals.created_goal_id_3 = data["goal_id"]
    
    # ============== TOGGLE Day Tests ==============
    
    def test_toggle_day_success(self, auth_headers):
        """Test POST /api/purpose/goals/{goal_id}/toggle-day - mark day as completed"""
        goal_id = getattr(TestSMARTGoals, 'created_goal_id', None)
        if not goal_id:
            pytest.skip("No goal_id from previous test")
        
        # Toggle Monday
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals/{goal_id}/toggle-day",
            json={"day": "mon"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Toggle day failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True
        assert data.get("day") == "mon"
        assert data.get("completed") is True, f"Expected completed=True, got {data.get('completed')}"
        assert "weekly_progress" in data
        assert data["weekly_progress"]["mon"] is True
        assert "completed_days" in data
        assert "progress" in data
        
        print(f"Monday toggled ON. Completed days: {data['completed_days']}, Progress: {data['progress']}%")
    
    def test_toggle_day_off(self, auth_headers):
        """Test toggling a day OFF after it was ON"""
        goal_id = getattr(TestSMARTGoals, 'created_goal_id', None)
        if not goal_id:
            pytest.skip("No goal_id from previous test")
        
        # Toggle Monday again (should turn OFF)
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals/{goal_id}/toggle-day",
            json={"day": "mon"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Toggle day failed: {response.text}"
        data = response.json()
        
        assert data.get("completed") is False, f"Expected completed=False, got {data.get('completed')}"
        assert data["weekly_progress"]["mon"] is False
        
        print(f"Monday toggled OFF. Completed days: {data['completed_days']}")
    
    def test_toggle_multiple_days(self, auth_headers):
        """Test toggling multiple days to verify progress calculation"""
        goal_id = getattr(TestSMARTGoals, 'created_goal_id', None)
        if not goal_id:
            pytest.skip("No goal_id from previous test")
        
        # Toggle multiple days
        days_to_toggle = ["mon", "tue", "wed"]
        
        for day in days_to_toggle:
            response = requests.post(
                f"{BASE_URL}/api/purpose/goals/{goal_id}/toggle-day",
                json={"day": day},
                headers=auth_headers
            )
            assert response.status_code == 200, f"Toggle {day} failed: {response.text}"
        
        # Verify final state
        get_response = requests.get(
            f"{BASE_URL}/api/purpose/goals",
            headers=auth_headers
        )
        goals = get_response.json()
        
        goal = next((g for g in goals if g.get("goal_id") == goal_id), None)
        assert goal is not None
        
        weekly_progress = goal.get("weekly_progress", {})
        completed_count = sum(1 for v in weekly_progress.values() if v)
        
        print(f"After toggling {days_to_toggle}: {completed_count} days completed")
        print(f"Weekly progress: {weekly_progress}")
        print(f"Progress: {goal.get('progress')}%")
    
    def test_toggle_day_invalid_day(self, auth_headers):
        """Test toggle with invalid day name - should return 400"""
        goal_id = getattr(TestSMARTGoals, 'created_goal_id', None)
        if not goal_id:
            pytest.skip("No goal_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals/{goal_id}/toggle-day",
            json={"day": "invalid_day"},
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid day, got {response.status_code}"
    
    def test_toggle_day_nonexistent_goal(self, auth_headers):
        """Test toggle with non-existent goal_id - should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/purpose/goals/nonexistent_goal_123/toggle-day",
            json={"day": "mon"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for nonexistent goal, got {response.status_code}"
    
    # ============== Monthly Analysis Tests ==============
    
    def test_monthly_analysis_success(self, auth_headers):
        """Test GET /api/purpose/goals/monthly-analysis - basic test"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals/monthly-analysis",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Monthly analysis failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True
        assert "month" in data
        assert "year" in data
        assert "month_name" in data
        assert "summary" in data
        assert "goals" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_goals" in summary
        assert "total_weeks" in summary
        assert "weeks_achieved" in summary
        assert "week_achievement_rate" in summary
        assert "total_days_completed" in summary
        assert "total_days_target" in summary
        assert "day_completion_rate" in summary
        assert "performance_level" in summary
        assert "performance_message" in summary
        
        print(f"Monthly analysis for {data['month_name']} {data['year']}:")
        print(f"  Total goals: {summary['total_goals']}")
        print(f"  Weeks achieved: {summary['weeks_achieved']}/{summary['total_weeks']}")
        print(f"  Week achievement rate: {summary['week_achievement_rate']}%")
        print(f"  Performance level: {summary['performance_level']}")
    
    def test_monthly_analysis_specific_month(self, auth_headers):
        """Test monthly analysis with specific month/year parameters"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals/monthly-analysis?month=1&year=2026",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Monthly analysis failed: {response.text}"
        data = response.json()
        
        assert data["month"] == 1
        assert data["year"] == 2026
        assert data["month_name"] == "Enero"
        
        print(f"Successfully retrieved analysis for January 2026")
    
    def test_monthly_analysis_goals_structure(self, auth_headers):
        """Test that each goal in monthly analysis has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals/monthly-analysis",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        goals_analysis = data.get("goals", [])
        
        if goals_analysis:
            goal = goals_analysis[0]
            
            # Verify goal analysis structure
            assert "goal_id" in goal
            assert "title" in goal
            assert "area" in goal
            assert "target_days" in goal
            assert "weeks_in_month" in goal
            assert "weeks_achieved" in goal
            assert "total_days_completed" in goal
            assert "total_days_target" in goal
            assert "achievement_rate" in goal
            assert "week_details" in goal
            
            print(f"Goal analysis structure verified for: {goal['title']}")
            print(f"  Achievement rate: {goal['achievement_rate']}%")
            print(f"  Weeks achieved: {goal['weeks_achieved']}/{goal['weeks_in_month']}")
    
    def test_monthly_analysis_performance_levels(self, auth_headers):
        """Test that performance level is one of valid values"""
        response = requests.get(
            f"{BASE_URL}/api/purpose/goals/monthly-analysis",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_levels = ["excelente", "bueno", "regular", "necesita_atencion"]
        performance_level = data["summary"]["performance_level"]
        
        assert performance_level in valid_levels, f"Invalid performance level: {performance_level}"
        print(f"Performance level '{performance_level}' is valid")
    
    # ============== Cleanup ==============
    
    def test_cleanup_test_goals(self, auth_headers):
        """Delete test goals created during tests"""
        test_goal_ids = [
            getattr(TestSMARTGoals, 'created_goal_id', None),
            getattr(TestSMARTGoals, 'created_goal_id_2', None),
            getattr(TestSMARTGoals, 'created_goal_id_3', None)
        ]
        
        deleted_count = 0
        for goal_id in test_goal_ids:
            if goal_id:
                response = requests.delete(
                    f"{BASE_URL}/api/purpose/goals/{goal_id}",
                    headers=auth_headers
                )
                if response.status_code == 200:
                    deleted_count += 1
                    print(f"Deleted test goal: {goal_id}")
        
        print(f"Cleanup complete: {deleted_count} test goals deleted")


class TestLoginAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "session_token" in data
        assert "user_id" in data
        
        print(f"Login successful for {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials - should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@test.com", "password": "wrongpass"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
