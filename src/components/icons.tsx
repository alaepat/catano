// Iconos propios de la app: trazo fino y redondeado, del color del texto (sustituyen a los emojis).
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Pueblo: casita. */
export const HouseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10v9h12v-9" />
    <path d="M10.5 19v-4.5h3V19" />
  </Icon>
);

/** Ciudad: casa con torre. */
export const CityIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 19h18" />
    <path d="M4 19v-7l4-3 4 3v7" />
    <path d="M12 19V7l4-3 4 3v12" />
    <path d="M15.5 10h1M15.5 13.5h1M7.5 15h1" />
  </Icon>
);

/** Carretera más larga: camino que se aleja. */
export const RoadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4 5 20" />
    <path d="M15 4l4 16" />
    <path d="M12 6v2M12 11v2.5M12 17v3" />
  </Icon>
);

/** Gran ejército: escudo. */
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-2.5Z" />
    <path d="M9 12l2 2 4-4.5" />
  </Icon>
);

/** Carta de punto de victoria: carta con estrella. */
export const CardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="3.5" width="13" height="17" rx="2.2" />
    <path d="m12 8.3 1.15 2.35 2.6.38-1.88 1.83.44 2.59L12 14.23l-2.31 1.22.44-2.59-1.88-1.83 2.6-.38L12 8.3Z" />
  </Icon>
);

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 7 5 11l4 4" />
    <path d="M5 11h9a5 5 0 0 1 0 10h-2" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={3} />
  </Icon>
);

/** Corona: ganador / salón de la fama. */
export const CrownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13L4 8Z" />
    <path d="M6 20h12" />
  </Icon>
);

/** Marcador: tabla de puntos. */
export const ScoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 20V11M12 20V5M19 20v-6" />
  </Icon>
);
