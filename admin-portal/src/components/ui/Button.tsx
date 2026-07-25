import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon';

const variantClass: Record<Variant, string> = {
  primary: 'kentiva-btn-primary',
  secondary: 'kentiva-btn-secondary',
  ghost: 'kentiva-btn-ghost',
  icon: 'kentiva-btn-icon',
};

const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    children?: ReactNode;
  }
>(function Button({ variant = 'primary', className = '', children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={`${variantClass[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
});

export default Button;
