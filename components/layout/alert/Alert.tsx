import * as React from "react"
import styles from './Alert.module.scss'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={`${styles.alert} ${styles[variant]} ${className}`}
        {...props} 
      />
    )
  }
)
Alert.displayName = "Alert"

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className = "", ...props }, ref) => (
    <h5
      ref={ref}
      className={`${styles.title} ${className}`}
      {...props}
    />
  )
)
AlertTitle.displayName = "AlertTitle"

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

const AlertDescription = React.forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`${styles.description} ${className}`}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }