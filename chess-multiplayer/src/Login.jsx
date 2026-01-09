import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

export default function Login({ setUser }) {
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  };

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <button onClick={login}>Sign in with Google</button>
    </div>
  );
}
