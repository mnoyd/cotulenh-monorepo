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
  'nav.menu': string;
  'nav.signIn': string;
  'nav.signOut': string;
  'nav.profile': string;
  'nav.accountSettings': string;
  'nav.userMenu': string;

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
  'settings.theme.modernWarfare.name': string;
  'settings.theme.modernWarfare.description': string;
  'settings.theme.desertOps.name': string;
  'settings.theme.desertOps.description': string;
  'settings.theme.classic.name': string;
  'settings.theme.classic.description': string;
  'settings.theme.forest.name': string;
  'settings.theme.forest.description': string;

  // Play lobby
  'play.lobby.title': string;
  'play.lobby.playOnline': string;
  'play.lobby.practice': string;
  'play.lobby.practiceDesc': string;
  'play.lobby.startPractice': string;
  'play.lobby.createGame': string;
  'play.lobby.custom': string;
  'play.lobby.customMinutes': string;
  'play.lobby.customIncrement': string;

  // Settings — move confirmation
  'settings.moveConfirmation': string;
  'settings.moveConfirmation.desc': string;

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
  'game.illegalMove': string;
  'game.moveFailed': string;
  'game.undoSuccess': string;
  'game.undoFailed': string;
  'game.resetSuccess': string;
  'game.resetFailed': string;
  'game.redoComingSoon': string;
  'game.cannotCommitMove': string;
  'game.errorCancelling': string;
  'game.unknownError': string;

  // Share dialog
  'share.title': string;
  'share.description': string;
  'share.copyFen': string;
  'share.shareUrl': string;
  'share.shareUrlDesc': string;
  'share.copyLink': string;
  'share.fenLabel': string;
  'share.toastFenCopied': string;
  'share.toastCopyFailed': string;
  'share.toastLinkCopied': string;

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
  'learn.description': string;
  'learn.backToLessons': string;
  'learn.backToSubjects': string;
  'learn.startLesson': string;
  'learn.continue': string;
  'learn.locked': string;
  'learn.lessonComplete': string;
  'learn.lesson': string;
  'learn.lessonNumber': string;
  'learn.lessonProgress': string;
  'learn.introduction': string;
  'learn.previousLesson': string;
  'learn.skipToNext': string;
  'learn.mistakes': string;
  'learn.availableSubjects': string;
  'learn.complete': string;
  'learn.progressPercent': string;
  'learn.completeToContinue': string;
  'learn.moveToTarget': string;
  'learn.subjectCompleted': string;
  'learn.reviewLessons': string;
  'learn.curriculum': string;
  'learn.subjectNotFound': string;
  'learn.loadingLesson': string;
  'learn.lessonNotFound': string;
  'learn.hint': string;
  'learn.reset': string;
  'learn.moves': string;
  'learn.invalidMove': string;
  'learn.feedback.success.default': string;
  'learn.feedback.failure.default': string;
  'learn.feedback.hint.moveToTarget': string;
  'learn.feedback.hint.pieceSelected': string;
  'learn.feedback.error.invalidMove': string;
  'learn.feedback.error.wrongScenarioMove': string;

  // Learn UI additional strings
  'learn.mastery': string;
  'learn.masteryLabel': string;
  'learn.masteryEfficient': string;
  'learn.masteryAssisted': string;
  'learn.masteryNeedsReview': string;
  'learn.curriculumMap': string;
  'learn.continueMission': string;
  'learn.reviewSubject': string;
  'learn.openMission': string;
  'learn.sections': string;
  'learn.missionTimeline': string;
  'learn.actionReview': string;
  'learn.actionContinue': string;
  'learn.actionStart': string;
  'learn.actionLocked': string;

  // Learn mode and tabs
  'learn.modeGuided': string;
  'learn.modePractice': string;
  'learn.tabObjective': string;
  'learn.tabHints': string;
  'learn.tabLog': string;

  // Learn assist and hints
  'learn.assistGuided': string;
  'learn.assistPractice': string;
  'learn.assistGuidedTip': string;
  'learn.assistPracticeTip': string;
  'learn.revealHint': string;
  'learn.hintLevelManual': string;
  'learn.hintLevelNone': string;
  'learn.hintLevelSubtle': string;
  'learn.hintLevelMedium': string;
  'learn.hintLevelExplicit': string;

  // Learn objective strings
  'learn.readBrief': string;
  'learn.successCriteria': string;
  'learn.constraints': string;
  'learn.criteriaVisitTargets': string;
  'learn.criteriaFollowScenario': string;
  'learn.criteriaReachGoal': string;
  'learn.criteriaDefault': string;
  'learn.constraintTerrain': string;
  'learn.constraintScenario': string;
  'learn.constraintLegal': string;
  'learn.constraintOrdered': string;
  'learn.constraintDefault': string;

  // Learn completion and log
  'learn.attemptLog': string;
  'learn.attemptLogEntries': string;
  'learn.attemptLogEmpty': string;

  // Learn tooltips
  'learn.tooltip.target': string;
  'learn.tooltip.clickToMove': string;
  'learn.tooltip.validMove': string;

  // Learn visual diagram labels
  'learn.diagram.waterZone': string;
  'learn.diagram.coastal': string;
  'learn.diagram.northLand': string;
  'learn.diagram.southLand': string;
  'learn.diagram.riverBarrier': string;
  'learn.diagram.river': string;
  'learn.diagram.bridge': string;
  'learn.diagram.boardGrid': string;
  'learn.diagram.terrainGuideAria': string;
  'learn.diagram.waterZoneAria': string;
  'learn.diagram.coastalZoneAria': string;
  'learn.diagram.northLandAria': string;
  'learn.diagram.southLandAria': string;
  'learn.diagram.riverBarrierAria': string;

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
  'editor.tipDragPieces': string;
  'editor.tipClickRemovePieces': string;
  'editor.tipTogglePromotionStatus': string;
  'editor.invalidFenFormat': string;
  'editor.invalidFenGeneric': string;
  'editor.invalidFenWithReason': string;
  'editor.enterFenFirst': string;
  'editor.fenShort': string;

  // Piece names
  'piece.commander': string;
  'piece.infantry': string;
  'piece.tank': string;
  'piece.militia': string;
  'piece.engineer': string;
  'piece.artillery': string;
  'piece.antiAir': string;
  'piece.missile': string;
  'piece.airForce': string;
  'piece.navy': string;
  'piece.headquarter': string;

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

  // Auth
  'auth.register.title': string;
  'auth.register.subtitle': string;
  'auth.register.email': string;
  'auth.register.emailPlaceholder': string;
  'auth.register.password': string;
  'auth.register.passwordPlaceholder': string;
  'auth.register.displayName': string;
  'auth.register.displayNamePlaceholder': string;
  'auth.register.submit': string;
  'auth.register.submitting': string;
  'auth.register.haveAccount': string;
  'auth.register.loginLink': string;
  'auth.register.verifyEmail': string;
  'auth.register.verifyEmailDesc': string;
  'auth.validation.emailRequired': string;
  'auth.validation.emailInvalid': string;
  'auth.validation.passwordRequired': string;
  'auth.validation.passwordMinLength': string;
  'auth.validation.displayNameRequired': string;
  'auth.validation.displayNameMinLength': string;
  'auth.validation.displayNameMaxLength': string;
  'auth.validation.displayNameInvalidChars': string;
  'auth.error.generic': string;
  'auth.error.registrationFailed': string;
  'auth.error.title': string;
  'auth.error.description': string;
  'auth.error.backHome': string;
  'auth.error.loginFailed': string;
  'auth.login.title': string;
  'auth.login.subtitle': string;
  'auth.login.email': string;
  'auth.login.emailPlaceholder': string;
  'auth.login.password': string;
  'auth.login.passwordPlaceholder': string;
  'auth.login.submit': string;
  'auth.login.submitting': string;
  'auth.login.forgotPassword': string;
  'auth.login.noAccount': string;
  'auth.login.registerLink': string;
  'auth.logout.signingOut': string;

  // Forgot Password
  'auth.forgotPassword.title': string;
  'auth.forgotPassword.subtitle': string;
  'auth.forgotPassword.email': string;
  'auth.forgotPassword.emailPlaceholder': string;
  'auth.forgotPassword.submit': string;
  'auth.forgotPassword.submitting': string;
  'auth.forgotPassword.backToLogin': string;
  'auth.forgotPassword.checkEmail': string;
  'auth.forgotPassword.checkEmailDesc': string;

  // Reset Password
  'auth.resetPassword.title': string;
  'auth.resetPassword.subtitle': string;
  'auth.resetPassword.newPassword': string;
  'auth.resetPassword.newPasswordPlaceholder': string;
  'auth.resetPassword.confirmPassword': string;
  'auth.resetPassword.confirmPasswordPlaceholder': string;
  'auth.resetPassword.submit': string;
  'auth.resetPassword.submitting': string;
  'auth.resetPassword.backToLogin': string;
  'auth.resetPassword.success': string;
  'auth.resetPassword.expiredLink': string;

  // Additional validation keys
  'auth.validation.confirmPasswordRequired': string;
  'auth.validation.passwordMismatch': string;

  // Additional error key
  'auth.error.resetFailed': string;

  // Profile
  'profile.title': string;
  'profile.displayName.label': string;
  'profile.displayName.placeholder': string;
  'profile.displayName.saved': string;
  'profile.displayName.edit': string;
  'profile.displayName.save': string;
  'profile.displayName.saving': string;
  'profile.memberSince': string;
  'profile.stats.title': string;
  'profile.stats.gamesPlayed': string;
  'profile.stats.wins': string;
  'profile.stats.losses': string;
  'profile.validation.displayNameRequired': string;
  'profile.validation.displayNameMinLength': string;
  'profile.validation.displayNameMaxLength': string;
  'profile.validation.displayNameInvalidChars': string;
  'profile.error.updateFailed': string;

  // Public Profile
  'profile.public.title': string;
  'profile.public.gameHistory.title': string;
  'profile.public.gameHistory.empty': string;
  'profile.rating': string;
  'profile.rating.unrated': string;
  'profile.addFriend': string;
  'profile.challenge': string;
  'profile.pendingSent': string;
  'profile.settings': string;
  'profile.skeleton.loading': string;

  // Account Settings
  'accountSettings.title': string;
  'accountSettings.account.title': string;
  'accountSettings.email.label': string;
  'accountSettings.email.current': string;
  'accountSettings.email.new': string;
  'accountSettings.email.placeholder': string;
  'accountSettings.email.submit': string;
  'accountSettings.email.submitting': string;
  'accountSettings.email.success': string;
  'accountSettings.password.title': string;
  'accountSettings.password.new': string;
  'accountSettings.password.newPlaceholder': string;
  'accountSettings.password.confirm': string;
  'accountSettings.password.confirmPlaceholder': string;
  'accountSettings.password.submit': string;
  'accountSettings.password.submitting': string;
  'accountSettings.password.success': string;
  'accountSettings.preferences.title': string;
  'accountSettings.preferences.saved': string;
  'accountSettings.error.emailUpdateFailed': string;
  'accountSettings.error.passwordUpdateFailed': string;
  'accountSettings.error.settingsUpdateFailed': string;
  'accountSettings.validation.emailRequired': string;
  'accountSettings.validation.emailInvalid': string;
  'accountSettings.validation.passwordRequired': string;
  'accountSettings.validation.passwordMinLength': string;
  'accountSettings.validation.passwordMismatch': string;

  // Friends
  'nav.friends': string;
  'friends.title': string;
  'friends.search.placeholder': string;
  'friends.search.noResults': string;
  'friends.search.noResultsHint': string;
  'friends.search.minChars': string;
  'friends.search.resultsLabel': string;
  'friends.search.resultsFound': string;
  'friends.empty.title': string;
  'friends.empty.subtitle': string;
  'friends.list.title': string;
  'friends.action.sendRequest': string;
  'friends.action.pending': string;
  'friends.action.friends': string;
  'friends.action.cancel': string;
  'friends.action.accept': string;
  'friends.action.decline': string;
  'friends.action.remove': string;
  'friends.requests.incoming': string;
  'friends.requests.sent': string;
  'friends.requests.emptyIncoming': string;
  'friends.toast.requestSent': string;
  'friends.toast.requestFailed': string;
  'friends.toast.requestAccepted': string;
  'friends.toast.requestDeclined': string;
  'friends.toast.requestCancelled': string;
  'friends.toast.actionFailed': string;
  'friends.status.online': string;
  'friends.status.offline': string;
  'friends.remove.button': string;
  'friends.remove.title': string;
  'friends.remove.description': string;
  'friends.remove.confirm': string;
  'friends.remove.cancel': string;
  'friends.toast.friendRemoved': string;
  'friends.toast.removeFailed': string;
  'friends.error.sendFailed': string;
  'friends.error.alreadyFriends': string;
  'friends.error.requestAlreadyPending': string;
  'friends.error.cannotFriendSelf': string;
  'friends.error.userBlocked': string;

  // Invitations / Online Play
  'invitation.pageTitle': string;
  'invitation.timeControl.title': string;
  'invitation.timeControl.custom': string;
  'invitation.timeControl.minutes': string;
  'invitation.timeControl.increment': string;
  'invitation.onlineFriends.title': string;
  'invitation.onlineFriends.empty': string;
  'invitation.onlineFriends.emptyLink': string;
  'invitation.action.invite': string;
  'invitation.action.invited': string;
  'invitation.action.cancel': string;
  'invitation.sent.title': string;
  'invitation.toast.sent': string;
  'invitation.toast.sendFailed': string;
  'invitation.toast.cancelled': string;
  'invitation.toast.cancelFailed': string;
  'invitation.error.invalidGameConfig': string;
  'invitation.error.alreadyInvited': string;
  'invitation.error.cannotInviteSelf': string;

  // Invitation — Received / Respond
  'invitation.received.title': string;
  'invitation.action.accept': string;
  'invitation.action.decline': string;
  'invitation.notification.title': string;
  'invitation.notification.challengeMessage': string;
  'invitation.toast.accepted': string;
  'invitation.toast.declined': string;
  'invitation.toast.acceptSuccess': string;
  'invitation.toast.acceptFailed': string;
  'invitation.toast.declineSuccess': string;
  'invitation.toast.declineFailed': string;

  // Shareable Invite Link
  'inviteLink.pageTitle': string;
  'inviteLink.invitedYou': string;
  'inviteLink.acceptAndPlay': string;
  'inviteLink.signUpToPlay': string;
  'inviteLink.alreadyHaveAccount': string;
  'inviteLink.logIn': string;
  'inviteLink.expired.title': string;
  'inviteLink.expired.description': string;
  'inviteLink.own.title': string;
  'inviteLink.own.description': string;
  'inviteLink.copyLink': string;
  'inviteLink.linkLabel': string;
  'inviteLink.label': string;
  'inviteLink.badge': string;
  'inviteLink.create.title': string;
  'inviteLink.create.description': string;
  'inviteLink.create.button': string;
  'inviteLink.create.another': string;
  'inviteLink.toast.created': string;
  'inviteLink.toast.createFailed': string;
  'inviteLink.error.unavailable': string;
  'inviteLink.error.acceptFailed': string;
  'inviteLink.verifyEmailContext': string;
  'inviteLink.anyone': string;

  // Game page
  'game.pageTitle': string;
  'game.starting': string;
  'game.opponent': string;
  'game.yourColor': string;
  'game.placeholderMessage': string;
  'game.goToGame': string;
  'game.connecting': string;
  'game.waitingForOpponent': string;
  'game.opponentConnected': string;
  'game.opponentDisconnected': string;
  'game.yourTurn': string;
  'game.opponentTurn': string;
  'game.moveCount': string;
  'game.gameAborted': string;
  'game.connectionLost': string;
  'game.reconnecting': string;
  'game.opponentMayReconnect': string;
  'game.opponentReconnectCountdown': string;
  'game.opponentDisconnectForfeit': string;
  'game.connectionRestored': string;
  'game.clocksPaused': string;
  'game.disconnectForfeit': string;
  'game.syncFailed': string;
  'game.syncFailedReport': string;
  'game.youWin': string;
  'game.youLose': string;
  'game.gameDraw': string;
  'game.resultCheckmate': string;
  'game.resultStalemate': string;
  'game.resultDraw': string;
  'game.resultResign': string;
  'game.resultCommanderCaptured': string;
  'game.resignConfirmTitle': string;
  'game.resignConfirmMessage': string;
  'game.resignButton': string;
  'game.playAgain': string;
  'game.claimVictory': string;
  'game.offerDraw': string;
  'game.drawOfferSent': string;
  'game.drawOfferReceived': string;
  'game.acceptDraw': string;
  'game.declineDraw': string;
  'game.resultTimeout': string;
  'game.disputeTitle': string;
  'game.disputeMessage': string;
  'game.disputeCommentPlaceholder': string;
  'game.reportBug': string;
  'game.reportCheat': string;
  'game.resultDispute': string;
  'game.resultDrawAgreement': string;
  'game.rematch': string;
  'game.rematchRequested': string;
  'game.rematchReceived': string;
  'game.acceptRematch': string;
  'game.declineRematch': string;
  'game.abortGame': string;
  'game.opponentAbandoned': string;
  'game.youAbandoned': string;
  'game.gameStaleCleanup': string;

  // Game History
  'gameHistory.title': string;
  'gameHistory.empty.title': string;
  'gameHistory.empty.subtitle': string;
  'gameHistory.result.win': string;
  'gameHistory.result.loss': string;
  'gameHistory.result.draw': string;
  'gameHistory.result.aborted': string;
  'gameHistory.reason.checkmate': string;
  'gameHistory.reason.resign': string;
  'gameHistory.reason.resignation': string;
  'gameHistory.reason.timeout': string;
  'gameHistory.reason.stalemate': string;
  'gameHistory.reason.draw': string;
  'gameHistory.reason.draw_by_agreement': string;
  'gameHistory.reason.draw_by_timeout_with_pending_offer': string;
  'gameHistory.reason.dispute': string;
  'gameHistory.reason.commander_captured': string;
  'gameHistory.reason.fifty_moves': string;
  'gameHistory.reason.threefold_repetition': string;
  'gameHistory.reason.abandonment': string;
  'gameHistory.reason.stale_cleanup': string;
  'gameHistory.duration': string;
  'gameHistory.viewAll': string;
  'gameHistory.vs': string;

  // Feedback
  'nav.feedback': string;
  'feedback.title': string;
  'feedback.description': string;
  'feedback.messagePlaceholder': string;
  'feedback.submit': string;
  'feedback.submitting': string;
  'feedback.success': string;
  'feedback.error': string;
  'feedback.emptyMessage': string;

  // Tab labels
  'tabs.moves': string;
  'tabs.game': string;
  'tabs.pieces': string;
  'tabs.setup': string;
  'tabs.activity': string;

  // Takeback
  'game.takebackRequest': string;
  'game.takebackSent': string;
  'game.takebackReceived': string;
  'game.acceptTakeback': string;
  'game.declineTakeback': string;

  // Move confirmation in-game
  'game.confirmMove': string;
  'game.cancelMove': string;

  // Lobby (Open Challenges)
  'lobby.title': string;
  'lobby.createChallenge': string;
  'lobby.openChallenges': string;
  'lobby.noOpenChallenges': string;
  'lobby.createGame': string;
  'lobby.playAI': string;
  'lobby.accept': string;
  'lobby.cancel': string;
  'lobby.rated': string;
  'lobby.casual': string;
  'lobby.yourChallenge': string;
  'lobby.alreadyHasChallenge': string;
  'lobby.cannotAcceptOwn': string;
  'lobby.toast.created': string;
  'lobby.toast.createFailed': string;
  'lobby.toast.accepted': string;
  'lobby.toast.acceptFailed': string;
  'lobby.toast.cancelled': string;
  'lobby.toast.cancelFailed': string;
  'lobby.toast.challengeAccepted': string;

  // Friend Challenge
  'friend.challenge.toast.challengeMessage': string;
  'friend.challenge.toast.received': string;
  'friend.challenge.toast.declined': string;
  'friend.challenge.toast.expired': string;
  'friend.challenge.dialog.title': string;
  'friend.challenge.dialog.rating': string;
  'friend.challenge.action.send': string;
  'friend.challenge.action.cancel': string;
  'friend.challenge.action.challenge': string;
  'friend.challenge.action.challengeFriend': string;
  'friend.challenge.friendSelector.title': string;
  'friend.challenge.friendSelector.empty': string;
  'friend.challenge.colorChoice.label': string;
  'friend.challenge.colorChoice.random': string;

  // Game Replay
  'gameReplay.title': string;
  'gameReplay.copyPgn': string;
  'gameReplay.pgnCopied': string;
  'gameReplay.backToHistory': string;
  'gameReplay.gameNotFound': string;
  'gameReplay.startPosition': string;
  'gameReplay.finalPosition': string;
  'gameReplay.moveOf': string;
  'gameReplay.firstMove': string;
  'gameReplay.previousMove': string;
  'gameReplay.nextMove': string;
  'gameReplay.lastMove': string;
}

export type TranslationKey = keyof TranslationKeys;
