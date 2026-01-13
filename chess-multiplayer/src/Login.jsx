import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import "./Login.css";

export default function Login({ setUser }) {

  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);


  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <div 
        className="mouse-glow" 
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />
      
      <div className="login-card">
        <h1>Welcome Back</h1>
        <p>Please sign in to continue</p>
        
        <button className="google-btn" onClick={login}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}