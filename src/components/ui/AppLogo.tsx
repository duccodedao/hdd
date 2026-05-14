import React from 'react';
import { cn } from '../../lib/utils';

interface AppLogoProps {
  className?: string;
  isLoading?: boolean;
}

const AppLogo: React.FC<AppLogoProps> = ({ className, isLoading }) => {
  return (
    <div className={cn("relative flex items-center justify-center shrink-0", className)}>
      {/* Rotating circle around the logo when loading */}
      {isLoading && (
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200/10 border-t-blue-500 border-r-purple-500 animate-spin transition-opacity duration-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
      )}
      
      {/* Background glow */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-tr from-blue-400 via-purple-400 to-pink-400 blur-lg rounded-full transition-opacity duration-1000",
        isLoading ? "opacity-30 animate-pulse" : "opacity-10"
      )} />
      
      <img 
        src="https://tytpht.hdd.io.vn/img/bmassloadings.png" 
        alt="BMASS Logo" 
        className={cn(
          "w-full h-full object-contain relative z-10 transition-all duration-700 p-2",
          isLoading && "scale-90"
        )}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default AppLogo;
