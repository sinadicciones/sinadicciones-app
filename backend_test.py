#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for SinAdicciones Recovery App
Tests all FastAPI endpoints with proper authentication
"""

import requests
import json
import subprocess
import sys
from datetime import datetime, timezone, timedelta
import uuid

# Configuration
BACKEND_URL = "https://ia-therapy-app.preview.emergentagent.com/api"
TEST_USER_EMAIL = f"test.user.{int(datetime.now().timestamp())}@example.com"

class BackendTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_habit_id = None
        self.test_log_id = None
        self.test_emotional_log_id = None
        self.results = []
        
    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "response": response_data
        })
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def create_test_user_and_session(self):
        """Create test user and session in MongoDB"""
        print("Creating test user and session in MongoDB...")
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        session_token = f"test_session_{uuid.uuid4().hex[:12]}"
        
        mongo_script = f'''
use('test_database');
db.users.insertOne({{
  user_id: "{user_id}",
  email: "{TEST_USER_EMAIL}",
  name: "Test User Recovery",
  picture: "https://via.placeholder.com/150",
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  user_id: "{user_id}",
  session_token: "{session_token}",
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print("User created: {user_id}");
print("Session token: {session_token}");
'''
        
        try:
            result = subprocess.run(
                ["mongosh", "--eval", mongo_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.user_id = user_id
                self.session_token = session_token
                self.log_result("MongoDB User Creation", True, f"User ID: {user_id}, Session: {session_token[:20]}...")
                return True
            else:
                self.log_result("MongoDB User Creation", False, f"MongoDB error: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_result("MongoDB User Creation", False, f"Exception: {str(e)}")
            return False

    def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "ok":
                    self.log_result("Health Check", True, "Backend is healthy")
                    return True
                else:
                    self.log_result("Health Check", False, "Invalid health response format", data)
                    return False
            else:
                self.log_result("Health Check", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_auth_me(self):
        """Test authentication endpoint"""
        if not self.session_token:
            self.log_result("Auth Me", False, "No session token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data["user_id"] == self.user_id:
                    self.log_result("Auth Me", True, f"Authenticated user: {data['name']}")
                    return True
                else:
                    self.log_result("Auth Me", False, "User ID mismatch or missing", data)
                    return False
            else:
                self.log_result("Auth Me", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Auth Me", False, f"Exception: {str(e)}")
            return False

    def test_create_habit(self):
        """Test creating a habit"""
        if not self.session_token:
            self.log_result("Create Habit", False, "No session token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            habit_data = {
                "name": "Daily Meditation for Recovery",
                "frequency": "daily",
                "color": "#10B981",
                "icon": "🧘",
                "reminder_time": "08:00"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/habits",
                headers=headers,
                json=habit_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "habit_id" in data:
                    self.test_habit_id = data["habit_id"]
                    self.log_result("Create Habit", True, f"Created habit: {self.test_habit_id}")
                    return True
                else:
                    self.log_result("Create Habit", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Create Habit", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Habit", False, f"Exception: {str(e)}")
            return False

    def test_get_habits(self):
        """Test getting habits list"""
        if not self.session_token:
            self.log_result("Get Habits", False, "No session token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/habits", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    habit_found = False
                    if self.test_habit_id:
                        for habit in data:
                            if habit.get("habit_id") == self.test_habit_id:
                                habit_found = True
                                break
                    
                    if not self.test_habit_id or habit_found:
                        self.log_result("Get Habits", True, f"Retrieved {len(data)} habits")
                        return True
                    else:
                        self.log_result("Get Habits", False, "Created habit not found in list", data)
                        return False
                else:
                    self.log_result("Get Habits", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get Habits", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Habits", False, f"Exception: {str(e)}")
            return False

    def test_log_habit_completion(self):
        """Test logging habit completion"""
        if not self.session_token or not self.test_habit_id:
            self.log_result("Log Habit Completion", False, "No session token or habit ID available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            log_data = {
                "completed": True,
                "note": "Completed morning meditation session",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
            }
            
            response = requests.post(
                f"{BACKEND_URL}/habits/{self.test_habit_id}/log",
                headers=headers,
                json=log_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "log_id" in data:
                    self.test_log_id = data["log_id"]
                    self.log_result("Log Habit Completion", True, f"Logged completion: {self.test_log_id}")
                    return True
                else:
                    self.log_result("Log Habit Completion", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Log Habit Completion", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Log Habit Completion", False, f"Exception: {str(e)}")
            return False

    def test_get_habit_logs(self):
        """Test getting habit logs"""
        if not self.session_token or not self.test_habit_id:
            self.log_result("Get Habit Logs", False, "No session token or habit ID available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(
                f"{BACKEND_URL}/habits/{self.test_habit_id}/logs",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    log_found = False
                    if self.test_log_id:
                        for log in data:
                            if log.get("log_id") == self.test_log_id:
                                log_found = True
                                break
                    
                    if not self.test_log_id or log_found:
                        self.log_result("Get Habit Logs", True, f"Retrieved {len(data)} logs")
                        return True
                    else:
                        self.log_result("Get Habit Logs", False, "Created log not found", data)
                        return False
                else:
                    self.log_result("Get Habit Logs", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get Habit Logs", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Habit Logs", False, f"Exception: {str(e)}")
            return False

    def test_create_emotional_log(self):
        """Test creating emotional log"""
        if not self.session_token:
            self.log_result("Create Emotional Log", False, "No session token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            log_data = {
                "mood_scale": 7,
                "note": "Feeling positive after meditation and exercise",
                "tags": ["paz", "esperanza", "fortaleza"],
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
            }
            
            response = requests.post(
                f"{BACKEND_URL}/emotional-logs",
                headers=headers,
                json=log_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "log_id" in data:
                    self.test_emotional_log_id = data["log_id"]
                    self.log_result("Create Emotional Log", True, f"Created emotional log: {self.test_emotional_log_id}")
                    return True
                else:
                    self.log_result("Create Emotional Log", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Create Emotional Log", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Emotional Log", False, f"Exception: {str(e)}")
            return False

    def test_get_emotional_logs(self):
        """Test getting emotional logs"""
        if not self.session_token:
            self.log_result("Get Emotional Logs", False, "No session token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/emotional-logs", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    log_found = False
                    if self.test_emotional_log_id:
                        for log in data:
                            if log.get("log_id") == self.test_emotional_log_id:
                                log_found = True
                                break
                    
                    if not self.test_emotional_log_id or log_found:
                        self.log_result("Get Emotional Logs", True, f"Retrieved {len(data)} emotional logs")
                        return True
                    else:
                        self.log_result("Get Emotional Logs", False, "Created log not found", data)
                        return False
                else:
                    self.log_result("Get Emotional Logs", False, "Response is not a list", data)
                    return False
            else:
                self.log_result("Get Emotional Logs", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Emotional Logs", False, f"Exception: {str(e)}")
            return False

    def test_emotional_stats(self):
        """Test getting emotional statistics"""
        if not self.session_token:
            self.log_result("Emotional Stats", False, "No session token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/emotional-logs/stats", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["average_mood", "total_logs", "common_tags", "recent_logs"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Emotional Stats", True, f"Average mood: {data['average_mood']}, Total logs: {data['total_logs']}")
                    return True
                else:
                    self.log_result("Emotional Stats", False, "Missing required fields", data)
                    return False
            else:
                self.log_result("Emotional Stats", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Emotional Stats", False, f"Exception: {str(e)}")
            return False

    def test_get_profile(self):
        """Test getting user profile"""
        if not self.session_token:
            self.log_result("Get Profile", False, "No session token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/profile", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data["user_id"] == self.user_id:
                    self.log_result("Get Profile", True, "Retrieved user profile successfully")
                    return True
                else:
                    self.log_result("Get Profile", False, "Invalid profile data", data)
                    return False
            else:
                self.log_result("Get Profile", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Profile", False, f"Exception: {str(e)}")
            return False

    def test_update_profile(self):
        """Test updating user profile"""
        if not self.session_token:
            self.log_result("Update Profile", False, "No session token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            profile_data = {
                "addiction_type": "alcohol",
                "years_using": 5,
                "clean_since": "2024-01-01",
                "triggers": ["stress", "social situations", "loneliness"],
                "protective_factors": ["meditation", "exercise", "support group"],
                "emergency_contacts": [
                    {"name": "Dr. Martinez", "phone": "+1-555-0123", "relationship": "therapist"},
                    {"name": "Maria Rodriguez", "phone": "+1-555-0456", "relationship": "sponsor"}
                ],
                "my_why": "I want to be present for my family and live a meaningful life"
            }
            
            response = requests.put(
                f"{BACKEND_URL}/profile",
                headers=headers,
                json=profile_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Update Profile", True, "Profile updated successfully")
                    return True
                else:
                    self.log_result("Update Profile", False, "Update failed", data)
                    return False
            else:
                self.log_result("Update Profile", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Update Profile", False, f"Exception: {str(e)}")
            return False

    def test_dashboard_stats(self):
        """Test getting dashboard statistics"""
        if not self.session_token:
            self.log_result("Dashboard Stats", False, "No session token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/dashboard/stats", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_habits", "completion_rate", "longest_streak"]
                
                if all(field in data for field in required_fields):
                    self.log_result("Dashboard Stats", True, 
                                  f"Habits: {data['total_habits']}, Completion: {data['completion_rate']}%, Streak: {data['longest_streak']}")
                    return True
                else:
                    self.log_result("Dashboard Stats", False, "Missing required fields", data)
                    return False
            else:
                self.log_result("Dashboard Stats", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Exception: {str(e)}")
            return False

    def test_delete_habit(self):
        """Test deleting a habit"""
        if not self.session_token or not self.test_habit_id:
            self.log_result("Delete Habit", False, "No session token or habit ID available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.delete(
                f"{BACKEND_URL}/habits/{self.test_habit_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Delete Habit", True, f"Deleted habit: {self.test_habit_id}")
                    return True
                else:
                    self.log_result("Delete Habit", False, "Delete failed", data)
                    return False
            else:
                self.log_result("Delete Habit", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Delete Habit", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        print("Cleaning up test data...")
        
        mongo_script = f'''
use('test_database');
db.users.deleteMany({{email: "{TEST_USER_EMAIL}"}});
db.user_sessions.deleteMany({{user_id: "{self.user_id}"}});
db.habits.deleteMany({{user_id: "{self.user_id}"}});
db.habit_logs.deleteMany({{user_id: "{self.user_id}"}});
db.emotional_logs.deleteMany({{user_id: "{self.user_id}"}});
db.user_profiles.deleteMany({{user_id: "{self.user_id}"}});
print("Cleanup completed");
'''
        
        try:
            subprocess.run(["mongosh", "--eval", mongo_script], timeout=30)
            print("✅ Test data cleaned up successfully")
        except Exception as e:
            print(f"❌ Cleanup failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("SinAdicciones Backend API Testing")
        print("=" * 60)
        print()
        
        # Setup
        if not self.create_test_user_and_session():
            print("❌ Failed to create test user. Aborting tests.")
            return False
        
        # Core tests
        tests = [
            self.test_health_endpoint,
            self.test_auth_me,
            self.test_create_habit,
            self.test_get_habits,
            self.test_log_habit_completion,
            self.test_get_habit_logs,
            self.test_create_emotional_log,
            self.test_get_emotional_logs,
            self.test_emotional_stats,
            self.test_get_profile,
            self.test_update_profile,
            self.test_dashboard_stats,
            self.test_delete_habit
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        # Detailed results
        print("DETAILED RESULTS:")
        print("-" * 40)
        for result in self.results:
            print(f"{result['status']}: {result['test']}")
            if result['message']:
                print(f"   {result['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)