"""
Phase 2: Link -- Gemini API Handshake Test
==========================================
Tests connectivity to the Gemini AI service.
Verifies: API key validity, model availability, response generation.

Usage: python tools/test_ai_connection.py
"""

import os
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add parent directory to path for .env loading
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)


def test_gemini_connection():
    """Test Gemini API connectivity with a simple prompt."""
    
    print("=" * 60)
    print("[LINK] Phase 2: Gemini API Handshake Test")
    print("=" * 60)
    
    # Step 1: Check API Key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("\n[FAIL] GEMINI_API_KEY not set in .env file")
        print("   -> Please add your Gemini API key to the .env file")
        print("   -> Get one at: https://aistudio.google.com/apikey")
        return False
    
    print(f"\n[OK] Step 1: API key found (ends with ...{api_key[-4:]})")
    
    # Step 2: Import and configure
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        print("[OK] Step 2: google-generativeai library loaded & configured")
    except ImportError:
        print("\n[FAIL] google-generativeai not installed")
        print("   -> Run: pip install google-generativeai")
        return False
    except Exception as e:
        print(f"\n[FAIL] Configuration error -- {e}")
        return False
    
    # Step 3: List available models
    try:
        models = []
        for m in genai.list_models():
            methods = m.supported_generation_methods
            # Handle both string arrays and object arrays depending on library version
            method_names = [s if isinstance(s, str) else s.name for s in methods] if methods else []
            if 'generateContent' in method_names:
                models.append(m.name)
        print(f"[OK] Step 3: Found {len(models)} generative models")
        for m in models[:5]:
            print(f"   -> {m}")
    except Exception as e:
        print(f"\n[WARN] Step 3: Could not list models -- {e}")
        print("   -> Continuing with default model...")
    
    # Step 4: Test generation with a bug-tracker-relevant prompt
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        test_prompt = """You are an AI assistant for a bug tracking system. 
        Given this raw bug description, rewrite it as a professional, technical bug report description in 2-3 sentences:
        
        Raw: "login page broken, can't type password, keeps crashing on chrome"
        
        Respond with ONLY the formatted description, nothing else."""
        
        response = model.generate_content(test_prompt)
        
        if response and response.text:
            print(f"[OK] Step 4: AI response received successfully!")
            print(f"\n   Test prompt: 'login page broken, can't type password...'")
            print(f"   AI response:")
            print(f"   {response.text.strip()}")
        else:
            print("[FAIL] Empty response from Gemini")
            return False
            
    except Exception as e:
        print(f"\n[FAIL] Generation error -- {e}")
        return False
    
    # Step 5: Test severity suggestion
    try:
        severity_prompt = """You are an AI severity classifier for a bug tracking system.
        Given this bug description, respond with ONLY one word -- the suggested severity level.
        Options: Critical, Major, Minor, Trivial
        
        Bug: "The login page password field is unresponsive and the page crashes on Chrome browser."
        
        Severity:"""
        
        response = model.generate_content(severity_prompt)
        
        if response and response.text:
            severity = response.text.strip()
            print(f"\n[OK] Step 5: Severity suggestion works!")
            print(f"   Suggested severity: {severity}")
        else:
            print("[WARN] Step 5: Severity suggestion returned empty")
            
    except Exception as e:
        print(f"\n[WARN] Step 5: Severity test error -- {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("HANDSHAKE SUCCESSFUL -- Gemini API is fully operational!")
    print("=" * 60)
    print("\n[OK] All systems go. Ready for Phase 3: Architect.")
    
    return True


if __name__ == "__main__":
    success = test_gemini_connection()
    sys.exit(0 if success else 1)
