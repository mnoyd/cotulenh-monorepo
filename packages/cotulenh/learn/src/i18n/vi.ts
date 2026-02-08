import type { LearnTranslations } from './types';

export const vi: LearnTranslations = {
  subjects: {
    'subject-1-basic-movement': {
      subject: {
        title: 'Cách Di Chuyển Cơ Bản',
        description:
          'Nắm vững các kiểu di chuyển của tất cả 11 loại quân trong Cờ Tư Lệnh. Từ các quân di chuyển 1 ô cơ bản đến các quân có tầm đi không giới hạn.',
        introduction: `# Chào mừng đến với Cờ Tư Lệnh: Cách Di Chuyển Cơ Bản

Cờ Tư Lệnh là một biến thể cờ vua tinh tế kết hợp lối chơi chiến thuật truyền thống với các cơ chế quân sự hiện đại. Trước khi bạn có thể chỉ huy quân đội của mình một cách hiệu quả, bạn phải hiểu cách mỗi quân di chuyển.

## Bàn Cờ

Cờ Tư Lệnh được chơi trên bàn cờ **11×12** - lớn hơn bàn cờ vua để phục vụ cho chiến trường quân sự.

**Hệ Tọa Độ:**
- **Cột** (files): Được đánh dấu từ **a** đến **k** từ trái sang phải (11 cột)
- **Hàng** (ranks): Được đánh số từ **1** đến **12** từ dưới lên trên (12 hàng)
- Mỗi ô được xác định bằng cột + hàng (ví dụ: e6, h9, c12)

**Địa Điểm Chính:**
- **Sông**: Chia bàn cờ giữa hàng 6 và 7
- **Cầu**: f6/f7 và h6/h7 - các điểm vượt qua quan trọng cho các quân nặng
- **Vùng Nước**: Cột a-b (lãnh thổ hải quân)
- **Vùng Ven Biển**: Cột c (vốn hỗn hợp)
- **Vùng Đất**: Cột d-k (tác chiến trên bộ)

## 11 Loại Quân

Cờ Tư Lệnh có 11 quân quân sự riêng biệt, mỗi loại có kiểu di chuyển độc đáo:

### Quân Cơ Bản (di chuyển 1 ô)
- **Bộ Bin (I)**: Di chuyển 1 ô theo phương thẳng (lên, xuống, trái, phải). Xương sống của quân đội.
- **Công Binh (E)**: Di chuyển 1 ô theo phương thẳng. Có thể mang vũ khí nặng như Pháo và Tên Lửa.
- **Dân Quân (M)**: Di chuyển 1 ô theo tất cả 8 hướng (bao gồm chéo). Linh hoạt hơn Bộ Bin.
- **Bộ Tư Lệnh (H)**: Bất động - không thể di chuyển. Bảo vệ Tư Lệnh của bạn và phải được phòng thủ.
- **Phòng Không (G)**: Di chuyển 1 ô theo phương thẳng. Cung cấp vùng phòng không quan trọng.

### Quân Tầm Trung (2-3 ô)
- **Tăng (T)**: Di chuyển tối đa 2 ô theo phương thẳng. Có thể chở quân và bắn qua chướng ngại vật.
- **Tên Lửa (S)**: Kiểu hình tròn độc đáo - 2 ô theo phương thẳng HOẶC 1 ô theo đường chéo. Cũng cung cấp phòng không.

### Quân Tầm Xa (3+ ô)
- **Pháo (A)**: Di chuyển tối đa 3 ô theo tất cả 8 hướng. Bỏ qua các quân chặn - có thể bắn qua chúng!
- **Tư Lệnh (C)**: Di chuyển không giới hạn ô theo phương thẳng (như Xe trong cờ vua). Quan trọng nhất - nếu bị bắt, bạn thua!

### Quân Đặc Biệt
- **Không Quân (F)**: Bay tối đa 4 ô theo bất kỳ hướng nào. Bỏ qua địa hình và các quân chặn - sự cơ động thực sự!
- **Hải Quân (N)**: Di chuyển tối đa 4 ô theo tất cả các hướng. Chỉ hoạt động trong vùng nước (cột a-c và các ô sông).

## Thuật Ngữ Di Chuyển

**Di Chuyển Phương Thẳng**: Chỉ đi theo đường thẳng - lên, xuống, trái, hoặc phải. Không được đi chéo.

**Di Chuyển Tất Cả Hướng**: Có thể di chuyển theo phương thẳng VÀ đường chéo - tất cả 8 hướng quanh một quân.

**Tầm**: Số ô tối đa một quân có thể di chuyển. Một quân luôn có thể di chuyển ít hơn tối đa.

**Chặn**: Hầu hết các quân không thể đi qua các quân khác. Ngoại lệ bao gồm Pháo, Tăng, Tên Lửa, Không Quân, và Hải Quân.

## Tại Sao Di Chuyển Quan Trọng

Hiểu về di chuyển là nền tảng của tất cả chiến thuật trong Cờ Tư Lệnh:
- **Vị Trí**: Đặt quân của bạn ở nơi chúng có thể đe dọa quân địch
- **Phòng Thủ**: Giữ Tư Lệnh và Bộ Tư Lệnh của bạn an toàn
- **Phối Hợp**: Kết hợp các loại quân khác nhau cho các đợt tấn công mạnh
- **Kiểm Soát Địa Hình**: Sử dụng đúng quân cho mỗi vùng của bàn cờ

## Bạn Sẽ Học Gì

Môn học này bao gồm tất cả 11 loại quân qua ba phần tiến bộ:

### Phần 1: Di Chuyển Quân Cơ Bản
Làm chủ nền tảng với Bộ Bin, Công Binh, Dân Quân, Tư Lệnh, và Bộ Tư Lệnh. Tìm hiểu sự khác biệt giữa di chuyển phương thẳng và tất cả các hướng.

### Phần 2: Quân Tầm Trung
Mở rộng các tùy chọn chiến thuật của bạn với Tăng, Phòng Không, và Tên Lửa. Khám phá kiểu hình tròn độc đáo của Tên Lửa.

### Phần 3: Quân Nâng Cao & Đặc Biệt
Khai thác sức mạnh của Pháo (bắn qua các quân), Không Quân (bỏ qua địa hình), và Hải Quân (kiểm soát biển).

## Cách Học

Mỗi bài tập tập trung vào một loại quân:
1. Đọc mô tả để hiểu kiểu di chuyển
2. Thực hành bằng cách di chuyển quân đến các ô mục tiêu được đánh dấu
3. Thử nghiệm tự do để xây dựng trực giác

**Sẵn sàng bắt đầu? Hãy làm chủ quân đội của bạn, một quân một lúc!**`
      },
      sections: {
        'section-1-basic-units': {
          title: 'Di Chuyển Quân Cơ Bản',
          description:
            'Làm chủ di chuyển cơ bản của các quân 1 ô: Bộ Bin, Công Binh, Dân Quân, Tư Lệnh, và Bộ Tư Lệnh.',
          introduction: `# Di Chuyển Quân Cơ Bản

Trong Cờ Tư Lệnh, các quân đơn giản nhất chỉ di chuyển 1 ô mỗi lần:
- **Bộ Bin** và **Công Binh**: Di chuyển phương thẳng (đường thẳng)
- **Dân Quân**: Di chuyển theo tất cả 8 hướng
- **Tư Lệnh**: Có tầm phương thẳng không giới hạn
- **Bộ Tư Lệnh**: Không thể di chuyển (bất động)

Các quân này tạo thành nền tảng của quân đội bạn. Hãy tìm hiểu kiểu di chuyển của chúng trước!`
        },
        'section-2-medium-range': {
          title: 'Quân Tầm Trung',
          description: 'Tìm hiểu di chuyển của các quân tầm 2-3 ô: Tăng, Phòng Không, và Tên Lửa.',
          introduction: `# Quân Tầm Trung

Các quân này có tầm xa hơn các quân cơ bản:
- **Tăng**: Di chuyển tối đa 2 ô phương thẳng (đường thẳng)
- **Phòng Không**: Di chuyển 1 ô phương thẳng (cung cấp phòng không)
- **Tên Lửa**: Di chuyển theo kiểu hình tròn - 2 ô thẳng hoặc 1 ô chéo

Chúng cung cấp sự linh hoạt chiến thuật giữa các quân 1 ô cơ bản và các quân tầm xa mạnh.`
        },
        'section-3-advanced-units': {
          title: 'Quân Nâng Cao & Đặc Biệt',
          description:
            'Làm chủ các quân mạnh: Pháo (phương thẳng không giới hạn), Không Quân (tầm xa), và Hải Quân (trên nước).',
          introduction: `# Quân Nâng Cao & Đặc Biệt

Các quân này có đặc điểm di chuyển mạnh:
- **Pháo**: Tầm phương thẳng không giới hạn, có thể bắn qua các quân chặn
- **Không Quân**: Bay qua bất kỳ chướng ngại vật nào với tầm 4
- **Hải Quân**: Chỉ trong vùng nước, tầm 4 ô theo tất cả các hướng

Đây là những quân mạnh nhất để kiểm soát bàn cờ chiến lược.`
        }
      },
      lessons: {
        'bm-1-1': {
          title: 'Di Chuyển Bộ Bin',
          description: 'Bộ Bin là quân bộ cơ bản di chuyển 1 ô theo phương thẳng.',
          content: `## Bộ Bin

- Di chuyển **1 ô phương thẳng** (lên, xuống, trái, phải).
- Hoạt động trên **vùng đất** (cột d-k), có thể tiếp cận vùng hỗn hợp trên cột c và bờ sông.
- Di chuyển đơn giản, đáng tin cậy khiến Bộ Bin lý tưởng để học nền tảng.`,
          instruction:
            'Nhấp vào Bộ Bin và di chuyển đến bất kỳ ô hợp lệ nào (được đánh dấu). Bộ Bin di chuyển 1 ô phương thẳng (lên, xuống, trái, phải).',
          hint: 'Thử di chuyển Bộ Bin thẳng lên, xuống, trái, hoặc phải - nhưng chỉ 1 ô mỗi lần.',
          successMessage: 'Hoàn hảo! Bộ Bin di chuyển 1 ô phương thẳng.'
        },
        'bm-1-2': {
          title: 'Di Chuyển Công Binh',
          description: 'Công Binh là quân hỗ trợ với cùng di chuyển như Bộ Bin - 1 ô phương thẳng.',
          content: `## Công Binh

- Di chuyển **1 ô phương thẳng**, giống như Bộ Bin.
- Ổn định trên **vùng đất**, sử dụng vùng hỗn hợp như địa hình chung.
- Thường hỗ trợ các quân khác trong các chiến dịch kết hợp.`,
          instruction:
            'Di chuyển Công Binh đến bất kỳ ô hợp lệ nào. Công Binh di chuyển 1 ô phương thẳng.',
          hint: 'Công Binh di chuyển chính xác như Bộ Bin - đường thẳng, 1 ô mỗi lần.',
          successMessage: 'Xuất sắc! Công Binh chia sẻ cùng di chuyển với Bộ Bin.'
        },
        'bm-1-3': {
          title: 'Di Chuyển Dân Quân',
          description: 'Dân Quân là quân linh hoạt có thể di chuyển tất cả 8 hướng, 1 ô mỗi lần.',
          content: `## Dân Quân

- Di chuyển **1 ô theo bất kỳ hướng nào** (phương thẳng + chéo).
- Vẫn là **quân bộ**, giới hạn ở vùng đất và hỗn hợp.
- Các góc linh hoạt làm cho nó tuyệt vời cho các điều chỉnh chiến thuật nhanh.`,
          instruction:
            'Di chuyển Dân Quân. Dân Quân có thể di chuyển tất cả các hướng - phương thẳng VÀ chéo.',
          hint: 'Dân Quân linh hoạt hơn Bộ Bin. Thử di chuyển chéo cũng như thẳng.',
          successMessage: 'Tuyệt! Dân Quân di chuyển tất cả 8 hướng, 1 ô mỗi lần.'
        },
        'bm-1-4': {
          title: 'Di Chuyển Tư Lệnh',
          description:
            'Tư Lệnh là quân đặc biệt di chuyển không giới hạn ô phương thẳng nhưng chỉ 1 ô để bắt quân.',
          content: `## Tư Lệnh

- Di chuyển **bất kỳ khoảng cách phương thẳng** (di chuyển như Xe).
- Chỉ bắt quân **ô liền kề** ở dạng cơ bản.
- Giữ nó an toàn — mất Tư Lệnh kết thúc trò chơi.`,
          instruction:
            'Di chuyển Tư Lệnh. Tư Lệnh có thể di chuyển không giới hạn ô phương thẳng (như Xe trong cờ vua).',
          hint: 'Thử di chuyển Tư Lệnh hết lên trên hoặc xuống dưới bàn cờ trong một nước.',
          successMessage:
            'Tốt! Tư Lệnh có di chuyển phương thẳng không giới hạn - một quân chiến thuật mạnh.'
        },
        'bm-1-5': {
          title: 'Bộ Tư Lệnh',
          description: 'Bộ Tư Lệnh là quân bất động - không thể di chuyển trên bàn cờ.',
          content: `## Bộ Tư Lệnh

- **Bất động** ở dạng cơ bản (không thể di chuyển hoặc bắt quân).
- Phải **được mang trong chồng** hoặc trở thành anh hùng để di chuyển.
- Bảo vệ nó như một tài sản chiến lược quan trọng.`,
          instruction:
            'Bộ Tư Lệnh không thể di chuyển. Nhấp vào nó hoặc bất kỳ ô nào để hoàn thành bài học.',
          hint: 'Bộ Tư Lệnh đại diện cho cấu trúc chỉ huy của bạn - nó ở nguyên vị trí để phòng thủ.',
          successMessage:
            'Chính xác! Bộ Tư Lệnh bất động - một tài sản chiến lược quan trọng cần bảo vệ.'
        },
        'bm-2-1': {
          title: 'Di Chuyển Tăng',
          description: 'Tăng là quân bọc thép di chuyển tối đa 2 ô phương thẳng.',
          content: `## Tăng

- Di chuyển **1-2 ô phương thẳng**.
- Khả năng cơ động tầm trung mạnh cho kiểm soát mặt đất.
- Các bài học sau sẽ đề cập đến khả năng **bắn qua chướng ngại vật**.`,
          instruction:
            'Di chuyển Tăng. Tăng di chuyển tối đa 2 ô phương thẳng - có thể di chuyển 1 hoặc 2 ô, nhưng không 3 hoặc hơn.',
          hint: 'Hãy nghĩ về Tăng như một Bộ Bin cơ động hơn. Có thể di chuyển 1 hoặc 2 ô theo đường thẳng.',
          successMessage:
            'Xuất sắc! Tăng có thể di chuyển 1 hoặc 2 ô phương thẳng, mang lại sự linh hoạt chiến thuật hơn.'
        },
        'bm-2-2': {
          title: 'Di Chuyển Phòng Không',
          description: 'Quân Phòng Không di chuyển 1 ô phương thẳng và cung cấp phòng không.',
          content: `## Phòng Không

- Di chuyển **1 ô phương thẳng**.
- Tạo ra **vùng phòng không 1 ô** xung quanh nó.
- Một người phòng thủ quan trọng chống lại mối đe dọa Không Quân.`,
          instruction:
            'Di chuyển quân Phòng Không. Giống Bộ Bin, Phòng Không di chuyển 1 ô phương thẳng.',
          hint: 'Di chuyển Phòng Không giống hệt Bộ Bin - đường thẳng, 1 ô mỗi lần.',
          successMessage:
            'Tốt! Phòng Không di chuyển như Bộ Bin, nhưng cung cấp phòng không quan trọng.'
        },
        'bm-2-3': {
          title: 'Di Chuyển Tên Lửa',
          description:
            'Tên Lửa có kiểu di chuyển hình tròn độc đáo: 2 ô phương thẳng hoặc 1 ô chéo.',
          content: `## Tên Lửa

- Di chuyển **tối đa 2 ô phương thẳng**.
- Di chuyển **1 ô chéo** (tầm tới hình tròn nhỏ gọn).
- Tạo ra **vùng phòng không 2 ô**.`,
          instruction:
            'Di chuyển Tên Lửa. Tên Lửa có kiểu tiếp cận hình tròn: tối đa 2 ô thẳng HOẶC 1 ô chéo.',
          hint: 'Hãy tưởng một vòng tròn quanh Tên Lửa - nó có thể tiếp cận các cạnh bên ngoài của vòng tròn đó.',
          successMessage:
            'Hoàn hảo! Tên Lửa có tầm tiếp cận hình tròn độc đáo - hữu ích cho các vị trí chiến thuật đa dạng.'
        },
        'bm-3-1': {
          title: 'Di Chuyển Pháo',
          description: 'Pháo có thể di chuyển không giới hạn ô phương thẳng, bỏ qua các quân chặn.',
          content: `## Pháo

- Di chuyển **bất kỳ khoảng cách phương thẳng**.
- **Quân nặng**: phải sử dụng **ô cầu** để qua sông.
- Các bài học sau sẽ đề cập đến quy tắc bắt tầm xa.`,
          instruction:
            'Di chuyển Pháo. Pháo có thể di chuyển bất kỳ số ô phương thẳng nào, giống như Xe trong cờ vua. Có thể bắn qua chướng ngại vật!',
          hint: 'Hãy nghĩ về Pháo như một quân tầm xa. Có thể di chuyển qua toàn bộ bàn cờ theo đường thẳng.',
          successMessage:
            'Xuất sắc! Pháo có tầm phương thẳng không giới hạn - một quân tầm xa mạnh.'
        },
        'bm-3-2': {
          title: 'Di Chuyển Không Quân',
          description:
            'Không Quân có thể bay đến bất kỳ ô ĐẤT nào trong tầm 4, bỏ qua địa hình và các quân khác.',
          content: `## Không Quân

- Bay **tối đa 4 ô** theo bất kỳ hướng nào.
- **Bỏ qua địa hình và chặn**, nhưng chỉ có thể **hạ cánh trên vùng đất**.
- Chịu ảnh hưởng bởi **vùng phòng không** địch.`,
          instruction:
            'Di chuyển Không Quân. Không Quân có thể tiếp cận bất kỳ ô đất nào trong khoảng cách 4, bỏ qua chướng ngại vật!',
          hint: 'Không Quân có khả năng cơ động tuyệt vời (tầm 4) và bỏ qua chướng ngại vật, nhưng không thể hạ cánh trên nước (cột a-b).',
          successMessage:
            'Tuyệt vời! Không Quân là một quân linh hoạt với khả năng cơ động và tầm cao.'
        },
        'bm-3-3': {
          title: 'Di Chuyển Hải Quân',
          description:
            'Hải Quân di chuyển trong vùng nước (cột a-b và ven biển). Có tầm 4 ô tất cả các hướng.',
          content: `## Hải Quân

- Di chuyển **tối đa 4 ô** theo bất kỳ hướng nào.
- Giới hạn trong **vùng hải quân** (cột a-c và các ô sông).
- Có thể điều hướng vùng nước đông đúc bằng cách **bỏ qua chặn**.`,
          instruction:
            'Di chuyển tàu Hải Quân. Hải Quân chỉ có thể di chuyển trong vùng nước: cột a-b và cột ven biển c. Có tầm 4 ô tất cả các hướng trong các vùng này.',
          hint: 'Hải Quân bị giới hạn ở nước. Nhìn vào cột a, b, và c - đó là nơi Hải Quân hoạt động.',
          successMessage:
            'Tốt! Hải Quân kiểm soát vùng nước - thiết yếu cho sự thống trị trên biển và phòng thủ chiến lược.'
        }
      }
    },
    'subject-2-terrain': {
      subject: {
        title: 'Địa Hình',
        description: 'Tìm hiểu về nước, đất, qua sông, và các vùng hỗn hợp.',
        introduction: `# Địa Hình trong Cờ Tư Lệnh

![Hướng Dẫn Địa Hình](custom:terrain-guide)

Chiến trường Cờ Tư Lệnh không phải là một sân chơi đồng nhất. Địa hình định hình mọi quyết định chiến thuật, xác định nơi các quân của bạn có thể hoạt động và cách chúng phải cơ động để đạt được mục tiêu.

## Hệ Thống Địa Hình

Bàn cờ 11×12 được chia thành các vùng hoạt động khác biệt mô phỏng các môi trường khác nhau - từ biển mở đến bờ biển tranh chấp đến lãnh thổ nội địa.

### Vùng Nước (Cột a-b)

![Vùng Nước và Ven Biển](/learn/subject-2/water-coastal-map.svg)

**Nước Thuần** chiếm hai cột bên trái của bàn cờ:
- Chỉ có **Hải Quân** và **Không Quân** có thể hoạt động ở đây
- Quân bộ không thể vào - cố gắng làm là nước đi bất hợp pháp
- Quân Hải Quân thống trị vùng này với tầm 4 ô

**Tầm Quan Trọng Chiến Lược**: Kiểm soát vùng nước bảo vệ sườn và cho phép hoạt động hải quân dọc bờ biển.

### Vùng Ven Biển/Hỗn Hợp (Cột c + Các Ô Sông)

**Địa Hình Hỗn Hợp** cho phép cả hoạt động nước và đất:
- **Cột c** (toàn bộ cột) - giao diện ven biển
- **Các ô sông**: d6, e6, d7, e7 - nơi sông gặp địa hình hỗn hợp

**Ai Có Thể Hoạt Động Ở Đây**:
- Hải Quân có thể tuần tra vùng nước này
- Quân bộ có thể tiếp cận bờ biển
- Tạo ra vùng tranh chấp nơi các loại quân tương tác

**Tầm Quan Trọng Chiến Lược**: Vùng hỗn hợp thường là chiến trường nơi hải quân và lục quân đụng độ.

### Vùng Đất (Cột d-k)

**Đất Thuần** chiếm phần lớn bàn cờ:
- Tất cả các quân bộ hoạt động tự do ở đây
- Hải Quân không thể vào các vùng này
- Không Quân có thể bay qua tự do

**Tầm Quan Trọng Chiến Lược**: Đây là nơi phần lớn chiến đấu trên bộ xảy ra. Đặt bộ binh, tăng, và pháo của bạn một cách hiệu quả.

### Con Sông (Giữa Hạng 6 và 7)

![Sông và Cầu](custom:bridge-detail)

**Sông** chia bàn cờ thành lãnh thổ phía bắc và phía nam:
- Chạy ngang qua toàn bộ bàn cờ
- Tạo ra rào chắn tự nhiên
- Các quân khác nhau có khả năng qua sông khác nhau

**Quy Tắc Qua Sông**:
- **Quân nhẹ** (Bộ Bin, Dân Quân, Tăng, Tư Lệnh): Có thể qua sông tự do
- **Quân nặng** (Pháo, Phòng Không, Tên Lửa): PHẢI dùng ô cầu f6/f7 hoặc h6/h7
- **Không Quân**: Bay qua - không hạn chế
- **Hải Quân**: Có thể tiếp cận các ô sông d6, e6, d7, e7 (vùng hỗn hợp)

### Ô Cầu (f6/f7 và h6/h7)

**Cầu** là các điểm nghẽn quan trọng cho di chuyển của quân nặng:
- Nằm ở f6/f7 (cầu phía tây) và h6/h7 (cầu phía đông)
- Quân nặng PHẢI đi qua các ô này để qua sông
- Kiểm soát cầu có thể bẫy quân nặng địch ở một bên

**Tầm Quan Trọng Chiến Lược**: Chặn hoặc kiểm soát cầu hạn chế khả năng cơ động của pháo nặng địch.

## Địa Hình Theo Loại Quân

**Hải Quân**: Nước (a-b) Có, Ven biển Có, Sông Có, Đất Không

**Bộ Bin**: Nước Không, Ven biển Có, Sông Không, Đất Có

**Tăng**: Nước Không, Ven biển Có, Sông Qua tự do, Đất Có

**Pháo**: Nước Không, Ven biển Có, Sông Chỉ qua cầu, Đất Có

**Không Quân**: Nước Có, Ven biển Có, Sông Có, Đất Có (bỏ qua mọi địa hình!)

**Tư Lệnh**: Nước Không, Ven biển Có, Sông Qua tự do, Đất Có

## Tại Sao Địa Hình Quan Trọng

**Lập Kế Hoạch Di Chuyển**: Bạn phải xem xét địa hình trước mỗi nước đi. Tăng ở e5 không thể đến b5 trực tiếp - nước chặn nó.

**Vị Trí Chiến Lược**: Đặt Hải Quân nơi nó kiểm soát vùng nước. Đặt Pháo nơi nó có thể tiếp cận mục tiêu mà không cần qua sông.

**Lợi Thế Phòng Thủ**: Sử dụng địa hình để bảo vệ quân của bạn. Hải Quân ở vùng nước an toàn trước hầu hết các cuộc tấn công trên bộ.

**Kết Hợp Vũ Khí**: Phối hợp các loại quân khác nhau. Sử dụng Không Quân để tấn công nơi quân bộ không thể đến.

## Bạn Sẽ Học Gì

Trong môn học này, bạn sẽ làm chủ địa hình qua thực hành:
- Điều hướng vùng nước với Hải Quân
- Hiểu quân bộ có thể và không thể đi đâu
- Qua sông với quân nhẹ và nặng
- Sử dụng cầu một cách chiến lược
- Tận dụng vùng hỗn hợp để có lợi thế chiến thuật

**Sự thành thạo địa hình phân biệt chỉ huy mới với chuyên gia. Hãy bắt đầu!**`
      },
      sections: {
        'section-1-terrain-basics': {
          title: 'Cơ Bản Về Địa Hình',
          description: 'Tìm hiểu về nước, đất, qua sông, và các vùng hỗn hợp.',
          introduction: `# Cơ Bản Về Địa Hình

![Hướng Dẫn Địa Hình](custom:terrain-guide)

Địa hình kiểm soát nơi mỗi quân có thể hoạt động. Hiểu các hạn chế địa hình là thiết yếu cho nước đi hợp lệ và vị trí chiến lược.

## Tham Khảo Nhanh

**Nước Thuần (a, b)**: Chỉ Hải Quân và Không Quân

**Hỗn Hợp/Ven Biển (c, d6, e6, d7, e7)**: Hải Quân VÀ Quân Bộ

**Đất (d-k trừ sông)**: Tất cả quân bộ

**Cầu (f6/f7, h6/h7)**: Quân nặng qua đây

## Quy Tắc Chính

- **Hải Quân** bị giới hạn ở nước - không thể vào vùng đất thuần
- **Quân bộ** không thể vào vùng nước thuần (cột a-b)
- **Quân nặng** (Pháo, Phòng Không, Tên Lửa) cần cầu để qua sông
- **Không Quân** bỏ qua mọi địa hình - có thể đi mọi nơi!

Các bài học này dạy từng quy tắc qua thực hành.`
        }
      },
      lessons: {
        'terrain-1': {
          title: 'Nước và Đất',
          description: 'Tìm hiểu các ô thuộc vùng nước và vùng đất.',
          content: `## Nước và Đất

- **Vùng Hải Quân**: cột **a-b** plus tiếp cận **cột ven biển**.
- **Vùng Đất**: cột **d-k**.
- **Vùng hỗn hợp** (cột c và các ô sông) cho phép cả Hải Quân và Quân Bộ.`,
          instruction:
            'Địa hình chia bàn cờ thành nước và đất. Tàu Hải Quân ở trên nước (cột a-c), trong khi quân bộ ở trên đất (cột d-k). Di chuyển Hải Quân đến mục tiêu nước và Tăng đến mục tiêu đất.',
          hint: 'Dùng Hải Quân cho mục tiêu cột a/b và Tăng cho mục tiêu d-k.',
          successMessage: 'Hay! Nước dành cho Hải Quân, đất dành cho quân bộ.'
        },
        'terrain-2': {
          title: 'Sông và Cầu',
          description: 'Qua sông với Tăng và sử dụng cầu cho Pháo.',
          content: `## Sông và Cầu

- Sông nằm **giữa hàng 6 và 7**.
- **Tăng** có thể qua bình thường.
- **Quân nặng** (Pháo/Phòng Không/Tên Lửa) phải dùng **ô cầu**: f6/f7 hoặc h6/h7.`,
          instruction:
            'Sông chạy giữa hàng 6 và 7. Tăng có thể qua, nhưng Pháo nặng phải dùng ô cầu (f6/f7 hoặc h6/h7). Di chuyển Tăng qua sông và di chuyển Pháo lên ô cầu.',
          hint: 'Tăng đến e7 được. Pháo nên đến thăm f6 và f7.',
          successMessage: 'Đẹp! Tăng có thể qua sông, nhưng Pháo cần cầu.'
        },
        'terrain-3': {
          title: 'Vùng Hỗn Hợp',
          description: 'Thực hành các ô cả Hải Quân và Quân Bộ đều có thể dùng.',
          content: `## Vùng Hỗn Hợp

- **Cột c** và **các ô sông** là địa hình chia sẻ.
- Cả **Hải Quân** và **Quân Bộ** đều có thể di chuyển qua các ô này.
- Sử dụng vùng hỗn hợp để chuyển tiếp giữa hoạt động nước và đất.`,
          instruction:
            'Vùng hỗn hợp là địa hình chia sẻ: cột c và các ô sông. Cả Hải Quân và Quân Bộ đều có thể di chuyển đến đó. Tiếp cận tất cả các mục tiêu vùng hỗn hợp.',
          hint: 'Dùng quân bất kỳ để thăm cột c và các ô sông.',
          successMessage: 'Hoàn hảo! Vùng hỗn hợp được chia sẻ bởi Hải Quân và Quân Bộ.'
        }
      }
    },
    'subject-3-capture': {
      subject: {
        title: 'Bắt Quân',
        description: 'Tìm hiểu bắt quân bình thường, bắt quân tại chỗ, và các trường hợp đặc biệt.',
        introduction: `# Bắt Quân trong Cờ Tư Lệnh

Bắt quân địch là nền tảng của chiến thắng. Trong Cờ Tư Lệnh, bạn có thể loại bỏ quân địch qua nhiều cơ chế bắt quân khác nhau, mỗi cái có ý nghĩa chiến thuật.

## Bắt Quân Bình Thường (Bắt Quân Di Chuyển)

Loại bắt quân phổ biến nhất - giống cờ vua:
- Di chuyển quân của bạn đến ô có quân địch
- Quân địch bị loại khỏi bàn cờ
- Quân của bạn chiếm ô đó

**Tất cả quân** đều có thể thực hiện bắt quân bình thường trong tầm di chuyển.

**Ví dụ**: Bộ Bin ở e4 có thể bắt quân địch ở e5 bằng cách di chuyển đến đó.

## Bắt Quân Tại Chỗ (Tấn Công Từ Xa)

Một số quân có thể **phá hủy kẻ thù mà không cần di chuyển** - một cuộc tấn công từ xa:
- Quân tấn công giữ nguyên vị trí ban đầu
- Quân mục tiêu bị phá hủy
- Ô mục tiêu trở thành trống

**Quân Có Bắt Tại Chỗ**:
- **Pháo**: Có bắt tại chỗ trong tầm 3 ô
- **Không Quân**: Có bắt tại chỗ trong tầm 4 ô
- **Hải Quân**: Có bắt tại chỗ trong tầm 4 ô
- **Tên Lửa**: Có bắt tại chỗ trong kiểu tầm của nó

**Lợi Thế Chiến Lược**: Bắt tại chỗ cho phép bạn loại bỏ mối đe dọa trong khi duy trì vị trí. Quân của bạn không bị phơi bày vì tiến lên.

## Bắt Quân Tự Sát (Phá Hủy Lẫn Nhau)

Trong trường hợp hiếm, cả người tấn công và người phòng thủ đều bị phá hủy:
- **Không Quân Tự Sát**: Không Quân có thể thực hiện các cuộc tấn công tự sát trong một số tình huống
- **Tư Lệnh Tiếp Xúc**: Khi các tư lệnh đối mặt nhau trên hàng/cột rõ ràng, cả hai đều bị bắt

## Tầm Bắt Quân vs Tầm Di Chuyển

Một số quân có **tầm khác nhau cho bắt quân so với di chuyển**:

**Tư Lệnh**: Di chuyển không giới hạn ô, nhưng chỉ bắt 1 ô liền kề

**Tư Lệnh Anh Hùng**: Di chuyển không giới hạn, bắt tối đa 2 ô

**Tất cả quân khác**: Tầm di chuyển và bắt giống nhau

Điều này có nghĩa là Tư Lệnh mạnh về di chuyển nhưng phải đến gần để bắt quân.

## Chặn và Tầm Nhìn

**Hầu hết quân** không thể bắt qua các quân khác:
- Bộ Bin, Dân Quân, Tăng, Tư Lệnh, Công Binh, Bộ Tư Lệnh
- Cần đường dẫn rõ ràng đến mục tiêu

**Quân Bỏ Qua Chặn**:
- **Pháo**: Bắn qua các quân xen giữa
- **Tăng**: Có thể bắn qua quân chặn
- **Tên Lửa**: Có thể bắn qua quân chặn
- **Không Quân**: Bay qua tất cả
- **Hải Quân**: Bắn qua quân chặn

**Ý Nghĩa Chiến Lược**: Sử dụng quân chặn để bảo vệ mục tiêu giá trị cao khỏi bắt quân trực tiếp.

## Bắt Quân và Địa Hình

Bắt quân tuân theo quy tắc địa hình:
- **Hải Quân** không thể bắt quân ở vùng đất thuần (không thể tiếp cận)
- **Quân bộ** không thể bắt quân ở vùng nước thuần
- **Không Quân** có thể bắt ở mọi nơi (bỏ qua địa hình)
- **Quân nặng** phải tuân thủ yêu cầu cầu ngay cả khi bắt quân

## Trường Hợp Bắt Quân Đặc Biệt

### Chặn Không Không Quân
Nếu Không Quân cố gắng di chuyển qua hoặc vào ô được bao phủ bởi phòng không địch (Phòng Không hoặc Tên Lửa), nó có thể bị phá hủy trước khi hoàn thành nước đi.

### Bắt Tư Lệnh
Bắt Tư Lệnh địch ngay lập tức thắng trò chơi - tương đương chiếu hết.

### Bắt Chồng Quân
Khi bắt một chồng quân, bạn bắt **toàn bộ chồng** (vật chở plus tất cả các quân được mang).

## Trạng Thái Anh Hùng và Bắt Quân

**Quân Anh Hùng** có khả năng bắt quân nâng cao:
- Tăng tầm bắt quân cho hầu hết các quân
- Bộ Bin: 1 → 2 ô
- Tăng: 2 → 3 ô
- Tư Lệnh: 1 → 2 ô
- Và các nâng cao tương tự cho các quân khác

## Nguyên Tắc Chiến Lược Bắt Quân

**Lợi Thế Vật Chất**: Mỗi quân bị bắt làm suy yếu đối thủ. Trao đổi khôn ngoan.

**Giá Trị Quân**: Không phải tất cả quân đều ngang nhau. Bảo vệ Tư Lệnh và các quân giá trị cao.

**Vị Trí so Vật Chất**: Đôi khi kiểm soát các ô quan trọng đáng để hy sinh một quân.

**Nhịp Độ**: Các nước đi vừa bắt quân vừa cải thiện vị trí của bạn có giá trị kép.

## Bạn Sẽ Học Gì

Môn học này bao gồm cơ chế bắt quân qua thực hành:
- Thực hiện bắt quân bình thường với các quân khác nhau
- Thực hiện bắt quân tại chỗ với Pháo và Không Quân
- Hiểu tầm bắt quân và chặn
- Bắt quân qua các vùng địa hình khác nhau
- Làm chủ các tình huống bắt quân đặc biệt

**Chiến đấu là trái tim của chiến lược. Nắm vững các bắt quân này để thống trị chiến trường!**`
      },
      sections: {
        'section-1-capture-basics': {
          title: 'Cơ Bản Về Bắt Quân',
          description:
            'Tìm hiểu bắt quân bình thường, bắt quân tại chỗ, và các trường hợp đặc biệt.',
          introduction: `# Cơ Bản Về Bắt Quân

Bắt quân loại bỏ quân địch khỏi bàn cờ. Cờ Tư Lệnh có nhiều kiểu bắt:

## Tổng Quan Các Loại Bắt

**Bắt Quân Bình Thường**: Di chuyển đến ô địch - tất cả quân đều có thể

**Bắt Quân Tại Chỗ**: Phá hủy mục tiêu mà không di chuyển - Pháo, Không Quân, Hải Quân, Tên Lửa

**Bắt Quân Tự Sát**: Cả hai quân đều bị phá hủy - Không Quân (kamikaze)

## Khái Niểm Chính

- **Tầm Bắt**: Một số quân có tầm bắt khác với tầm di chuyển (ví dụ: Tư Lệnh)
- **Chặn**: Hầu hết quân không thể bắt qua quân khác; một số ngoại lệ tồn tại
- **Địa hình**: Bắt quân tuân theo cùng quy tắc địa hình như di chuyển

Mỗi bài học dạy một cơ chế bắt quân qua thực hành.`
        }
      },
      lessons: {
        'capture-1': {
          title: 'Bắt Quân Bình Thường',
          description: 'Bắt quân bằng cách di chuyển vào ô có quân địch.',
          content: `## Bắt Quân Bình Thường

- Bắt bằng cách **di chuyển vào** ô có quân địch.
- Quân của bạn thay thế địch ở ô đó.
- Quy tắc chuẩn cho hầu hết quân và tình huống.`,
          instruction:
            'Bắt quân bình thường có nghĩa là bạn di chuyển đến ô địch. Bắt quân địch ngay phía trên bạn.',
          hint: 'Di chuyển Bộ Bin từ e5 đến e6 để bắt.',
          successMessage: 'Hay! Bắt quân bình thường thay thế địch trên ô của nó.'
        },
        'capture-2': {
          title: 'Bắt Quân Tại Chỗ',
          description: 'Phá hủy mục tiêu mà không rời khỏi ô của bạn.',
          content: `## Bắt Quân Tại Chỗ

- Một số quân (như **Pháo**) có thể **phá hủy mục tiêu mà không di chuyển**.
- Người tấn công giữ nguyên vị trí trong khi địch bị loại bỏ.
- Hữu ích để giữ các vị trí quan trọng trong khi tấn công.`,
          instruction:
            'Bắt quân tại chỗ phá hủy mục tiêu nhưng người tấn công giữ nguyên. Dùng Pháo để phá hủy mục tiêu trên d5 mà không di chuyển.',
          hint: 'Chọn tùy chọn bắt tại chỗ khi bạn tấn công ô mục tiêu.',
          successMessage: 'Hoàn hảo! Bắt quân tại chỗ loại bỏ địch trong khi bạn giữ vị trí.'
        },
        'capture-3': {
          title: 'Bắt Quân Qua Sông',
          description: 'Pháo có thể bắt quân qua sông.',
          content: `## Bắt Quân Qua Sông

- Sông chia hàng **6** và **7**.
- **Pháo** có thể bắt qua sông khi trong tầm.
- Quân nặng vẫn cần **cầu** để *di chuyển* qua.`,
          instruction:
            'Sông chia hàng 6 và 7. Pháo có thể qua và bắt qua nó. Bắt quân địch tại j8.',
          hint: 'Từ j5, di chuyển Pháo hai ô đến j8.',
          successMessage: 'Tuyệt! Pháo đã qua sông để bắt quân.'
        },
        'capture-4': {
          title: 'Bắt Quân Không Quân',
          description: 'Không Quân bắt quân bằng tầm bay xa.',
          content: `## Bắt Quân Không Quân

- Không Quân bắt **trong tầm bay**.
- **Bỏ qua địa hình và chặn** trong khi bay.
- Cẩn thận với **vùng phòng không**.`,
          instruction:
            'Không Quân có thể bắt trong tầm bay, bỏ qua địa hình và chặn. Bắt quân mục tiêu trên f8.',
          hint: 'Di chuyển Không Quân thẳng lên đến f8 để bắt.',
          successMessage: 'Xuất sắc! Không Quân bắt từ tầm xa.'
        }
      }
    },
    'subject-4-blocking': {
      subject: {
        title: 'Cơ Chế Chặn',
        description: 'Tìm hiểu quân nào có thể di chuyển hoặc bắt qua các quân khác.',
        introduction: `# Cơ Chế Chặn trong Cờ Tư Lệnh

Hiểu quân nào có thể di chuyển hoặc bắt qua các quân khác là rất quan trọng để làm chủ chiến thuật Cờ Tư Lệnh. Các quân khác nhau có quy tắc chặn khác nhau cho di chuyển và bắt quân.

## Các Quân Bị Chặn Bởi Khác (Di CHUYỂN và BẮT)

Các quân này không thể di chuyển hoặc bắt qua các quân xen giữa:
- **Bộ Bin**: Bị chặn mọi hướng
- **Dân Quân**: Bị chặn mọi hướng
- **Tư Lệnh**: Bị chặn mọi hướng (mặc dù có tầm di chuyển không giới hạn)
- **Công Binh**: Bị chặn mọi hướng
- **Bộ Tư Lệnh**: Bị chặn (khi anh hùng và có thể di chuyển)
- **Phòng Không**: Bị chặn mọi hướng

## Các Quân Bỏ Qua Chặn

Một số quân có thể di chuyển và/hoặc bắt qua các quân xen giữa:

### Tăng - Bị Chặn Di Chuyển, Không Bị Chặn Bắt
- **Di chuyển**: BỊ CHẶN - Không thể di chuyển qua các quân khác
- **Bắt quân**: KHÔNG BỊ CHẶN - Có thể bắn qua các quân để bắt ("Bắn Qua Chặn")

### Pháo - Bị Chặn Di Chuyển, Không Bị Chặn Bắt
- **Di chuyển**: BỊ CHẶN - Không thể di chuyển qua các quân khác
- **Bắt quân**: KHÔNG BỊ CHẶN - Có thể bắn qua các quân để bắt

### Tên Lửa - Bị Chặn Di Chuyển, Không Bị Chặn Bắt
- **Di chuyển**: BỊ CHẶN - Không thể di chuyển qua các quân khác
- **Bắt quân**: KHÔNG BỊ CHẶN - Có thể bắn qua các quân để bắt

### Không Quân - Bỏ Qua Mọi Chặn
- **Di chuyển**: KHÔNG BỊ CHẶN - Bay qua mọi quân
- **Bắt quân**: KHÔNG BỊ CHẶN - Có thể tấn công qua mọi quân

### Hải Quân - Bỏ Qua Mọi Chặn
- **Di chuyển**: KHÔNG BỊ CHẶN - Có thể di chuyển qua các quân khác
- **Bắt quân**: KHÔNG BỊ CHẶN - Có thể tấn công qua các quân khác

## Ý Nghĩa Chiến Lược

**Hàng Rào Phòng Thủ**: Đặt quân trước Tư Lệnh hoặc các quân giá trị cao của bạn. Hầu hết kẻ thù không thể đến qua hàng phòng thủ của bạn.

**Tấn Công Từ Xa**: Tăng, Pháo, và Tên Lửa có thể loại bỏ mối đe dọa phía sau hàng quân địch bằng cách bắn qua các quân chặn.

**Thống Lực Bầu Trời**: Không Quân bỏ qua mọi chặn, khiến nó gây sát thương nặng trước các vị trí được bảo vệ.

**Sự Linh Hoạt Của Hải Quân**: Các quân Hải Quân có thể điều hướng qua vùng nước đông đúc tự do.

## Bảng Tóm Tắt Chặn

| Loại Quân    | Di Chuyển Bị Chặn? | Bắt Quân Bị Chặn? |
|--------------|---------------------|-------------------|
| Bộ Bin       | Có                  | Có                |
| Dân Quân     | Có                  | Có                |
| Tư Lệnh      | Có                  | Có                |
| Công Binh    | Có                  | Có                |
| Phòng Không  | Có                  | Có                |
| Bộ Tư Lệnh   | Có                  | Có                |
| Tăng         | Có                  | **Không**         |
| Pháo         | Có                  | **Không**         |
| Tên Lửa      | Có                  | **Không**         |
| Không Quân   | **Không**           | **Không**         |
| Hải Quân     | **Không**           | **Không**         |

## Bạn Sẽ Học Gì

Môn học này dạy cơ chế chặn qua thực hành:
- Trải nghiệm di chuyển bị chặn với Bộ Bin
- Sử dụng Tăng để bắn qua các quân chặn
- Triển khai Pháo cho các đòn tấn công tầm xa qua hàng
- Làm chủ khả năng của Không Quân để bỏ qua mọi chướng ngại
- Điều hướng Hải Quân qua vùng nước đông đúc

**Hiểu về chặn là chìa khóa cho cả tấn công và phòng thủ!**`
      },
      sections: {
        'section-1-block-movement': {
          title: 'Chặn Di Chuyển',
          description: 'Tìm hiểu cách các quân bị chặn di chuyển bởi chướng ngại.',
          introduction: `# Các Quân Bị Chặn

Hầu hết quân trong Cờ Tư Lệnh không thể di chuyển hoặc bắt qua các quân khác. Điều này tạo cơ hội chiến thuật cho phòng thủ và kiểm soát không gian.

## Khái Niệm Chính

- **Chặn Di Chuyển**: Một quân trên đường đi ngăn bạn đi qua
- **Chặn Bắt Quân**: Một quân trên đường đi ngăn bạn bắt qua nó
- **Tầm Nhìn**: Bạn cần đường dẫn rõ ràng để đến đích

Học cách chặn ảnh hưởng các quân khác nhau qua các bài tập này.`
        },
        'section-2-blocking-capture': {
          title: 'Chặn Bắt Quân',
          description: 'Tìm hiểu cách các quân tương tác với chặn khi bắt quân.',
          introduction: `# Các Quân Bỏ Qua Chặn

Một số quân có khả năng đặc biệt cho phép bỏ qua chặn:

## Bắn Qua Chặn (Chỉ Bắt Quân)
- **Tăng**: Có thể bắn qua các quân để bắt
- **Pháo**: Có thể bắn qua các quân để bắt
- **Tên Lửa**: Có thể bắn qua các quân để bắt

## Bỏ Qua Chặn Hoàn Toàn (Di Chuyển và Bắt)
- **Không Quân**: Bay qua mọi thứ
- **Hải Quân**: Di chuyển tự do qua các quân khác

Làm chủ các khả năng này để phá vỡ phòng thủ địch!`
        }
      },
      lessons: {
        'blocking-1': {
          title: 'Tăng Bị Chặn',
          description: 'Tăng không thể di chuyển qua các quân khác.',
          content: `## Chặn Di Chuyển

- Hầu hết quân bộ **không thể di chuyển qua các quân**.
- Tăng phải dừng trước quân chặn.
- Lập kế hoạch quanh các quân chặn để giữ lanes mở.`,
          instruction:
            'Tăng ở e4 bị chặn bởi Bộ Bin đồng minh ở e5. Thử di chuyển về phía trước - bạn chỉ có thể đến e5 nếu bắt, nhưng không thể đi qua.',
          hint: 'Di chuyển Tăng ở e4 sang ngang đến d4 hoặc f4 vì phía trước bị chặn.',
          successMessage: 'Chính xác! Tăng phải đi quanh các quân chặn.'
        },
        'blocking-2': {
          title: 'Pháo Bị Chặn',
          description: 'Pháo không thể di chuyển qua các quân khác.',
          content: `## Di Chuyển Pháo

- Pháo di chuyển xa, nhưng **không thể đi qua chặn**.
- Cần đường dẫn rõ ràng để di chuyển.
- Các bài học sau sẽ cho thấy cách nó có thể **bắt qua chặn**.`,
          instruction:
            'Pháo ở e4 bị chặn bởi Bộ Bin đồng minh ở e5. Mặc dù là quân tầm xa, nó không thể di chuyển qua các quân.',
          hint: 'Di chuyển Pháo sang ngang đến d4 hoặc f4.',
          successMessage: 'Tốt! Pháo cần đường dẫn mở để di chuyển.'
        },
        'blocking-3': {
          title: 'Tư Lệnh Bị Chặn Mặc Dù Có Tầm',
          description: 'Kể cả Tư Lệnh với tầm vô hạn cũng không thể đi qua các quân.',
          content: `## Chặn Tư Lệnh

- Tư Lệnh có **tầm vô hạn**.
- Vẫn **không thể di chuyển qua các quân**.
- Giữ lanes rõ ràng nếu cần di chuyển tầm xa.`,
          instruction:
            'Tư Lệnh có tầm di chuyển không giới hạn nhưng không thể di chuyển qua Bộ Bin ở e7. Di chuyển Tư Lệnh sang ngang hoặc向后.',
          hint: 'Tư Lệnh có thể di chuyển đến d5, f5, hoặc bất kỳ ô trống nào không bị Bộ Bin chặn.',
          successMessage: 'Đúng! Kể cả Tư Lệnh cũng tôn trọng chặn.'
        },
        'blocking-3a': {
          title: 'Di Chuyển Hải Quân Ven Biển',
          description: 'Hải Quân có thể đi qua đất ven biển nhưng bị chặn bởi hải quân khác.',
          content: `## Hải Quân Ven Biển

- Hải Quân bỏ qua **quân bộ** dọc bờ biển.
- **Bị chặn bởi Hải Quân khác** trên nước.
- Sử dụng lanes ven biển để lẻn qua sự tắc nghẽn trên đất.`,
          instruction:
            'Hải Quân ở a4 có thể di chuyển lên qua Bộ Bin đất ở c6 (đất ven biển không chặn hải quân), nhưng BỊ CHẶN bởi Hải Quân đồng minh ở a8. Di chuyển Hải Quân ở a4 sang ngang vì phía trước bị chặn.',
          hint: 'Hải Quân trên nước bị chặn bởi hải quân khác, không phải quân bộ trên bờ biển. Di chuyển sang ngang đến b4.',
          successMessage:
            'Chính xác! Hải Quân bị chặn bởi tàu khác, không phải quân bộ trên bờ biển.'
        },
        'blocking-4': {
          title: 'Tăng Bắn Qua Chặn',
          description: 'Tăng không thể di chuyển qua quân VÀ không thể bắn qua chúng.',
          content: `## Bắn Qua Chặn

- Tăng **không thể di chuyển qua** các quân.
- Tăng **không thể bắt qua** một quân chặn đơn.
- Điều này cho phép Tăng trừng phạt phòng thủ xếp chồng.`,
          instruction:
            'Tăng ở e4 không thể di chuyển qua Bộ Bin đồng minh ở e5, và KHÔNG THẺ bắt quân địch ở e7 bằng cách bắn qua chặn.',
          hint: 'Chọn Tăng và bắt bộ binh địch ở e7.',
          successMessage: 'Xuất sắc! Tăng di chuyển quanh để bắt.'
        },
        'blocking-5': {
          title: 'Đòn Tấn Pháo Tầm Xa',
          description: 'Pháo bỏ qua chặn khi bắt quân.',
          content: `## Đòn Pháo

- Pháo **bỏ qua chặn** khi bắt quân.
- Các cú bắn tầm xa có thể đi qua quân đồng minh.
- Tuyệt vời để phá vỡ hàng phòng thủ.`,
          instruction:
            'Pháo ở e4 có thể bắt quân địch ở e8 mặc dù Bộ Bin đồng minh ở e6. Bắn qua chặn!',
          hint: 'Tầm Pháo là 3 ô và bỏ qua chặn khi bắt.',
          successMessage: 'Hoàn hảo! Pháo bắn qua hàng phòng thủ.'
        },
        'blocking-6': {
          title: 'Không Quân Bay Qua Tất Cả',
          description: 'Không Quân bỏ qua mọi chặn cho cả di chuyển VÀ bắt quân.',
          content: `## Bay Qua Của Không Quân

- Không Quân **bỏ qua mọi chặn** cho di chuyển và bắt.
- Có thể bay qua cả quân đồng minh và địch.
- Chỉ có vùng phòng không có thể ngăn nó.`,
          instruction:
            'Không Quân ở f6 có thể bay qua cả hai Bộ Bin đồng minh để bắt quân địch ở f9. Không bỏ qua mọi chặn!',
          hint: 'Chọn Không Quân và bắt quân địch ở f9.',
          successMessage: 'Đáng kinh ngạc! Không Quân bỏ qua mọi chướng ngại vật trên mặt đất.'
        },
        'blocking-7': {
          title: 'Hải Quân Di Chuyển Qua Các Quân',
          description: 'Hải Quân có thể di chuyển và bắt qua các quân khác trên nước.',
          content: `## Điều Hướng Hải Quân

- Hải Quân **bỏ qua chặn** trên nước.
- Có thể di chuyển và bắt qua các tàu khác.
- Mạnh cho kiểm soát lane trên cột a-c.`,
          instruction:
            'Hải Quân ở a6 có thể di chuyển qua Hải Quân đồng minh ở a8 để bắt quân địch ở a4. Hải Quân bỏ qua chặn.',
          hint: 'Chọn Hải Quân ở a6 và bắt ở a4.',
          successMessage: 'Xuất sắc! Hải Quân điều hướng tự do qua vùng nước đông đúc.'
        },
        'blocking-8': {
          title: 'Tên Lửa Bắn Qua',
          description: 'Tên Lửa có thể bắt qua các quân chặn.',
          content: `## Bắt Tên Lửa

- Tên Lửa **bắt qua chặn**.
- Di chuyển vẫn bị chặn bởi các quân.
- Sử dụng tên lửa để bắn các mục tiêu được bảo vệ.`,
          instruction: 'Tên Lửa ở e4 có thể bắn qua Bộ Bin đồng minh ở e5 để bắt quân địch ở e7.',
          hint: 'Tầm Tên Lửa là 2 và bỏ qua chặn khi bắt.',
          successMessage: 'Hay! Tên Lửa bắn qua chướng ngại.'
        }
      }
    },
    'subject-5-air-defense': {
      subject: {
        title: 'Phòng Không',
        description: 'Điều hướng qua vùng phòng không và thực hiện bắt quân tự sát.',
        introduction: `# Phòng Không trong Cờ Tư Lệnh

Phòng Không tạo ra vùng nguy hiểm vô hình hạn chế di chuyển của Không Quân. Học các vùng này là thiết yếu cho đường bay an toàn và các đòn tấn công hiệu quả.

## Ai Cung Cấp Phòng Không

- **Phòng Không (G/g)**: Tầm 1
- **Tên Lửa (S/s)**: Tầm 2
- **Hải Quân (N/n)**: Tầm 1

Phiên bản anh hùng mở rộng tầm phòng không thêm 1.

## Điều Gì Xảy Ra Trong Vùng Phòng Thủ

Khi Không Quân di chuyển qua vùng phủ sóng phòng không địch:

- **Đi An Toàn**: Không gặp phòng thủ → di chuyển bình thường
- **Tự Sát**: Vào một vùng phòng thủ → di chuyển hoàn thành, Không Quân bị phá hủy
- **Bị Phá Hủy**: Vào nhiều vùng hoặc ra rồi vào lại → di chuyển bị chặn

## Ý Nghĩa Chiến Lược

- **Lập kế hoạch đường bay** để tránh các ô được bảo vệ
- **Chấp nhận hy sinh** khi đòn tự sát đáng giá với mục tiêu
- **Lớp phòng thủ** để từ chối quyền truy cập Không Quân hoàn toàn

## Bạn Sẽ Học Gì

- Điều hướng Không Quân quanh vùng phủ phòng không
- Xác định các đường an toàn đến nhiều mục tiêu
- Thực hiện bắt quân tự sát và xem Không Quân bị loại bỏ

Làm chủ phòng không để kiểm soát bầu trời.`
      },
      sections: {
        'section-1-avoid-air-defense': {
          title: 'Tránh Phòng Không',
          description: 'Tìm hiểu cách định tuyến Không Quân quanh các ô được bảo vệ.',
          introduction: `# Tránh Vùng Phòng Không

Vùng phủ phòng không là vô hình, nhưng nó kiểm soát không gian. Không Quân của bạn phải định tuyến quanh các ô được bảo vệ để tồn tại.

Sử dụng các mục tiêu để thực hành di chuyển an toàn quanh các vùng được bảo vệ.`
        },
        'section-2-kamikaze': {
          title: 'Bắt Tự Sát',
          description: 'Thực hiện bắt quân tự sát qua một vùng phòng thủ đơn.',
          introduction: `# Bắt Tự Sát

Nếu Không Quân vào đúng một vùng phòng không địch, nó có thể hoàn thành đòn tấn công nhưng sau đó bị phá hủy.

Các bài học này minh họa bắt quân tự sát thành công và kết quả của nó.`
        }
      },
      lessons: {
        'air-defense-1': {
          title: 'Tránh Vùng Phòng Không',
          description: 'Điều hướng Không Quân quanh vùng phủ tên lửa để tiếp cận nhiều mục tiêu.',
          content: `## Phòng Không Là Gì?

**Tên Lửa** tạo ra vùng bảo vệ đe dọa máy bay địch. Bất kỳ **Không Quân** nào bay qua vùng này sẽ bị phá hủy!

### Vùng Phòng Thủ

- Tên lửa phòng thủ **tất cả các ô liền kề** (bao gồm chéo)
- Vùng được hiển thị bởi **khu vực được đánh dấu tím** trên bàn cờ
- Không Quân của bạn không thể đi an toàn qua các ô này

### Chiến Lược

Để hoàn thành bài học này, bạn phải:
1. Điều hướng **quanh** vùng nguy hiểm
2. Tiếp cận cả hai ô mục tiêu

> **Mẹo:** Luôn kiểm tra tên lửa trước khi lập kế hoạch đường bay của Không Quân!`,
          instruction:
            'Di chuyển Không Quân đến d5 và d7. Tránh vùng phòng không tên lửa trung tâm ở f6.',
          hint: 'Sử dụng cột d để tránh vùng tên lửa quanh f6.',
          successMessage: 'Hay! Bạn đã tiếp cận cả hai mục tiêu trong khi giữ ra khỏi phòng không.'
        },
        'air-defense-2': {
          title: 'Bắt Tự Sát',
          description: 'Không Quân có thể hy sinh bản thân khi đi qua một vùng phòng thủ đơn.',
          content: `## Đòn Tấn Tự Sát

Đôi khi, cách duy nhất để vô hiệu hóa phòng không là qua **sự hy sinh**.

### Cách Tự Sát Hoạt Động

Khi Không Quân của bạn bay qua **đúng một** vùng phòng không tên lửa để bắt nó:
- Không Quân **bắt tên lửa**
- Nhưng sau đó Không Quân **cũng bị phá hủy**
- Cả hai quân đều bị loại khỏi bàn cờ

### Khi Nào Sử Dụng Chiến Thuật Này

Tự sát có giá trị khi:
- Tên lửa chặn đường tấn công quan trọng
- Bạn có nhiều máy bay hơn địch có tên lửa
- Loại bỏ phòng thủ mở ra các quân khác của bạn

> **Cảnh báo:** Nếu địch có *nhiều* tên lửa phủ cùng một ô, tự sát không hoạt động — Không Quân của bạn sẽ bị bắn hạ trước khi đến mục tiêu!`,
          instruction: 'Bắt Phòng Không ở e5. Không Quân sẽ bị phá hủy sau đòn tấn công.',
          hint: 'Bay thẳng lên từ e1 đến e5 để kích hoạt bắt tự sát.',
          successMessage: 'Xác nhận: cả hai đơn vị đều bị loại sau đòn tự sát.'
        }
      }
    },
    'subject-6-combine-piece': {
      subject: {
        title: 'Kết Hợp Quân',
        description: 'Tạo chồng bằng bản kết hợp chính thức.',
        introduction: `# Kết Hợp Quân trong Cờ Tư Lệnh

Cờ Tư Lệnh cho phép đơn vị đồng minh xếp chồng trên cùng một ô để tạo thành **các quân kết hợp**. Một chồng di chuyển như một đơn vị, với một **vật chở** vận chuyển những người khác.

## Quy Tắc Cốt Lõi

- Chỉ có **quân cùng màu** có thể kết hợp
- **Vật chở** xác định hạn chế di chuyển và địa hình
- Vật chở được chọn bởi **thứ bậc vai trò** (Hải Quân > Bộ Tư Lệnh > Công Binh > Không Quân > Tăng > Tên Lửa > Phòng Không > Pháo > Dân Quân > Bộ Bin > Tư Lệnh)

## Các Kết Hợp Được Cho Phép (Bản Vẽ)

- **Hải Quân** có thể chở **Không Quân**, thêm khe thứ hai của **Tăng hoặc vai trò kiểu người**
- **Không Quân** có thể chở **Tăng**, thêm khe thứ hai của **vai trò kiểu người**
- **Tăng** có thể chở **vai trò kiểu người**
- **Công Binh** có thể chở **thiết bị nặng** (Pháo, Phòng Không, Tên Lửa)
- **Bộ Tư Lệnh** có thể chở **Tư Lệnh**

## Bạn Sẽ Học Gì

- Tạo chồng cơ bản bằng cách di chuyển lên quân đồng minh
- Hành vi của vật chở cho các vai trò đặc biệt như Công Binh và Bộ Tư Lệnh
- Các kết hợp thực tế khớp với bản vẽ chính thức

Kết hợp khôn ngoan để di chuyển nhanh hơn, bảo vệ các quân quan trọng, và tấn công bất ngờ.`
      },
      sections: {
        'section-1-combine-basics': {
          title: 'Cơ Bản Kết Hợp',
          description: 'Tìm hiểu cách tạo chồng với các vật chở tiêu chuẩn.',
          introduction: `# Cơ Bản Kết Hợp

Tạo chồng bằng cách di chuyển quân lên quân đồng minh. Đơn vị vai trò cao hơn trở thành vật chở.

Các bài học này dạy các kết hợp đơn giản, hợp pháp.`
        },
        'section-2-carrier-rules': {
          title: 'Quy Tắc Vật Chở',
          description: 'Thực hành các kết hợp phụ thuộc vào quy tắc vật chở đặc biệt.',
          introduction: `# Quy Tắc Vật Chở

Một số vật chở có quy tắc kết hợp đặc biệt. Thực hành các chồng chỉ hợp pháp với các vật chở cụ thể như Hải Quân hoặc Không Quân.`
        }
      },
      lessons: {
        'combine-1': {
          title: 'Tăng Chở Bộ Bin',
          description: 'Kết hợp Tăng với Bộ Bin để tạo chồng.',
          content: `## Tăng + Bộ Bin

- **Tăng** là vật chở hợp lệ cho **Bộ Bin**
- Di chuyển hành khách lên vật chở để kết hợp
- Tăng trở thành quân đáy trong chồng`,
          instruction: 'Di chuyển Bộ Bin lên Tăng để kết hợp ở e4.',
          hint: 'Chọn Bộ Bin ở e5 và di chuyển đến e4.',
          successMessage: 'Tốt! Tăng trở thành vật chở và Bộ Bin được mang.'
        },
        'combine-2': {
          title: 'Công Binh Chở Tên Lửa',
          description: 'Công Binh có thể mang thiết bị nặng như Tên Lửa.',
          content: `## Công Binh + Tên Lửa

- **Công Binh** có thể mang **thiết bị nặng** như Tên Lửa
- Công Binh có sức chứa mang chuyên biệt cho các đơn vị hỗ trợ
- Hữu ích để vận chuyển các quân phòng thủ`,
          instruction: 'Di chuyển Tên Lửa lên Công Binh để kết hợp ở e4.',
          hint: 'Từ e6, Tên Lửa có thể di chuyển xuống e4 trong hai ô.',
          successMessage: 'Chính xác! Công Binh trở thành vật chở cho Tên Lửa.'
        },
        'combine-3': {
          title: 'Bộ Tư Lệnh Chở Tư Lệnh',
          description: 'Bộ Tư Lệnh có thể chở Tư Lệnh để bảo vệ.',
          content: `## Bộ Tư Lệnh + Tư Lệnh

- **Bộ Tư Lệnh** là vật chở chuyên dụng cho **Tư Lệnh**
- Cung cấp sự bảo vệ thêm cho quân quan trọng nhất của bạn
- Thiết yếu cho các thiết lập phòng thủ`,
          instruction: 'Di chuyển Tư Lệnh lên Bộ Tư Lệnh ở e4.',
          hint: 'Tư Lệnh ở e5 có thể di chuyển xuống một ô đến e4.',
          successMessage: 'Tốt! Bộ Tư Lệnh trở thành vật chở cho Tư Lệnh.'
        },
        'combine-4': {
          title: 'Hải Quân Chở Không Quân',
          description: 'Hải Quân có thể chở Không Quân trong khi ở lại vùng nước.',
          content: `## Hải Quân + Không Quân

- **Hải Quân** có thể chở **Không Quân** ở vùng nước
- Hữu ích cho các hoạt động thủy bộ
- Hải Quân vẫn là vật chở ngay cả khi chở Không Quân`,
          instruction: 'Di chuyển Không Quân lên Hải Quân ở c4 để kết hợp.',
          hint: 'Không Quân di chuyển từ c5 đến c4 trong một bước.',
          successMessage: 'Đẹp! Hải Quân bây giờ là vật chở cho Không Quân.'
        },
        'combine-5': {
          title: 'Không Quân Chở Tăng',
          description: 'Không Quân có thể chở Tăng là khe đầu tiên.',
          content: `## Không Quân + Tăng

- **Không Quân** có thể chở **Tăng** là hàng hóa chính
- Tuyệt vời cho triển khai nhanh các đơn vị bọc thép
- Không Quân giữ Tăng ở khe hàng hóa đầu tiên`,
          instruction: 'Di chuyển Tăng lên Không Quân ở f4 để kết hợp.',
          hint: 'Tăng ở f6 có thể di chuyển hai ô xuống f4.',
          successMessage: 'Hay! Không Quân trở thành vật chở và có thể vận chuyển Tăng.'
        }
      }
    },
    'subject-7-deploy-move': {
      subject: {
        title: 'Triển Khai',
        description: 'Chia chồng thành nhiều nước di chuyển bằng hệ thống triển khai.',
        introduction: `# Triển Khai Chồng

Triển khai cho phép một quân kết hợp chia thành nhiều nước di chuyển. Mỗi quân trong một chồng có thể **triển khai** đến một ô mới trong cùng một lượt.

## Quy Tắc Cốt Lõi

- Chỉ có quân từ **cùng chồng** có thể triển khai trong một phiên
- Mỗi quân được triển khai di chuyển sử dụng **quy tắc di chuyển của riêng nó**
- Triển khai kết thúc khi tất cả quân di chuyển, hoặc khi **vật chở** triển khai cuối cùng

## Bạn Sẽ Học Gì

- Triển khai mọi quân từ một chồng sử dụng các bước sang phải
- Triển khai chỉ một quân và dừng phiên sớm
- Triển khai vật chở để hoàn thành chuỗi

Triển khai biến một chồng thành một thao tác đa quân được phối hợp.`
      },
      sections: {
        'section-1-deploy-basics': {
          title: 'Cơ Bản Triển Khai',
          description: 'Triển khai hành khách từ một quân kết hợp theo trình tự.',
          introduction: `# Cơ Bản Triển Khai

Bắt đầu từ một quân kết hợp và triển khai hành khách từng người.
Các bài học này tập trung vào việc triển khai hàng hóa sang phải trong các bước rõ ràng.`
        },
        'section-2-deploy-carrier': {
          title: 'Triển Khai Vật Chở',
          description: 'Hoàn thành triển khai bằng cách di chuyển vật chở.',
          introduction: `# Triển Khai Vật Chở

Vật chở cũng có thể triển khai. Di chuyển nó kết thúc chuỗi triển khai.
Thực hành hoàn thành triển khai bằng cách di chuyển vật chở Không Quân.`
        }
      },
      lessons: {
        'deploy-1': {
          title: 'Triển Khai Toàn Bộ Chồng',
          description: 'Chia một quân kết hợp bằng cách triển khai mỗi đơn vị sang phải.',
          content: `## Triển Khai Đầy Đủ

- Triển khai **tất cả quân** từ một chồng
- Mỗi quân di chuyển **một tại một thời điểm** đến mục tiêu của nó
- Hoàn thành khi tất cả quân đã di chuyển`,
          instruction:
            'Triển khai Bộ Bin đến f4, Tăng đến g4, và Không Quân đến h4. Di chuyển mỗi quân sang phải từ chồng ở e4.',
          hint: 'Chọn một quân từ chồng ở e4, sau đó di chuyển nó từng bước một lần đến các mục tiêu bên phải.',
          successMessage: 'Đẹp! Bạn đã triển khai mọi quân từ chồng.'
        },
        'deploy-2': {
          title: 'Triển Khai Một Quân',
          description: 'Triển khai chỉ một hành khách từ chồng.',
          content: `## Triển Khai Một Phần

- Bạn có thể triển khai **chỉ một quân** từ một chồng
- Các quân còn lại giữ kết hợp
- Hữu ích cho định vị chính xác`,
          instruction: 'Chỉ triển khai Bộ Bin đến f4, sau đó dừng triển khai.',
          hint: 'Chọn Bộ Bin từ chồng ở e4 và di chuyển nó một ô sang phải.',
          successMessage: 'Tốt! Bạn đã triển khai một quân đơn từ chồng.'
        },
        'deploy-3': {
          title: 'Triển Khai Vật Chở',
          description: 'Di chuyển vật chở để hoàn thành chuỗi triển khai.',
          content: `## Triển Khai Vật Chở

- **Vật chở** cũng có thể triển khai
- Khi vật chở di chuyển, triển khai **kết thúc**
- Sử dụng điều này để hoàn thành các thao tác đa quân`,
          instruction: 'Triển khai vật chở Không Quân đến h4 và hoàn thành triển khai.',
          hint: 'Chọn Không Quân từ chồng ở e4 và di chuyển nó ba ô sang phải.',
          successMessage: 'Xong! Triển khai vật chở hoàn thành chuỗi.'
        }
      }
    },
    'subject-8-heroic-rule': {
      subject: {
        title: 'Quy Tắc Anh Hùng',
        description: 'Thăng cấp quân bằng cách chiếu và sử dụng di chuyển anh hùng.',
        introduction: `# Thăng Cấp Anh Hùng Từ Chiếu

Khi bất kỳ quân nào **đưa Tư Lệnh địch vào chiếu**, nó trở thành **Anh Hùng**.
Quân anh hùng nhận khả năng di chuyển và bắt quân nâng cao.

## Quy Tắc Cốt Lõi

- **Đưa chiếu → trở thành anh hùng ngay lập tức**
- Quân anh hùng được đánh dấu bằng **+** trong ký hiệu

## Bạn Sẽ Học Gì

- Giao chiếu trong một nước để kích hoạt thăng cấp anh hùng
- Sử dụng di chuyển nâng cao của quân vừa trở thành anh hùng`
      },
      sections: {
        'section-1-heroic-promotion': {
          title: 'Thăng Cấp Anh Hùng',
          description: 'Đưa chiếu để thăng cấp quân lên trạng thái anh hùng.',
          introduction: `# Kích Hoạt Trạng Thái Anh Hùng

Di chuyển quân để đưa chiếu và xem nó trở thành anh hùng.`
        },
        'section-2-heroic-movement': {
          title: 'Di Chuyển Anh Hùng',
          description: 'Sử dụng di chuyển nâng cao sau thăng cấp.',
          introduction: `# Di Chuyển Như Quân Anh Hùng

Một khi được thăng cấp, cùng đơn vị có di chuyển mở rộng. Sử dụng nâng cấp đó để tiếp cận mục tiêu xa hơn.`
        }
      },
      lessons: {
        'heroic-rule-1': {
          title: 'Thăng Cấp Bằng Cách Đưa Chiếu',
          description: 'Bất kỳ quân nào đưa chiếu đều trở thành anh hùng ngay lập tức.',
          content: `# Thăng Cấp Anh Hùng

- Khi quân **đưa chiếu** Tư Lệnh địch, nó trở thành **Anh Hùng**
- Thăng cấp xảy ra **ngay lập tức** khi đưa chiếu
- Quân anh hùng nhận **khả năng di chuyển nâng cao**
- Được đánh dấu bằng ký hiệu **+**`,
          instruction: 'Di chuyển Bộ Bin từ e4 đến e5 để đưa chiếu Tư Lệnh ở e6.',
          hint: 'Từ e5, Bộ Bin tấn công Tư Lệnh ở e6 và trở thành anh hùng (+I).',
          successMessage: 'Hay! Đưa chiếu đã thăng cấp Bộ Bin của bạn thành anh hùng.'
        },
        'heroic-rule-2': {
          title: 'Di Chuyển Như Anh Hùng',
          description: 'Bộ Bin anh hùng di chuyển 2 ô thay vì 1.',
          content: `# Di Chuyển Anh Hùng

- **Quân anh hùng** có **di chuyển nâng cao**
- **Bộ Bin** anh hùng di chuyển **2 ô** thay vì 1
- Tầm nâng cao này áp dụng cho cả di chuyển và bắt`,
          instruction: 'Di chuyển Bộ Bin anh hùng từ e5 đến e7 trong một nước.',
          hint: 'Bộ Bin anh hùng có thể di chuyển 2 ô phương thẳng.',
          successMessage: 'Đẹp! Bộ Bin anh hùng đã sử dụng tầm nâng cao của nó.'
        }
      }
    },
    'subject-9-flying-general': {
      subject: {
        title: 'Tướng Bay',
        description: 'Ngăn tiếp xúc tư lệnh và nhận ra các nước bắt bất hợp pháp.',
        introduction: `# Quy Tắc Tướng Bay

Tư lệnh không được đối mặt nhau trên cột hoặc hàng rõ ràng. Nếu vậy, một trong hai tư lệnh có thể bắt cái kia bất chấp khoảng cách.

## Quy Tắc Cốt Lõi

- Tư lệnh trên **cùng cột hoặc hàng** với **không có quân xen giữa** đang gặp nguy hiểm ngay lập tức
- Bất kỳ nước đi nào **tạo ra tiếp xúc** là bất hợp pháp

## Bạn Sẽ Học Gì

- Tại sao Tư lệnh đôi khi không thể bắt mục tiêu gần
- Làm thế nào quân khác có thể thực hiện nước bắt an toàn thay thế`
      },
      sections: {
        'section-1-flying-general': {
          title: 'Tiếp Xúc Tư Lệnh',
          description: 'Tìm hiểu cách quy tắc tướng bay hạn chế bắt quân tư lệnh.',
          introduction: `# Tiếp Xúc Tư Lệnh

Giữ một quân chặn giữa các tư lệnh. Nếu bắt quân sẽ làm rõ dòng, nước đi là bất hợp pháp.`
        }
      },
      lessons: {
        'flying-general-1': {
          title: 'Tiếp Xúc Tư Lệnh',
          description: 'Tư lệnh không thể bắt nếu nó sẽ tiếp xúc với đường tướng bay.',
          content: `# Quy Tắc Tướng Bay

- Tư lệnh **không thể đối mặt nhau** trên cột hoặc hàng mở
- Nếu bắt quân Tư lệnh sẽ **tiếp xúc Tư Lệnh của bạn** với địch, nước đi là **bất hợp pháp**
- Sử dụng quân khác để thực hiện nước bắt an toàn thay thế
- Quy tắc này ngăn các tình huống "tướng bay"`,
          instruction:
            'Tư Lệnh không thể bắt Bộ Bin ở e5 mà không tiếp xúc bản thân. Bắt Bộ Bin ở c5 với Dân Quân.',
          hint: 'Di chuyển Dân Quân từ c4 đến c5. Tư Lệnh ở e4 bị chặn bởi Bộ Bin địch ở e5.',
          successMessage: 'Chính xác! Dân quân bắt an toàn trong khi tư lệnh giữ được bảo vệ.'
        }
      }
    }
  }
};
