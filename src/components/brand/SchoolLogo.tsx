import React from "react";

interface SchoolLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  systemName?: string;
  theme?: "light" | "dark";
  /** Hide the system badge below this breakpoint ("sm" | "md" | "lg" | "xl"); never wraps either way */
  badgeFrom?: "always" | "sm" | "md" | "lg" | "xl";
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  size = "md",
  showTagline = false,
  systemName = "Dronacharya",
  theme = "light",
  badgeFrom = "always",
}) => {
  const badgeVisibility = {
    always: "inline-block",
    sm: "hidden sm:inline-block",
    md: "hidden md:inline-block",
    lg: "hidden lg:inline-block",
    xl: "hidden xl:inline-block",
  }[badgeFrom];
  const iconSize = size === "sm" ? 28 : size === "lg" ? 44 : 34;

  const textColor = theme === "dark" ? "text-white" : "text-[#003872]";
  const subtextColor = theme === "dark" ? "text-slate-300" : "text-[#003872]";

  return (
    <div className="flex items-center gap-2.5 select-none min-w-0">
      {/* 21K School Circular Lotus/Petal Emblem (SVG) */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform hover:scale-105"
      >
        {/* Outer Circular Boundary */}
        <circle cx="50" cy="50" r="46" stroke="#003872" strokeWidth="6" fill={theme === "dark" ? "#001f40" : "#FFFFFF"} />
        
        {/* Central Lotus Petal */}
        <path
          d="M50 20 C62 38 64 62 50 80 C36 62 38 38 50 20 Z"
          stroke="#003872"
          strokeWidth="5"
          fill="none"
          strokeLinejoin="round"
        />

        {/* Left Radiating Petal Curve */}
        <path
          d="M50 80 C26 76 16 54 28 36 C42 46 48 64 50 80 Z"
          stroke="#003872"
          strokeWidth="5"
          fill="none"
          strokeLinejoin="round"
        />

        {/* Right Radiating Petal Curve */}
        <path
          d="M50 80 C74 76 84 54 72 36 C58 46 52 64 50 80 Z"
          stroke="#003872"
          strokeWidth="5"
          fill="none"
          strokeLinejoin="round"
        />
        
        {/* Golden Core Dot */}
        <circle cx="50" cy="55" r="3.5" fill="#FFBB00" />
      </svg>

      {/* Brand Text Lockup */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-baseline gap-1.5 leading-none whitespace-nowrap">
          <span className={`font-headline font-bold text-base md:text-lg tracking-tight whitespace-nowrap ${textColor}`}>
            21K School
          </span>
          {systemName && (
            <span className={`${badgeVisibility} font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#FFBB00] text-[#003872] shadow-xs`}>
              {systemName}
            </span>
          )}
        </div>

        {/* Signature 21K 5-Stop Gradient Accent Bar */}
        <div className="h-[2.5px] w-full rounded-full bg-21k-gradient mt-1" />

        {showTagline && (
          <span className={`text-[10px] font-sans font-medium mt-1 leading-tight ${subtextColor}`}>
            Where Every Learner Finds Their Path
          </span>
        )}
      </div>
    </div>
  );
};
