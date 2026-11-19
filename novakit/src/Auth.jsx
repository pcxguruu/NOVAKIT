import { useState } from "react";
import { Eye, EyeOff, Sparkles, Mail, Lock, User } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

export default function Auth({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isSignup && name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      let result;
      if (isSignup) {
        result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: name.trim() });
      } else {
        result = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onLogin?.(result.user);
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account found. Please sign up first.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/operation-not-allowed": "Enable Email/Password sign-in in Firebase Console.",
      };
      setError(messages[err.code] || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Sparkles size={25} /></div>
          <h1>NOVAKIT</h1>
          <p>Your personal productivity space</p>
        </div>

        <div className="auth-heading">
          <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>
          <p>{isSignup ? "Create your account to get started." : "Sign in to continue to your workspace."}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="auth-input">
              <User size={18} />
              <input type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
          )}

          <div className="auth-input">
            <Mail size={18} />
            <input type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="auth-input">
            <Lock size={18} />
            <input type={showPassword ? "text" : "password"}
              placeholder="Password (minimum 6 characters)" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} />
            <button type="button" className="auth-eye"
              onClick={() => setShowPassword(value => !value)}
              aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-switch">
          {isSignup ? "Already have an account?" : "Don't have an account?"}
          <button type="button" onClick={() => { setIsSignup(value => !value); setError(""); }}>
            {isSignup ? " Sign In" : " Sign Up"}
          </button>
        </div>

        <p className="auth-footer">NOVAKIT · Your space. Your productivity.</p>
      </div>
    </div>
  );
}
