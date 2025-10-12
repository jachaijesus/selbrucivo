#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Selbrucivo App
Tests all authentication, wallpaper, class, metrics, and admin APIs
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import sys

# Backend URL from environment
BACKEND_URL = "https://wellnesspaper.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.user_token = None
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
        if not success and response_data:
            print(f"   Response: {response_data}")
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        url = f"{BACKEND_URL}/auth/register"
        payload = {
            "username": "testuser",
            "password": "test123",
            "email": "test@example.com"
        }
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.user_token = data["access_token"]
                    self.log_result("User Registration", True, "User registered successfully")
                    return True
                else:
                    self.log_result("User Registration", False, "Missing token or user data", data)
            else:
                self.log_result("User Registration", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("User Registration", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        url = f"{BACKEND_URL}/auth/login"
        payload = {
            "username": "testuser",
            "password": "test123"
        }
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.user_token = data["access_token"]
                    self.log_result("User Login", True, "User logged in successfully")
                    return True
                else:
                    self.log_result("User Login", False, "Missing access token", data)
            else:
                self.log_result("User Login", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("User Login", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_user_me(self):
        """Test get current user endpoint"""
        if not self.user_token:
            self.log_result("User Me", False, "No user token available")
            return False
            
        url = f"{BACKEND_URL}/auth/me"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "username" in data:
                    self.log_result("User Me", True, "User profile retrieved successfully")
                    return True
                else:
                    self.log_result("User Me", False, "Missing user data fields", data)
            else:
                self.log_result("User Me", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("User Me", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_admin_registration(self):
        """Test admin registration endpoint"""
        url = f"{BACKEND_URL}/admin/auth/register"
        payload = {
            "username": "admin",
            "password": "admin123"
        }
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.log_result("Admin Registration", True, "Admin registered successfully")
                    return True
                else:
                    self.log_result("Admin Registration", False, "Missing access token", data)
            else:
                self.log_result("Admin Registration", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Admin Registration", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_admin_login(self):
        """Test admin login endpoint"""
        url = f"{BACKEND_URL}/admin/auth/login"
        payload = {
            "username": "admin",
            "password": "admin123"
        }
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.log_result("Admin Login", True, "Admin logged in successfully")
                    return True
                else:
                    self.log_result("Admin Login", False, "Missing access token", data)
            else:
                self.log_result("Admin Login", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Admin Login", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_wallpaper_today(self):
        """Test get today's wallpaper endpoint"""
        if not self.user_token:
            self.log_result("Wallpaper Today", False, "No user token available")
            return False
            
        url = f"{BACKEND_URL}/wallpapers/today"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_result("Wallpaper Today", True, "Today's wallpaper retrieved successfully")
                return True
            elif response.status_code == 404:
                self.log_result("Wallpaper Today", True, "No wallpaper available (expected when DB is empty)")
                return True
            else:
                self.log_result("Wallpaper Today", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Wallpaper Today", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_wallpaper_history(self):
        """Test get wallpaper history endpoint"""
        if not self.user_token:
            self.log_result("Wallpaper History", False, "No user token available")
            return False
            
        url = f"{BACKEND_URL}/wallpapers/history"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Wallpaper History", True, f"Wallpaper history retrieved ({len(data)} items)")
                    return True
                else:
                    self.log_result("Wallpaper History", False, "Response is not a list", data)
            else:
                self.log_result("Wallpaper History", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Wallpaper History", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_wallpaper_archive(self):
        """Test get timezone archive endpoint"""
        if not self.user_token:
            self.log_result("Wallpaper Archive", False, "No user token available")
            return False
            
        # Test with default timezone that user should have unlocked
        timezone = "America/New_York"
        url = f"{BACKEND_URL}/wallpapers/archive/{timezone}"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Wallpaper Archive", True, f"Archive retrieved for {timezone} ({len(data)} items)")
                    return True
                else:
                    self.log_result("Wallpaper Archive", False, "Response is not a list", data)
            elif response.status_code == 403:
                self.log_result("Wallpaper Archive", False, "Timezone not unlocked", response.text)
            else:
                self.log_result("Wallpaper Archive", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Wallpaper Archive", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_wallpaper_react(self):
        """Test wallpaper reaction endpoint"""
        if not self.user_token:
            self.log_result("Wallpaper React", False, "No user token available")
            return False
            
        # Use a dummy wallpaper ID for testing
        wallpaper_id = "test_wallpaper_id"
        url = f"{BACKEND_URL}/wallpapers/{wallpaper_id}/react"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        params = {"reaction_type": "like"}
        
        try:
            response = requests.post(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Wallpaper React", True, "Reaction saved successfully")
                    return True
                else:
                    self.log_result("Wallpaper React", False, "Missing message in response", data)
            else:
                self.log_result("Wallpaper React", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Wallpaper React", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_admin_wallpaper_upload(self):
        """Test admin wallpaper upload endpoint"""
        if not self.admin_token:
            self.log_result("Admin Wallpaper Upload", False, "No admin token available")
            return False
            
        # Create a small test image in base64
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        url = f"{BACKEND_URL}/admin/wallpapers/upload"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        payload = {
            "image_base64": test_image_b64,
            "creator_credit": "Test Artist",
            "timezone": "America/New_York",
            "date_assigned": datetime.utcnow().date().isoformat()
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "id" in data:
                    self.log_result("Admin Wallpaper Upload", True, "Wallpaper uploaded successfully")
                    return True
                else:
                    self.log_result("Admin Wallpaper Upload", False, "Missing message or id in response", data)
            else:
                self.log_result("Admin Wallpaper Upload", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Admin Wallpaper Upload", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_admin_wallpaper_history(self):
        """Test admin wallpaper history endpoint"""
        if not self.admin_token:
            self.log_result("Admin Wallpaper History", False, "No admin token available")
            return False
            
        url = f"{BACKEND_URL}/admin/wallpapers/history"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Admin Wallpaper History", True, f"Admin upload history retrieved ({len(data)} items)")
                    return True
                else:
                    self.log_result("Admin Wallpaper History", False, "Response is not a list", data)
            else:
                self.log_result("Admin Wallpaper History", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Admin Wallpaper History", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_class_create(self):
        """Test class creation endpoint"""
        if not self.user_token:
            self.log_result("Class Create", False, "No user token available")
            return False
            
        url = f"{BACKEND_URL}/classes/create"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        payload = {
            "name": "Test Wellness Class"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "class_id" in data:
                    self.log_result("Class Create", True, "Class created successfully")
                    return True
                else:
                    self.log_result("Class Create", False, "Missing message or class_id in response", data)
            else:
                self.log_result("Class Create", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Class Create", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_class_my_class(self):
        """Test get my class endpoint"""
        if not self.user_token:
            self.log_result("My Class", False, "No user token available")
            return False
            
        url = f"{BACKEND_URL}/classes/my-class"
        headers = {"Authorization": f"Bearer {self.user_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data is None:
                    self.log_result("My Class", True, "No class found (expected if user has no class)")
                elif "id" in data and "name" in data:
                    self.log_result("My Class", True, "User class retrieved successfully")
                else:
                    self.log_result("My Class", False, "Invalid class data structure", data)
                return True
            else:
                self.log_result("My Class", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("My Class", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_global_metrics(self):
        """Test global metrics endpoint (public)"""
        url = f"{BACKEND_URL}/metrics/global"
        
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["total_downloads", "device_types", "active_users", "users_checking_in", "completed_24h_checkins", "total_wallpapers"]
                if all(field in data for field in expected_fields):
                    self.log_result("Global Metrics", True, "Global metrics retrieved successfully")
                    return True
                else:
                    missing = [f for f in expected_fields if f not in data]
                    self.log_result("Global Metrics", False, f"Missing fields: {missing}", data)
            else:
                self.log_result("Global Metrics", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Global Metrics", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_admin_application_submit(self):
        """Test admin application submission (public endpoint)"""
        url = f"{BACKEND_URL}/admin/applications/submit"
        payload = {
            "name": "John Doe",
            "dob": "1990-01-01",
            "city": "New York",
            "state": "NY",
            "country": "USA",
            "social_links": ["https://twitter.com/johndoe"],
            "portfolio_links": ["https://johndoe.com"],
            "documents": ["base64_document_data"]
        }
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "application_id" in data:
                    self.log_result("Admin Application Submit", True, "Application submitted successfully")
                    return True
                else:
                    self.log_result("Admin Application Submit", False, "Missing message or application_id", data)
            else:
                self.log_result("Admin Application Submit", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Admin Application Submit", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_admin_application_list(self):
        """Test admin application list endpoint"""
        if not self.admin_token:
            self.log_result("Admin Application List", False, "No admin token available")
            return False
            
        url = f"{BACKEND_URL}/admin/applications/list"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Admin Application List", True, f"Applications list retrieved ({len(data)} items)")
                    return True
                else:
                    self.log_result("Admin Application List", False, "Response is not a list", data)
            else:
                self.log_result("Admin Application List", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_result("Admin Application List", False, f"Request failed: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("SELBRUCIVO BACKEND API TESTING")
        print("=" * 60)
        
        # Test user authentication
        print("\n🔐 USER AUTHENTICATION TESTS")
        self.test_user_registration()
        self.test_user_login()
        self.test_user_me()
        
        # Test admin authentication
        print("\n👑 ADMIN AUTHENTICATION TESTS")
        self.test_admin_registration()
        self.test_admin_login()
        
        # Test wallpaper APIs
        print("\n🖼️  WALLPAPER API TESTS")
        self.test_wallpaper_today()
        self.test_wallpaper_history()
        self.test_wallpaper_archive()
        self.test_wallpaper_react()
        
        # Test admin wallpaper APIs
        print("\n👑 ADMIN WALLPAPER API TESTS")
        self.test_admin_wallpaper_upload()
        self.test_admin_wallpaper_history()
        
        # Test class system
        print("\n🏫 CLASS SYSTEM TESTS")
        self.test_class_create()
        self.test_class_my_class()
        
        # Test metrics
        print("\n📊 METRICS API TESTS")
        self.test_global_metrics()
        
        # Test admin applications
        print("\n📝 ADMIN APPLICATION TESTS")
        self.test_admin_application_submit()
        self.test_admin_application_list()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # List failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)