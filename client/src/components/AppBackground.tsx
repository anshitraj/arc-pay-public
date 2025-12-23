import { ReactNode, HTMLAttributes } from "react";

interface AppBackgroundProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode;
  className?: string;
}

/**
 * AppBackground - Shared Arc-inspired background wrapper
 * 
 * Applies the same rich background system used in dashboard pages:
 * - Arc gradient background (dark navy with depth)
 * - Subtle Arc curve SVGs (decorative elements)
 * - Grid texture overlay
 * 
 * This ensures visual consistency across the entire ArcPay product.
 * The background only applies in dark mode, matching the CSS .dark body styles.
 */
export function AppBackground({ children, className = "", ...props }: AppBackgroundProps) {
  return (
    <div className={`relative min-h-screen ${className}`} {...props}>
      {/* Arc background layers - matches index.css .dark body styles */}
      {/* Applied in dark mode to ensure consistency - body already has this background,
          but this wrapper ensures it's visible even if child elements have backgrounds */}
      <div 
        className="hidden dark:block fixed inset-0 -z-10"
        style={{
          background: `
            /* Arc SVG backgrounds - positioned decorative elements (opacity < 10%) */
            url("data:image/svg+xml,%3Csvg width='1200' height='1200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 Q 600 300 1200 0' stroke='rgba(59,130,246,0.08)' fill='none' stroke-width='3'/%3E%3C/svg%3E") top right / 1200px 1200px no-repeat,
            url("data:image/svg+xml,%3Csvg width='1000' height='1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 1000 Q 500 600 1000 1000' stroke='rgba(59,130,246,0.06)' fill='none' stroke-width='3'/%3E%3C/svg%3E") bottom left / 1000px 1000px no-repeat,
            /* Subtle grid texture (opacity ≤ 3%) */
            linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px),
            /* Main gradient background */
            radial-gradient(ellipse at top right, #0f2a44 0%, transparent 50%),
            linear-gradient(180deg, #0f2a44 0%, #081726 50%, #050b14 100%)
          `,
          backgroundSize: `
            1200px 1200px,
            1000px 1000px,
            48px 48px,
            48px 48px,
            100% 100%,
            100% 100%
          `,
          backgroundAttachment: "fixed",
        }}
      />
      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}

