import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}
