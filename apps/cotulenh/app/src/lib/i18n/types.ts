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
  'nav.appName': string;

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
  'settings.save': string;
  'settings.saved': string;

  // Game
  'game.missionStatus': string;
  'game.currentTurn': string;
  'game.checkmate': string;
  'game.stalemate': string;
  'game.commanderUnderThreat': string;
  'game.warning': string;
  'game.gameInfo': string;
  'game.resetConfirm': string;
  'game.simpleResetConfirm': string;
  'game.redTurn': string;
  'game.victory': string;
  'game.winner': string;
  'game.mateDetected': string;
  'game.draw': string;
  'game.noLegalMoves': string;
  'game.operationTerminated': string;
  'game.missionLog': string;
  'game.live': string;
  'game.noDataRecorded': string;

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
  'shortcuts.undoMove': string;
  'shortcuts.redoMove': string;
  'shortcuts.resetGame': string;
  'shortcuts.cancelDeploy': string;
  'shortcuts.navigateHistory': string;
  'shortcuts.showHelp': string;

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
  'editor.turn': string;
  'editor.fenPosition': string;
  'editor.fenPlaceholder': string;
  'editor.reset': string;
  'editor.clear': string;
  'editor.flip': string;
  'editor.playPosition': string;
  'editor.handMode': string;
  'editor.deleteMode': string;
  'editor.toggleHeroic': string;
  'editor.toggleTurn': string;

  // Common
  'common.loading': string;
  'common.error': string;
  'common.close': string;
  'common.easy': string;
  'common.medium': string;
  'common.hard': string;
  'common.reset': string;
  'common.undo': string;
  'common.flip': string;
  'common.share': string;
  'common.report': string;
  'common.commit': string;
  'common.cancel': string;
  'common.tryAgain': string;
  'common.continue': string;
  'common.red': string;
  'common.blue': string;
  'common.turn': string;
  'common.back': string;
  'common.backToHome': string;
  'common.step': string;
  'common.of': string;
  'common.copy': string;
  'common.copied': string;
  'common.play': string;

  // Clock
  'clock.active': string;
  'clock.timeout': string;
  'clock.pause': string;
  'clock.resume': string;
  'clock.start': string;
  'clock.ranOutOfTime': string;

  // Accessibility / aria-labels
  'a11y.gameBoard': string;
  'a11y.undoMove': string;
  'a11y.flipBoard': string;
  'a11y.resetGame': string;
  'a11y.shareGame': string;
  'a11y.gameInfoPanel': string;
  'a11y.collapseGameInfo': string;
  'a11y.expandGameInfo': string;
  'a11y.piecePalettePanel': string;
  'a11y.collapsePiecePalette': string;
  'a11y.expandPiecePalette': string;
  'a11y.resetToStarting': string;
  'a11y.clearBoard': string;
  'a11y.toggleTurn': string;
  'a11y.currentTurn': string;
  'a11y.selectTeamPieces': string;
  'a11y.redTeamPieces': string;
  'a11y.blueTeamPieces': string;
  'a11y.hand': string;
  'a11y.delete': string;
  'a11y.heroic': string;

  // Error page
  'error.pageNotFound': string;
  'error.pageNotFoundDesc': string;
  'error.goHome': string;
  'error.goBack': string;
  'error.somethingWentWrong': string;
  'error.reloadPage': string;

  // Report issue
  'report.title': string;
  'report.subtitle': string;
  'report.starRepo': string;
  'report.githubAccount': string;
  'report.gamePgn': string;
  'report.issueDescription': string;
  'report.backToGame': string;
  'report.supportProject': string;
  'report.visitRepository': string;
  'report.githubAccountLabel': string;
  'report.pgnHelper': string;
  'report.placeholder': string;
  'report.submit': string;
  'report.submitting': string;
}

export type TranslationKey = keyof TranslationKeys;
