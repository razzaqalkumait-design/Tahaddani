import classicNavy from './assets/classic_navy.png';
import classicWhite from './assets/classic_white.png';
import wickedNavy from './assets/wicked_navy.png';
import wickedWhite from './assets/wicked_white.png';
import thirtyNavy from './assets/30_navy.png';
import thirtyWhite from './assets/30_white.png';
import guessNavy from './assets/guess_navy.png';
import guessWhite from './assets/guess_white.png';
import settingsNavy from './assets/settings_navy.png';
import settingsWhite from './assets/settings_white.png';
import soloNavy from './assets/SOLO_NAVY__1_.png';
import soloWhite from './assets/SOLO_WHITE__1_.png';

export const MODE_ICONS: Record<string, { navy: string; white: string }> = {
  classic:  { navy: classicNavy,  white: classicWhite  },
  wicked:   { navy: wickedNavy,   white: wickedWhite   },
  thirty:   { navy: thirtyNavy,   white: thirtyWhite   },
  guess:    { navy: guessNavy,    white: guessWhite    },
  settings: { navy: settingsNavy, white: settingsWhite },
  solo:     { navy: soloNavy,     white: soloWhite     },
};
