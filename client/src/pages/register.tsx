import { useLocation } from "wouter";
import { useEffect } from "react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/login"); }, []);
  return null;
}
