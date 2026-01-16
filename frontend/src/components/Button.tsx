import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';

/**
 * Button variant types - maps to MUI variants
 */
export type ButtonVariant = 'contained' | 'outlined' | 'text';

/**
 * Button color types - maps to MUI colors
 */
export type ButtonColor = 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info' | 'inherit';

/**
 * Button size types - maps to MUI sizes
 */
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Button component props - extends MUI ButtonProps
 * Supports anchor props when component="a" is used
 */
export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'color' | 'size'> {
  /**
   * Visual style variant (contained = primary, outlined = outline, text = ghost)
   */
  variant?: ButtonVariant;
  
  /**
   * Color scheme (primary, secondary, error for danger, etc.)
   */
  color?: ButtonColor;
  
  /**
   * Size of the button
   */
  size?: ButtonSize;
  
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
  
  /**
   * Icon to display before the button text
   */
  startIcon?: React.ReactNode;
  
  /**
   * Icon to display after the button text
   */
  endIcon?: React.ReactNode;
  
  /**
   * Target attribute for anchor links (when component="a")
   */
  target?: string;
  
  /**
   * Rel attribute for anchor links (when component="a")
   */
  rel?: string;
}

/**
 * Unified Button component using Material UI
 * Replaces: btn-undo, btn-import, login-button, btn-create-week, btn-delete-week, etc.
 * 
 * Usage:
 * - Primary button: <Button variant="contained" color="primary">Save</Button>
 * - Danger button: <Button variant="contained" color="error">Delete</Button>
 * - Secondary button: <Button variant="outlined">Cancel</Button>
 * - Ghost button: <Button variant="text">More</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  loading = false,
  startIcon,
  endIcon,
  children,
  disabled,
  ...props
}) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      size={size}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      endIcon={endIcon}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

