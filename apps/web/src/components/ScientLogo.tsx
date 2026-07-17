// FILE: ScientLogo.tsx
// Purpose: Render the current two-color Scient mark as an inline SVG.
// Layer: Shared app branding primitive

import type { SVGProps } from "react";
import { SCIENT_LOGO_PATHS } from "~/assets/scientLogoPaths";
import { cn } from "~/lib/utils";

interface ScientLogoProps extends SVGProps<SVGSVGElement> {
  readonly adaptToDark?: boolean;
}

export function ScientLogo({ adaptToDark = true, className, ...props }: ScientLogoProps) {
  const ariaLabel = props["aria-label"];

  return (
    <svg
      viewBox="0 0 376 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaLabel ? undefined : true}
      {...props}
      className={cn("shrink-0", className)}
    >
      {SCIENT_LOGO_PATHS.map((path) => (
        <path
          key={path.d}
          d={path.d}
          className={cn(
            path.tone === "blue" ? "fill-[#46587E]" : "fill-[#471A1A]",
            adaptToDark && (path.tone === "blue" ? "dark:fill-[#AFC2E8]" : "dark:fill-[#E6B8B8]"),
          )}
        />
      ))}
    </svg>
  );
}
