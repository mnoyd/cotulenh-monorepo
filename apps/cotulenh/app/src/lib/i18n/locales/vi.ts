import type { TranslationKeys } from '../types';

export const vi: TranslationKeys = {
  // Navigation
  'nav.intro': 'Giới thiệu',
  'nav.play': 'Chơi',
  'nav.puzzles': 'Thế cờ',
  'nav.editor': 'Soạn thảo',
  'nav.shortcuts': 'Phím tắt',
  'nav.settings': 'Cài đặt',
  'nav.introduction': 'Giới thiệu',
  'nav.keyboardShortcuts': 'Phím tắt bàn phím',
  'nav.learn': 'Học chơi',

  // Home page
  'home.demoBadge': 'Demo',
  'home.title': 'Cờ Tư Lệnh',
  'home.titleOnline': 'Online',
  'home.tagline': 'Trò chơi chiến thuật quân sự Việt Nam',
  'home.gameName': 'Cờ Tư Lệnh',
  'home.whatYouCanDo': 'Bạn có thể',
  'home.reviewGames.title': 'Xem lại ván cờ',
  'home.reviewGames.desc': 'Phân tích từng nước đi trong ván đấu',
  'home.shareWithFriends.title': 'Chia sẻ với bạn bè',
  'home.shareWithFriends.desc': 'Chia sẻ thế cờ và câu đố qua đường link',
  'home.createPuzzles.title': 'Tạo thế cờ',
  'home.createPuzzles.desc': 'Thiết kế và chia sẻ các thử thách chiến thuật',
  'home.comingSoon': 'Sắp ra mắt',
  'home.multiplayer.title': 'Chơi nhiều người',
  'home.multiplayer.desc': 'Đấu với bạn bè trực tuyến',
  'home.aiBot.title': 'Đấu với máy',
  'home.aiBot.desc': 'Thử thách với máy tính ở nhiều cấp độ khác nhau',
  'home.startPlaying': 'Bắt đầu chơi',
  'home.openEditor': 'Mở soạn thảo',
  'home.learnToPlay.title': 'Học chơi',
  'home.learnToPlay.desc':
    'Bài học tương tác để thành thạo Cờ Tư Lệnh từng bước. Hoàn hảo cho người mới!',
  'home.learnToPlay.link': 'Bắt đầu học →',

  // Settings
  'settings.title': 'Cài đặt',
  'settings.description': 'Tùy chỉnh trải nghiệm chơi game',
  'settings.theme': 'Giao diện',
  'settings.gameplay': 'Gameplay',
  'settings.language': 'Ngôn ngữ',
  'settings.soundEffects': 'Âm thanh',
  'settings.volume': 'Âm lượng',
  'settings.test': 'Thử',
  'settings.showMoveHints': 'Hiển thị gợi ý nước đi',
  'settings.confirmBeforeReset': 'Xác nhận trước khi đặt lại',
  'settings.showDeployButtons': 'Hiển thị nút bày quân',
  'settings.autoCompleteDeploy': 'Tự động hoàn thành bày quân',
  'settings.cancel': 'Hủy',
  'settings.save': 'Lưu',
  'settings.saved': 'Đã lưu!',
  'settings.loading': 'Đang tải...',

  // Game
  'game.missionStatus': 'Trạng thái nhiệm vụ',
  'game.currentTurn': 'Lượt hiện tại',
  'game.checkmate': 'Chiếu hết!',
  'game.stalemate': 'Hòa cờ',
  'game.commanderUnderThreat': 'Tư Lệnh bị đe dọa',
  'game.warning': 'Cảnh báo',
  'game.blue': 'Xanh',
  'game.red': 'Đỏ',
  'game.gameInfo': 'Thông tin ván đấu',

  // Share dialog
  'share.title': 'Chia sẻ ván cờ',
  'share.description': 'Chia sẻ thế cờ này với người khác',
  'share.copyFen': 'Sao chép FEN',
  'share.shareUrl': 'Đường dẫn chia sẻ',
  'share.shareUrlDesc': 'Sao chép đường dẫn để tải thế cờ này khi mở',
  'share.copyLink': 'Sao chép đường dẫn',

  // Shortcuts dialog
  'shortcuts.title': 'Phím tắt bàn phím',
  'shortcuts.description': 'Thành thạo các phím tắt để chơi nhanh hơn',
  'shortcuts.gotIt': 'Đã hiểu!',

  // Puzzles page
  'puzzles.title': 'Thế cờ',
  'puzzles.subtitle': 'Luyện tập kỹ năng chiến thuật với các thế cờ này',
  'puzzles.showHint': 'Xem gợi ý',
  'puzzles.play': 'Chơi',
  'puzzles.comingSoon': 'Thêm thế cờ sắp ra mắt!',
  'puzzles.createOwn': 'Tạo thế cờ của bạn →',

  // Learn page
  'learn.title': 'Học chơi',
  'learn.tagline': 'Thành thạo Cờ Tư Lệnh từng bước với bài học tương tác',
  'learn.backToLessons': 'Quay lại bài học',
  'learn.lessonComplete': 'Hoàn thành bài học!',
  'learn.mistakes': 'Số lỗi',
  'learn.loadingLesson': 'Đang tải bài học...',
  'learn.lessonNotFound': 'Không tìm thấy bài học',

  // Board editor
  'editor.title': 'Soạn thảo',
  'editor.board': 'Bàn cờ',
  'editor.apply': 'Áp dụng',
  'editor.loadingBoard': 'Đang tải bàn cờ...',
  'editor.quickTips': 'Mẹo nhanh',
  'editor.tipClickPiece': 'Nhấp quân cờ: Chọn, sau đó nhấp để đặt',
  'editor.heroic': 'Anh hùng',
  'editor.hand': 'Tay',
  'editor.delete': 'Xóa',

  // Error page
  'error.pageNotFound': 'Không tìm thấy trang',
  'error.pageNotFoundDesc': 'Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.',
  'error.goHome': 'Về trang chủ',
  'error.goBack': 'Quay lại',
  'error.somethingWentWrong': 'Đã xảy ra lỗi',
  'error.tryAgain': 'Thử lại',
  'error.reloadPage': 'Tải lại trang',

  // Report issue
  'report.title': 'Báo cáo lỗi',
  'report.subtitle': 'Tìm thấy lỗi? Giúp chúng tôi cải thiện Cờ Tư Lệnh.',
  'report.starRepo':
    'Hãy cân nhắc tặng sao cho repository của chúng tôi để hỗ trợ phát triển mã nguồn mở.',
  'report.githubAccount':
    'Bạn cần tài khoản GitHub để báo cáo lỗi. Miễn phí và thuộc sở hữu của Microsoft.',
  'report.gamePgn': 'PGN ván cờ',
  'report.issueDescription': 'Mô tả lỗi',
  'report.backToGame': 'Quay lại ván cờ',

  // Common
  'common.loading': 'Đang tải...',
  'common.error': 'Lỗi',
  'common.close': 'Đóng'
};
