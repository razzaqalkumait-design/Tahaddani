import { createContext } from 'react';

// ─── Navigation context ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NavCtx = createContext<{ goHome: () => void; goTo: (s: any) => void }>({ goHome: () => {}, goTo: () => {} });

