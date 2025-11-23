import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed text-sm relative overflow-hidden";
  
  const variants = {
    primary: "bg-yellow-500 text-black shadow-lg shadow-yellow-900/20",
    secondary: "bg-zinc-800 text-zinc-100",
    outline: "border border-zinc-700 text-zinc-300 bg-transparent",
    ghost: "text-zinc-400 hover:bg-zinc-800",
    danger: "bg-red-900/50 text-red-200 border border-red-800"
  };

  const hoverVariants = {
    primary: { scale: 1.02, backgroundColor: '#EAB308' }, // yellow-500
    secondary: { scale: 1.02, backgroundColor: '#3f3f46' }, // zinc-700
    outline: { scale: 1.02, borderColor: '#EAB308', color: '#EAB308' },
    ghost: { scale: 1.02, color: '#F4F4F5' }, // zinc-100
    danger: { scale: 1.02, backgroundColor: '#7f1d1d' } // red-900
  };

  const tapVariants = { scale: 0.96 };

  return (
    <motion.button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? hoverVariants[variant] : undefined}
      whileTap={!disabled && !isLoading ? tapVariants : undefined}
      initial={false}
      layout
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