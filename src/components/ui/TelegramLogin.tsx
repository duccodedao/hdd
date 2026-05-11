import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export const TelegramLogin = ({ botUsername, onAuth, uid }: { botUsername: string, onAuth: (user: any) => void, uid: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-ignore
    window.onTelegramAuth = (user) => {
        onAuth(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    
    if(containerRef.current) containerRef.current.appendChild(script);
    
    return () => {
        if(containerRef.current) {
            // Clean up
        }
    };
  }, [botUsername, onAuth]);

  return <div ref={containerRef} />;
};
