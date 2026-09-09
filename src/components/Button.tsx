import { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium transition-colors rounded-lg focus-visible:outline-offset-2';

  const variants = {
    primary: 'bg-light-accent text-white hover:bg-emerald-800 dark:bg-dark-accent dark:text-zinc-900 dark:hover:bg-emerald-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 dark:bg-dark-surface dark:text-dark-text dark:hover:bg-gray-600',
    ghost: 'text-light-accent hover:bg-light-surface dark:text-dark-accent dark:hover:bg-dark-surface',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
