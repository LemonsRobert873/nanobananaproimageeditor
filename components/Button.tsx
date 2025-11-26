import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cyan';
  isLoading?: boolean;
  isProTheme?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  isProTheme = true,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed text-sm relative overflow-hidden";
  
  // Dynamic color selection
  const primaryClass = isProTheme 
    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-900/20 hover:bg-[#EAB308]"
    : "bg-cyan-500 text-black shadow-lg shadow-cyan-900/20 hover:bg-[#22d3ee]";
    
  const outlineClass = isProTheme
    ? "border border-zinc-700 text-zinc-300 bg-transparent hover:border-yellow-500 hover:text-yellow-500"
    : "border border-zinc-700 text-zinc-300 bg-transparent hover:border-cyan-400 hover:text-cyan-400";
    
  const ghostClass = isProTheme
      ? "text-zinc-400 hover:bg-zinc-800 hover:text-yellow-500"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-cyan-400";

  const variants = {
    primary: primaryClass,
    // Keep direct cyan access if explicitly requested, otherwise map
    cyan: "bg-cyan-500 text-black shadow-lg shadow-cyan-900/20 hover:bg-[#22d3ee]",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
    outline: outlineClass,
    ghost: ghostClass,
    danger: "bg-red-900/50 text-red-200 border border-red-800 hover:bg-red-900",
  };

  const tapVariants = { scale: 0.96 };

  // Note: Hover states are now handled via classes instead of motion variants for easier maintenance of dynamic colors,
  // except for scale which remains in motion

  return (
    <motion.button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isLoading ? tapVariants : undefined}
      initial={false}
      {...(props as any)}
    >
      {isLoading ? (
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </motion.div>
      ) : (
        <motion.div 
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {children}
        </motion.div>
      )}
    </motion.button>
  );
};

export default Button;