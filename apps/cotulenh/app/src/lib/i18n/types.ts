export type Locale = 'en' | 'vi';

export interface TranslationKeys {
  // Navigation
  'nav.intro': string;
  'nav.play': string;
  'nav.puzzles': string;
  'nav.editor': string;
  'nav.shortcuts': string;
  'nav.settings': string;
  'nav.introduction': string;
  'nav.keyboardShortcuts': string;

  // Home page
  'home.demoBadge': string;
  'home.title': string;
  'home.titleOnline': string;
  'home.tagline': string;
  'home.gameName': string;
  'home.whatYouCanDo': string;
  'home.reviewGames.title': string;
  'home.reviewGames.desc': string;
  'home.shareWithFriends.title': string;
  'home.shareWithFriends.desc': string;
  'home.createPuzzles.title': string;
  'home.createPuzzles.desc': string;
  'home.comingSoon': string;
  'home.multiplayer.title': string;
  'home.multiplayer.desc': string;
  'home.aiBot.title': string;
  'home.aiBot.desc': string;
  'home.startPlaying': string;
  'home.openEditor': string;

  // Settings
  'settings.title': string;
  'settings.description': string;
  'settings.theme': string;
  'settings.gameplay': string;
  'settings.language': string;
  'settings.soundEffects': string;
  'settings.volume': string;
  'settings.test': string;
  'settings.showMoveHints': string;
  'settings.confirmBeforeReset': string;
  'settings.showDeployButtons': string;
  'settings.autoCompleteDeploy': string;
  'settings.cancel': string;
  'settings.save': string;
  'settings.saved': string;
  'settings.loading': string;

  // Common
  'common.loading': string;
  'common.error': string;
  'common.close': string;
}

export type TranslationKey = keyof TranslationKeys;
