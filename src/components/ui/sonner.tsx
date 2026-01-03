import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:bg-card group-[.toaster]:border-green-500/50",
          error: "group-[.toaster]:bg-card group-[.toaster]:border-red-500/50",
          warning: "group-[.toaster]:bg-card group-[.toaster]:border-yellow-500/50",
          info: "group-[.toaster]:bg-card group-[.toaster]:border-blue-500/50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
