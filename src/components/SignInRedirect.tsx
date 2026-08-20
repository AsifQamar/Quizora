import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";

export function SignInRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && !hasRedirected.current) {
      // Only redirect to dashboard if the user is on the root landing page ('/')
      if (location.pathname === "/") {
        hasRedirected.current = true;
        navigate("/dashboard");
      }
    }
  }, [isSignedIn, isLoaded, navigate, location.pathname]);

  return null;
}
