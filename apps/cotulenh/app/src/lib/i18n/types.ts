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
  'nav.learn': string;

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
  'home.learnToPlay.title': string;
  'home.learnToPlay.desc': string;
  'home.learnToPlay.link': string;

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

  // Game
  'game.missionStatus': string;
  'game.currentTurn': string;
  'game.checkmate': string;
  'game.stalemate': string;
  'game.commanderUnderThreat': string;
  'game.warning': string;
  'game.blue': string;
  'game.red': string;
  'game.gameInfo': string;

  // Share dialog
  'share.title': string;
  'share.description': string;
  'share.copyFen': string;
  'share.shareUrl': string;
  'share.shareUrlDesc': string;
  'share.copyLink': string;

  // Shortcuts dialog
  'shortcuts.title': string;
  'shortcuts.description': string;
  'shortcuts.gotIt': string;

  // Puzzles page
  'puzzles.title': string;
  'puzzles.subtitle': string;
  'puzzles.showHint': string;
  'puzzles.play': string;
  'puzzles.comingSoon': string;
  'puzzles.createOwn': string;

  // Learn page
  'learn.title': string;
  'learn.tagline': string;
  'learn.backToLessons': string;
  'learn.lessonComplete': string;
  'learn.mistakes': string;
  'learn.loadingLesson': string;
  'learn.lessonNotFound': string;

  // Board editor
  'editor.title': string;
  'editor.board': string;
  'editor.apply': string;
  'editor.loadingBoard': string;
  'editor.quickTips': string;
  'editor.tipClickPiece': string;
  'editor.heroic': string;
  'editor.hand': string;
  'editor.delete': string;

  // Error page
  'error.pageNotFound': string;
  'error.pageNotFoundDesc': string;
  'error.goHome': string;
  'error.goBack': string;
  'error.somethingWentWrong': string;
  'error.tryAgain': string;
  'error.reloadPage': string;

  // Report issue
  'report.title': string;
  'report.subtitle': string;
  'report.starRepo': string;
  'report.githubAccount': string;
  'report.gamePgn': string;
  'report.issueDescription': string;
  'report.backToGame': string;

  // Common
  'common.loading': string;
  'common.error': string;
  'common.close': string;
}

export type TranslationKey = keyof TranslationKeys;
