# Rà soát bản dịch giao diện 日本語

Sinh tự động bằng `npm run i18n:review` từ `src/i18n/vi.ts` và `src/i18n/ja.ts` (1027 khóa).
Sửa bản dịch trong `src/i18n/ja.ts` rồi chạy lại lệnh này. `{ten}` là tham số; `{n, plural, …}` / `{unit, select, …}` là số nhiều / chọn nhánh; `<b>…</b>` là phần được định dạng riêng.
Dữ liệu học (nghĩa từ, âm Hán Việt, giải thích ngữ pháp, cách dùng trợ số từ, câu dịch ví dụ) không nằm ở đây: luôn là tiếng Việt.

## aboutSources

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `aboutSources.boThuCuaChu` | Bộ thủ của chữ: Unicode Unihan (© Unicode, Inc.) | 漢字の部首：Unicode Unihan（© Unicode, Inc.） |
| `aboutSources.cachDemTroSo` | Cách đếm (trợ số từ): Kotonoha tự soạn | 助数詞：Kotonoha 独自作成 |
| `aboutSources.cauViDu` | Câu ví dụ: | 例文： |
| `aboutSources.fontTrongPhieuLuyen` | Font trong phiếu luyện viết: Noto Sans JP, Be Vietnam Pro, Klee One (SIL Open Font License 1.1) | 練習シートのフォント：Noto Sans JP、Be Vietnam Pro、Klee One（SIL Open Font License 1.1） |
| `aboutSources.giayPhep` | giấy phép | ライセンス |
| `aboutSources.gioiThieu` | Giới thiệu | このアプリについて |
| `aboutSources.kotonohaWebHocTieng` | Kotonoha – web học tiếng Nhật dùng cá nhân. Nguồn dữ liệu bên ngoài: | Kotonoha – 個人用の日本語学習ウェブアプリ。外部データの出典： |
| `aboutSources.nhanDangChuViet` | Nhận dạng chữ viết tay: KanjiCanvas (Dominik Klein, MIT) | 手書き文字認識：KanjiCanvas（Dominik Klein、MIT） |

## ai

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `ai.noKey` | Chưa có API key | API キーが未設定です |
| `ai.noList` | AI không trả về danh sách câu | AI が例文の一覧を返しませんでした |
| `ai.noValid` | AI không trả về câu hợp lệ | AI が有効な例文を返しませんでした |

## aiDock

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `aiDock.dangTai` | Đang tải… | 読み込み中… |
| `aiDock.moHoiAi` | Mở Hỏi AI | AIに質問を開く |
| `aiDock.moHoiAiCo` | Mở Hỏi AI (có câu trả lời mới) | AIに質問を開く（新しい回答あり） |

## aiMode

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `aiMode.conversation` | Luyện hội thoại | 会話練習 |
| `aiMode.conversationDesc` | AI đóng vai, chỉ lỗi sau mỗi lượt | AI が役を演じ、毎回誤りを指摘 |
| `aiMode.conversationPlaceholder` | Ví dụ: Đóng vai nhân viên cửa hàng tiện lợi | 例：コンビニの店員役をしてください |
| `aiMode.correct` | Sửa câu tiếng Nhật | 日本語の添削 |
| `aiMode.correctDesc` | Sửa câu, giải thích lỗi, cách nói tự nhiên | 添削・誤りの説明・自然な言い方 |
| `aiMode.correctPlaceholder` | Dán câu tiếng Nhật cần sửa | 添削してほしい日本語を貼り付け |
| `aiMode.grammar` | Giải thích ngữ pháp | 文法の説明 |
| `aiMode.grammarDesc` | Ý nghĩa, cách nối, sắc thái, ví dụ | 意味・接続・ニュアンス・例文 |
| `aiMode.grammarPlaceholder` | Ví dụ: ～うちに khác ～間に thế nào? | 例：～うちに と ～間に の違いは？ |
| `aiMode.lookup` | Tra từ | 語の検索 |
| `aiMode.lookupDesc` | Nghĩa, cách đọc, ví dụ, từ dễ nhầm | 意味・読み・例文・紛らわしい語 |
| `aiMode.lookupPlaceholder` | Từ cần tra: 把握, はあく… | 調べたい語：把握、はあく… |
| `aiMode.mixed` | Hỗn hợp | おまかせ |
| `aiMode.mixedDesc` | Hỏi gì cũng được, AI tự nhận biết | 何でも質問、AI が内容を判断 |
| `aiMode.mixedPlaceholder` | Hỏi gì cũng được: từ, ngữ pháp, sửa câu… | 何でも質問：語・文法・添削… |

## aiWordCard

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `aiWordCard.coTrongDuLieu` | Có trong dữ liệu Kotonoha | Kotonoha のデータにあります |
| `aiWordCard.tu` | từ {word} | 語：{word} |

## askAi

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `askAi.dangDungTrinhDo` | Đang dùng {providerName} · trình độ {level}. Đổi trong Cài đặt. | {providerName}・レベル {level} を使用中。設定で変更できます。 |
| `askAi.lichSu` | Lịch sử ({length}) | 履歴（{length}） |
| `askAi.lichSu2` | Lịch sử | 履歴 |
| `askAi.lichSuTroChuyen` | Lịch sử trò chuyện | 会話の履歴 |

## autoBadge

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `autoBadge.kotonohaSoan` | Kotonoha soạn | Kotonoha 作成 |
| `autoBadge.kotonohaSoanChuaKiem` | Kotonoha soạn · chưa kiểm tra | Kotonoha 作成・未確認 |

## backup

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `backup.dayKhongPhaiFile` | Đây không phải file tiến độ của Kotonoha. | Kotonoha の学習記録ファイルではありません。 |
| `backup.fileKhongPhaiJson` | File không phải JSON hợp lệ. | 正しい JSON ファイルではありません。 |
| `backup.fileTienDoKhong` | File tiến độ không có danh sách thẻ. | 学習記録ファイルにカードの一覧がありません。 |
| `backup.khongDocDuocFile` | Không đọc được file tiến độ phiên bản {String}. | バージョン {String} の学習記録ファイルは読み込めません。 |

## backupPanel

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `backupPanel.andKana` |  và {n} chữ kana | とかな {n} 字 |
| `backupPanel.chonFileTienDo` | Chọn file tiến độ | 学習記録ファイルを選ぶ |
| `backupPanel.daNhapTheMoi` | Đã nhập: {added} thẻ mới, {updated} thẻ được cập nhật{v}{v2}{v3}. | 読み込みました：新しいカード {added} 枚、更新 {updated} 枚{v}{v2}{v3}。 |
| `backupPanel.daXuatTheMo` | Đã xuất {total} thẻ{v}. Mở file này ở máy kia bằng “Nhập tiến độ”. | {total} 枚のカード{v}を書き出しました。別の端末で「学習記録の読み込み」から開いてください。 |
| `backupPanel.extraBooks` | , {books} sổ tay mới, {items} mục sổ tay | 、新しいノート {books} 冊、ノートの項目 {items} 件 |
| `backupPanel.extraGrammar` | , {n} mẫu ngữ pháp đã kiểm tra | 、確認済みの文型 {n} 件 |
| `backupPanel.extraKana` | , {n} chữ kana | 、かな {n} 字 |
| `backupPanel.khongCoGiMoi` | Không có gì mới | 新しい内容はありません |
| `backupPanel.nhapTienDo` | Nhập tiến độ | 学習記録の読み込み |
| `backupPanel.nhapVaGop` | Nhập và gộp | 読み込んで統合 |
| `backupPanel.pendingKana` | , {n} chữ kana mới hơn | 、より新しいかな {n} 字 |
| `backupPanel.pendingNotes` | , {n} mục sổ tay / đánh dấu kiểm tra mới | 、新しいノート項目／確認の印 {n} 件 |
| `backupPanel.pendingSkipped` | , {n} mục hỏng bị bỏ qua | 、壊れていて除外した項目 {n} 件 |
| `backupPanel.theTrongFileThe` | {length} thẻ trong file: {added} thẻ mới, {updated} thẻ mới hơn bản trên máy này{v}{v2}{v3}. | ファイル内のカード {length} 枚：新規 {added} 枚、この端末より新しいもの {updated} 枚{v}{v2}{v3}。 |
| `backupPanel.tienDoLuuRieng` | Tiến độ lưu riêng trên từng trình duyệt. Xuất ra file rồi nhập ở máy khác để học tiếp. Khi nhập, mỗi thẻ giữ bản được ôn gần nhất, không mất thẻ đang có. | 学習記録はブラウザごとに保存されます。ファイルに書き出して別の端末で読み込めば続きから学習できます。読み込み時は各カードで最後に復習した方を残し、今あるカードは消えません。 |
| `backupPanel.xacNhanNhapTien` | Xác nhận nhập tiến độ | 学習記録の読み込みを確認 |
| `backupPanel.xuatTienDo` | Xuất tiến độ | 学習記録の書き出し |

## bookmarkButton

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `bookmarkButton.daLuuVaoSo` | Đã lưu {label} vào sổ tay. Đổi sổ | {label} をノートに保存しました。ノートを変更 |
| `bookmarkButton.luuVaoSoTay` | Lưu vào sổ tay (nhấn giữ để lưu nhanh) | ノートに保存（長押しですぐ保存） |
| `bookmarkButton.luuVaoSoTay2` | Lưu {label} vào sổ tay | {label} をノートに保存 |
| `bookmarkButton.mucNay` | mục này | この項目 |

## cellImage

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `cellImage.khongTaoDuocAnh` | Không tạo được ảnh PNG | PNG 画像を作成できませんでした |
| `cellImage.trinhDuyetKhongHo` | Trình duyệt không hỗ trợ canvas | このブラウザは canvas に対応していません |

## charDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `charDetail.chiTietChu` | Chi tiết chữ {ch} | {ch} の詳細 |
| `charDetail.chu` | chữ {ch} | 字 {ch} |
| `charDetail.chuNayChuaCo` | Chữ này chưa có trong danh sách chữ Hán của Kotonoha nên chưa có âm Hán Việt và chưa vào lịch ôn. | この字は Kotonoha の漢字一覧にないため、漢越音がなく復習にも入っていません。 |
| `charDetail.chuNgoaiDanhSach` | Chữ ngoài danh sách | 一覧にない字 |
| `charDetail.khongCoTuNao` | Không có từ nào chứa chữ này | この字を含む語はありません |
| `charDetail.trongCacBoTu` | Trong các bộ từ hiện có không có từ nào chứa chữ {ch}. | 現在の単語帳には {ch} を含む語がありません。 |
| `charDetail.tuChuaChu` | Từ chứa chữ {ch}{v} | {ch} を含む語{v} |
| `charDetail.tuChuaChuNay` | {length} từ chứa chữ này | この字を含む語 {length} 語 |

## charList

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `charList.boChon` | Bỏ chọn | 選択解除 |
| `charList.chonChu` | Chọn chữ {ch} | {ch} を選ぶ |
| `charList.chonTatCa` | Chọn tất cả | すべて選択 |
| `charList.chuSeIn` | Chữ sẽ in | 印刷する字 |
| `charList.chuaCoChuNao` | Chưa có chữ nào. | まだ字がありません。 |
| `charList.keoDeDoiThu` | Kéo để đổi thứ tự chữ {ch} (hoặc dùng phím mũi tên lên / xuống) | ドラッグで {ch} の順番を変更（上下の矢印キーでも可） |
| `charList.khongCoDuLieu` | Không có dữ liệu nét KanjiVG: ô mẫu và ô mờ dùng font Klee One | KanjiVG の筆順データがありません：手本となぞり用の字は Klee One フォントを使います |
| `charList.khongCoNet` | Không có nét | 筆順なし |

## chatParts

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `chatParts.anhKhungVe` | [Ảnh khung vẽ] | ［手書き画像］ |
| `chatParts.bamKiemTraKet` | Bấm "Kiểm tra kết nối", rồi quay lại đây để hỏi. | 「接続を確認」を押してから、ここに戻って質問してください。 |
| `chatParts.cauHoi` | Câu hỏi | 質問 |
| `chatParts.chooseMode` | Chọn kiểu trò chuyện | 会話の種類を選ぶ |
| `chatParts.chooseModeHint` | Hoặc gõ câu hỏi ngay bên dưới. | 下の欄にそのまま質問を入力することもできます。 |
| `chatParts.coTrongDuLieu` | Có trong dữ liệu Kotonoha | Kotonoha のデータにあります |
| `chatParts.dangTraLoi` | Đang trả lời… | 回答中… |
| `chatParts.dung` | Dừng | 停止 |
| `chatParts.geminiCoHanMuc` | . Gemini có hạn mức miễn phí. | 。Gemini には無料枠があります。 |
| `chatParts.gui` | Gửi | 送信 |
| `chatParts.hoac` |  hoặc  | 、または  |
| `chatParts.kotonohaLaTrangTinh` | Kotonoha là trang tĩnh, không có máy chủ: trình duyệt gọi thẳng AI bằng API key của bạn. Key chỉ lưu trên máy này. | Kotonoha はサーバーのない静的サイトです。ブラウザがあなたの API キーで直接 AI を呼び出します。キーはこの端末にだけ保存されます。 |
| `chatParts.layApiKey` | Lấy API key: | API キーの取得： |
| `chatParts.moCaiDatAi` | Mở Cài đặt AI | AI の設定を開く |
| `chatParts.moCaiDatMuc` | Mở Cài đặt → mục AI, chọn nhà cung cấp và dán key. | 設定 → AI を開き、プロバイダーを選んでキーを貼り付けてください。 |
| `chatParts.modeOf` | Chế độ: {mode} | モード：{mode} |
| `chatParts.newChat` | Cuộc trò chuyện mới | 新しい会話 |
| `chatParts.thietLapHoiAi` | Thiết lập Hỏi AI | AIに質問の設定 |
| `chatParts.tuVungTrongCau` | Từ vựng trong câu trả lời | 回答に出てきた語彙 |

## choiceQuiz

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `choiceQuiz.chuaDuMucKhac` | Chưa đủ mục khác nhau để làm quiz. Cần ít nhất 2 đáp án khác nhau. | クイズに必要な数の項目がありません。異なる答えが少なくとも 2 つ必要です。 |
| `choiceQuiz.daDungGoiY` | Đã dùng gợi ý (đúng sẽ tính "Khó") | ヒント使用済み（正解でも「難しい」扱い） |
| `choiceQuiz.dapAn` | Đáp án: {correct} | 答え：{correct} |
| `choiceQuiz.goiY` | Gợi ý | ヒント |
| `choiceQuiz.goiYBo2` | Gợi ý (bỏ 2 đáp án sai) | ヒント（誤答を 2 つ消す） |
| `choiceQuiz.mucTraLoiSai` | Mục trả lời sai đã vào lịch ôn sớm hơn.{v} | 間違えた項目は早めに復習に出てきます。{v} |

## common

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `common.amKhac` | Âm khác: {join} | ほかの音：{join} |
| `common.bai` | Bài {v} | 第{v}課 |
| `common.baiTiepTheoBai` | Bài tiếp theo: Bài {v} | 次の課：第{v}課 |
| `common.boThu` | Bộ thủ | 部首 |
| `common.caNhan` | Cá nhân | マイページ |
| `common.cachDem` | Cách đếm | 助数詞 |
| `common.cachDoc` | Cách đọc | 読み方 |
| `common.caiApp` | Cài app | アプリをインストール |
| `common.cau` | Câu {v}/{length} | {v}/{length} 問 |
| `common.cauHienTai` | Câu hiện tại | 現在の問題 |
| `common.cauTiepTheo` | Câu tiếp theo | 次の問題 |
| `common.cheDoHoc` | Chế độ học | 学習モード |
| `common.chinhXac` | Chính xác | 正解 |
| `common.chonDapAn` | Chọn đáp án | 答えを選ぶ |
| `common.chuHan` | Chữ Hán | 漢字 |
| `common.chuaHoc` | Chưa học | 未学習 |
| `common.daHoc` | Đã học | 学習済み |
| `common.daThuoc` | Đã thuộc | 習得済み |
| `common.dangHoc` | Đang học | 学習中 |
| `common.danhDauDaHoc` | Đánh dấu đã học | 学習済みにする |
| `common.danhSach` | Danh sách | 一覧 |
| `common.done` | Xong | 完了 |
| `common.dong` | Đóng | 閉じる |
| `common.dung` | Đúng | 正解 |
| `common.firstWords` |  ({n}/{total} từ đầu tiên) | （最初の {n}/{total} 語） |
| `common.flashcard` | Flashcard | フラッシュカード |
| `common.giuLai` | Giữ lại | 残す |
| `common.hintedPart` |  {n} câu có dùng gợi ý (chấm "Khó"). |  ヒントを使った問題 {n} 問（「難しい」扱い）。 |
| `common.hiragana` | Hiragana | ひらがな |
| `common.hoc` | Học | 学習 |
| `common.hoiAi` | Hỏi AI | AIに質問 |
| `common.huy` | Hủy | キャンセル |
| `common.kana` | Kana | かな |
| `common.katakana` | Katakana | カタカナ |
| `common.ketQua` | Kết quả | 結果 |
| `common.kiemTra` | Kiểm tra | 答え合わせ |
| `common.lamLuotMoi` | Làm lượt mới | もう一度挑戦 |
| `common.listSep` | ,  | 、 |
| `common.listen` | Nghe | 聞く |
| `common.listenTo` | Nghe {text} | {text} を聞く |
| `common.ngheCauViDu` | Nghe câu ví dụ | 例文を聞く |
| `common.nguPhap` | Ngữ pháp {level} | 文法 {level} |
| `common.nguPhap2` | Ngữ pháp | 文法 |
| `common.onTap` | Ôn tập | 復習 |
| `common.progressOf` | {learned}/{total} {unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}} | {learned}/{total} {unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}} |
| `common.quiz` | Quiz | クイズ |
| `common.soTay` | Sổ tay | ノート |
| `common.tatCa` | Tất cả | すべて |
| `common.thuLai` | Thử lại | 再試行 |
| `common.trangChu` | Trang chủ | ホーム |
| `common.tuChuaChuNay` | {wordCount} từ chứa chữ này | この字を含む語 {wordCount} 語 |
| `common.tuVung` | Từ vựng | 語彙 |
| `common.unitCount` | {n} {unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}} | {n} {unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}} |
| `common.viDu` | Ví dụ | 例文 |
| `common.wrong` | Sai | 不正解 |
| `common.xemKetQua` | Xem kết quả | 結果を見る |
| `common.xoa` | Xóa | 削除 |

## counterDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `counterDetail.batQuyTac` | , bất quy tắc: {reason} | 、不規則：{reason} |
| `counterDetail.cachDemVoi` | Cách đếm với {counter} | {counter} の数え方 |
| `counterDetail.cachDocCanNho` | Cách đọc cần nhớ | 覚えるべき読み方 |
| `counterDetail.chiTietTroSo` | Chi tiết trợ số từ {counter} | 助数詞 {counter} の詳細 |
| `counterDetail.hoac` |  hoặc  | 、または  |
| `counterDetail.luuY` | Lưu ý | 注意 |
| `counterDetail.oDoDocBien` | Ô đỏ: đọc biến âm / bất quy tắc. Chạm một ô để xem lý do. | 赤いマス：音が変わる／不規則な読み。マスをタップすると理由が出ます。 |
| `counterDetail.troSoTu` | trợ số từ {counter} | 助数詞 {counter} |

## counterFaces

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `counterFaces.cungDoc` | Cũng đọc: | 別の読み： |
| `counterFaces.khongCoONay` | Không có ô này trong bảng. | 表にこのマスはありません。 |

## counterQuiz

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `counterQuiz.capSoTroSo` | Cặp số + trợ số từ trả lời sai và ô bất quy tắc đã vào lịch ôn. | 間違えた「数＋助数詞」と不規則なマスは復習に入りました。 |
| `counterQuiz.chonCachDoc` | Chọn cách đọc | 読み方を選ぶ |
| `counterQuiz.chonTroSoTu` | Chọn trợ số từ phù hợp | 合う助数詞を選んでください |
| `counterQuiz.chonTroSoTu2` | Chọn trợ số từ | 助数詞を選ぶ |
| `counterQuiz.chuaCoCauVi` | Chưa có câu ví dụ để làm dạng câu này. Chọn dạng khác. | この形式で出題できる例文がありません。別の形式を選んでください。 |
| `counterQuiz.chuaDung` | Chưa đúng | 不正解 |
| `counterQuiz.dangCauHoi` | Dạng câu hỏi | 出題形式 |
| `counterQuiz.docTheNao` | Đọc thế nào? | どう読みますか？ |
| `counterQuiz.goCachDoc` | Gõ cách đọc | 読み方を入力 |
| `counterQuiz.goCachDocRomaji` | Gõ cách đọc (romaji hoặc kana) | 読み方を入力（ローマ字またはかな） |
| `counterQuiz.kiemTraCauTiep` | Kiểm tra / câu tiếp theo | 答え合わせ／次の問題 |
| `counterQuiz.ngheCau` | Nghe câu | 文を聞く |
| `counterQuiz.quizCachDem` | Quiz cách đếm | 助数詞クイズ |
| `counterQuiz.romajiHoacKana` | romaji hoặc kana | ローマ字またはかな |
| `counterQuiz.tron` | Trộn | ミックス |

## counters

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `counters.amNgat` | {v} → {p} (âm ngắt) | {v} → {p}（促音化） |
| `counters.cachDocDacBiet` | Cách đọc đặc biệt, xem phần lưu ý | 特別な読み方。注意を見てください |
| `counters.cachDocRiengCan` | Cách đọc riêng, cần học thuộc | 特有の読み方。覚える必要があります |
| `counters.capNayChuaCo` | Cấp này chưa có trợ số từ có bảng đầy đủ. Chọn cấp khác. | このレベルには表のある助数詞がまだありません。別のレベルを選んでください。 |
| `counters.chiTietTroSo` | Chi tiết trợ số từ | 助数詞の詳細 |
| `counters.chonMotTroSo` | Chọn một trợ số từ để xem bảng đếm | 助数詞を選ぶと数え方の表が出ます |
| `counters.dangLuyen` | Đang luyện: | 練習中： |
| `counters.docBinhThuongSo` | Đọc bình thường: số + {base} | 通常の読み：数＋{base} |
| `counters.docKhongPhai` | {numberLabel} đọc {p} (không phải {v}) | {numberLabel} は {p} と読む（{v} ではない） |
| `counters.gomCacCapSo` | gồm các cặp số + trợ số từ hay sai và ô bất quy tắc. | 間違えやすい「数＋助数詞」と不規則なマスを含みます。 |
| `counters.hoiSoLuongDung` | Hỏi số lượng dùng {reading} | 数を尋ねるときは {reading} |
| `counters.khongCoTroSo` | Không có trợ số từ nào khớp. | 一致する助数詞はありません。 |
| `counters.locTheoCap` | Lọc theo cấp | レベルで絞り込み |
| `counters.luyenTatCa` | Luyện tất cả | すべて練習 |
| `counters.nangCaoChiGhi` | Nâng cao, chỉ ghi cách đọc cần nhớ. | 上級。覚えるべき読み方だけを載せています。 |
| `counters.oTrongLichOn` | {tracked} ô trong lịch ôn | 復習中のマス {tracked} 個 |
| `counters.quyTacDem` | Quy tắc đếm | 数え方のきまり |
| `counters.soDemKieuNhat` | Số đếm kiểu Nhật: {p} | 和語の数え方：{p} |
| `counters.timLatConDoi` | Tìm: 本, ほん, lát, con, đôi… | 検索：本、ほん、lát、con、đôi… |
| `counters.timTroSoTu` | Tìm trợ số từ | 助数詞を検索 |
| `counters.troSoTuKhac` | Trợ số từ khác  | その他の助数詞  |
| `counters.veDanhSach` | Về danh sách | 一覧に戻る |

## credits

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `credits.readings` | Âm On / Kun: KANJIDIC2 (EDRDG), CC BY-SA 4.0 | 音読み・訓読み：KANJIDIC2（EDRDG）、CC BY-SA 4.0 |
| `credits.strokes` | Dữ liệu thứ tự nét: KanjiVG (Ulrich Apel), CC BY-SA | 筆順データ：KanjiVG（Ulrich Apel）、CC BY-SA |

## dataStore

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `dataStore.khongTimThayTrong` | Không tìm thấy {path} trong manifest | manifest に {path} が見つかりません |
| `dataStore.mayChuTraLoi` | Máy chủ trả lỗi {status} khi tải {url} | {url} の読み込み中にサーバーがエラー {status} を返しました |

## deckHub

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `deckHub.learnedOf` | Đã học <b>{learned}</b>/{total} | 学習済み <b>{learned}</b>/{total} |
| `deckHub.masteredOf` | Đã thuộc <b>{mastered}</b> | 習得 <b>{mastered}</b> |
| `deckHub.theCuaBoNay` | {due} thẻ của bộ này đang đến hạn ôn | このセットのカード {due} 枚が復習時期です |
| `deckHub.thuatNguVuotDe` | {length} thuật ngữ, vuốt để chấm nhớ / chưa nhớ | 用語 {length} 語。スワイプで覚えた／まだを判定 |
| `deckHub.tienDoBoNay` | Tiến độ bộ này | このセットの進み具合 |
| `deckHub.tracNghiemHoacGo` | Trắc nghiệm hoặc gõ cách đọc | 選択式または読み方の入力 |
| `deckHub.ve` | Về {deckTitle} | {deckTitle} に戻る |

## detailStack

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `detailStack.bo` | Bộ {no} | 部首 {no} |
| `detailStack.boSo` | bộ số {no} | 部首番号 {no} |
| `detailStack.khongTimThayTrong` | Không tìm thấy {what} trong dữ liệu. | データに {what} が見つかりません。 |
| `detailStack.quayLai` | Quay lại  | 戻る  |
| `detailStack.quayLai2` | Quay lại | 戻る |
| `detailStack.troSoTuNay` | trợ số từ này | この助数詞 |
| `detailStack.tuNay` | từ này | この語 |

## dockChat

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `dockChat.chuaCoApiKey` | Chưa có API key | API キーが未設定です |
| `dockChat.hoiVe` | Hỏi về | 質問： |
| `dockChat.kotonohaGoiThangAi` | Kotonoha gọi thẳng AI (Gemini có hạn mức miễn phí, hoặc Claude) bằng key của bạn. Key chỉ lưu trên máy này. Mở Cài đặt → mục AI để dán key. | Kotonoha はあなたのキーで直接 AI（無料枠のある Gemini、または Claude）を呼び出します。キーはこの端末にだけ保存されます。設定 → AI でキーを貼り付けてください。 |
| `dockChat.moCaiDat` | Mở Cài đặt | 設定を開く |
| `dockChat.moRongToanMan` | Mở rộng toàn màn hình | 全画面で開く |
| `dockChat.thuGon` | Thu gọn | 閉じる |
| `dockChat.thuGonEsc` | Thu gọn (Esc) | 閉じる（Esc） |

## drawPad

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `drawPad.khungVeChuHan` | Khung vẽ chữ Hán: vẽ từng nét bằng chuột, ngón tay hoặc bút | 漢字の手書き枠：マウス・指・ペンで一画ずつ書きます |

## edition

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `edition.grammarPrivate` | Phần ngữ pháp chỉ có trong bản cá nhân | 文法は個人版にのみあります |

## errorPanel

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `errorPanel.coTheDoMang` | Có thể do mạng chập chờn hoặc ứng dụng vừa được cập nhật. Tải lại thường là đủ. | 通信が不安定か、アプリが更新された可能性があります。たいていは再読み込みで直ります。 |
| `errorPanel.loiKhongRo` | Lỗi không rõ | 不明なエラー |
| `errorPanel.taiLai` | Tải lại | 再読み込み |
| `errorPanel.trangNayGapLoi` | Trang này gặp lỗi | このページでエラーが発生しました |

## exportFile

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `exportFile.inPhieuLuyenViet` | In phiếu luyện viết | 練習シートを印刷 |
| `exportFile.khongTaiDuocDu` | Không tải được dữ liệu nét chữ (đang offline và chữ chưa có trong bộ nhớ đệm?). | 筆順データを読み込めませんでした（オフラインで、字がキャッシュにない可能性があります）。 |

## faces

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `faces.bo` | bộ {radical} | 部首 {radical} |
| `faces.boSo` | Bộ số {no} | 部首番号 {no} |
| `faces.chuHanThuocBo` | Chữ Hán thuộc bộ này | この部首の漢字 |
| `faces.chuNayChuaCo` | Chữ này chưa có trong danh sách chữ Hán của Kotonoha. Mở chi tiết để xem các từ chứa chữ. | この字は Kotonoha の漢字一覧にありません。詳細を開くと、この字を含む語が見られます。 |
| `faces.mauNayChuaTach` | Mẫu này chưa tách được ý nghĩa, mở trang chi tiết để xem. | この文型は意味をまだ取り出せていません。詳細ページで確認してください。 |
| `faces.viDu` | Ví dụ:  | 例： |

## flashcardSession

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `flashcardSession.cardOf` | Thẻ {at}/{total} | {at}/{total} 枚目 |
| `flashcardSession.chamDeLatThe` | {label}. Chạm để lật thẻ | {label}。タップでカードをめくる |
| `flashcardSession.chuaNho` | Chưa nhớ | まだ |
| `flashcardSession.chuaNho2` | Chưa nhớ {unknown} | まだ {unknown} |
| `flashcardSession.daNho` | Đã nhớ | 覚えた |
| `flashcardSession.hoanTac` | Hoàn tác | 元に戻す |
| `flashcardSession.hoanTacTheCuoi` | Hoàn tác thẻ cuối | 最後のカードを元に戻す |
| `flashcardSession.hoanTacTheVua` | Hoàn tác thẻ vừa chấm | 直前の判定を元に戻す |
| `flashcardSession.hocLaiCaBo` | Học lại cả bộ | 全部もう一度 |
| `flashcardSession.hocLaiTheChua` | Học lại thẻ chưa nhớ | 「まだ」をもう一度 |
| `flashcardSession.latThe` | Lật thẻ | カードをめくる |
| `flashcardSession.matSauChamDe` | {label}, mặt sau. Chạm để lật lại | {label}、裏面。タップで表に戻す |
| `flashcardSession.moiTheDaVao` | Mọi thẻ đã vào lịch ôn. Thẻ chưa nhớ sẽ quay lại sớm hơn. | すべてのカードが復習に入りました。「まだ」のカードは早めに出てきます。 |
| `flashcardSession.nho` | Nhớ {known} | 覚えた {known} |
| `flashcardSession.theHienTai` | Thẻ hiện tại | 現在のカード |
| `flashcardSession.tronThe` | Trộn thẻ | シャッフル |
| `flashcardSession.vuotTraiNeuChua` | Vuốt trái nếu chưa nhớ, vuốt phải nếu đã nhớ | まだなら左へ、覚えたなら右へスワイプ |
| `flashcardSession.xongMotLuot` | Xong một lượt | 1 周しました |

## flip

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `flip.chamDeLatThe` | Chạm để lật thẻ | タップでカードをめくる |

## fonts

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `fonts.loiKhiTaiFont` | Lỗi {status} khi tải font | フォントの読み込みでエラー {status} |

## globalDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `globalDetail.chiTiet` | Chi tiết | 詳細 |

## grammar

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `grammar.bai` | Bài {lesson} | 第{lesson}課 |
| `grammar.capNguPhap` | Cấp ngữ pháp | 文法のレベル |
| `grammar.chonCap` | Chọn cấp | レベルを選ぶ |
| `grammar.chuaCoDuLieu` | Chưa có dữ liệu ngữ pháp {level} | {level} の文法データはまだありません |
| `grammar.chuaKiemTra` | Chưa kiểm tra | 未確認 |
| `grammar.daHieu` | Đã hiểu | 理解した |
| `grammar.khongCoMauNao` | Không có mẫu nào khớp. Thử bỏ dấu hoặc gõ ngắn hơn. | 一致する文型がありません。声調記号を外すか、短く入力してみてください。 |
| `grammar.locMauNguPhap` | Lọc mẫu ngữ pháp | 文型を絞り込み |
| `grammar.locTheoNhom` | Lọc theo nhóm | グループで絞り込み |
| `grammar.locTheoTieuDe` | Lọc theo tiêu đề hoặc ý nghĩa | 見出しや意味で絞り込み |
| `grammar.mau` | {length} mẫu | {length} 文型 |
| `grammar.mau2` | mẫu {title} | 文型 {title} |
| `grammar.mauKhop` | {length}/{length2} mẫu khớp | {length}/{length2} 文型が一致 |
| `grammar.mauKotonohaSoanChua` |  · {autoCount} mẫu Kotonoha soạn, {unchecked} chưa kiểm tra | ・Kotonoha 作成 {autoCount} 文型、うち未確認 {unchecked} |
| `grammar.themNoiDungVao` | Thêm nội dung vào file Excel hoặc data-source/grammar-extra rồi chạy lại script chuyển đổi. | Excel ファイルか data-source/grammar-extra に内容を追加して、変換スクリプトを再実行してください。 |

## grammarDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `grammarDetail.anGiaiThichDay` | Ẩn giải thích đầy đủ | 詳しい説明を閉じる |
| `grammarDetail.banDaKiemTra` | Bạn đã kiểm tra mẫu này. | この文型は確認済みです。 |
| `grammarDetail.boDanhDauKiem` | Bỏ đánh dấu kiểm tra | 確認済みを外す |
| `grammarDetail.cachNoi` | Cách nối | 接続 |
| `grammarDetail.chuaTachDuocCau` | Chưa tách được câu dịch, xem phần giải thích đầy đủ. | 訳文を取り出せていません。詳しい説明をご覧ください。 |
| `grammarDetail.daHieu` | Đã hiểu | 理解した |
| `grammarDetail.daHieuBoDanh` | Đã hiểu, bỏ đánh dấu | 理解済み（解除する） |
| `grammarDetail.daKiemTra` | Đã kiểm tra | 確認済み |
| `grammarDetail.danhDauDeDua` | Đánh dấu để đưa mẫu này vào lịch ôn tập. | 印を付けるとこの文型が復習に入ります。 |
| `grammarDetail.lessonPart` | , Bài {n} | 、第{n}課 |
| `grammarDetail.luuY` | Lưu ý | 注意 |
| `grammarDetail.mau` | mẫu {title} | 文型 {title} |
| `grammarDetail.mau2` | {level}{v}, mẫu {no} | {level}{v}、文型 {no} |
| `grammarDetail.mauNayDangTrong` | Mẫu này đang trong lịch ôn tập. | この文型は復習中です。 |
| `grammarDetail.mauNayDoKotonoha` | Mẫu này do Kotonoha tự soạn (giải thích và câu ví dụ), chưa có người kiểm tra. Đọc kỹ rồi bấm "Đã kiểm tra" nếu thấy đúng. | この文型は Kotonoha が作成したもの（説明・例文）で、まだ人が確認していません。よく読んで、正しければ「確認済み」を押してください。 |
| `grammarDetail.mauTiepTheo` | Mẫu tiếp theo | 次の文型 |
| `grammarDetail.mauTruoc` | Mẫu trước | 前の文型 |
| `grammarDetail.mauTruocVaSau` | Mẫu trước và sau | 前後の文型 |
| `grammarDetail.mucNayChuaTach` | Mục này chưa tách được đủ ý nghĩa và ví dụ từ file gốc nên hiển thị nguyên văn. | 元ファイルから意味と例文を十分に取り出せなかったため、原文のまま表示しています。 |
| `grammarDetail.xemThem` | Xem thêm | もっと見る |
| `grammarDetail.xemToanBoGiai` | Xem toàn bộ giải thích | 詳しい説明を見る |

## grammarGroup

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `grammarGroup.cauCoBan` | Câu cơ bản | 基本文 |
| `grammarGroup.chiThiNghiVan` | Chỉ thị – nghi vấn | 指示語・疑問詞 |
| `grammarGroup.dieuKienGiaDinh` | Điều kiện – giả định | 条件・仮定 |
| `grammarGroup.doiChieuTuongPhan` | Đối chiếu – tương phản | 対比・逆接 |
| `grammarGroup.dongTuGhepTroDongTu` | Động từ ghép – trợ động từ | 複合動詞・補助動詞 |
| `grammarGroup.dongTuTheMasu` | Động từ – thể ます | 動詞・ます形 |
| `grammarGroup.lietKeBoSung` | Liệt kê – bổ sung | 列挙・付加 |
| `grammarGroup.mongMuonRuRe` | Mong muốn – rủ rê | 希望・勧誘 |
| `grammarGroup.nguyenNhanKetQua` | Nguyên nhân – kết quả | 原因・結果 |
| `grammarGroup.nhanManhGioiHan` | Nhấn mạnh – giới hạn | 強調・限定 |
| `grammarGroup.onTapN4` | Ôn tập N4 | N4 の復習 |
| `grammarGroup.quanDiemDeTai` | Quan điểm – đề tài | 立場・話題 |
| `grammarGroup.soSanh` | So sánh | 比較 |
| `grammarGroup.soSanhMucDo` | So sánh – mức độ | 比較・程度 |
| `grammarGroup.suyDoanTruyenDat` | Suy đoán – truyền đạt | 推量・伝聞 |
| `grammarGroup.the` | Thể て | て形 |
| `grammarGroup.thoiDiem` | Thời điểm | 時点 |
| `grammarGroup.thoiGianTrinhTu` | Thời gian – trình tự | 時間・順序 |
| `grammarGroup.tinhTu` | Tính từ | 形容詞 |
| `grammarGroup.troTu` | Trợ từ | 助詞 |
| `grammarGroup.vanNoi` | Văn nói | 話し言葉 |
| `grammarGroup.xinPhepCamYeuCau` | Xin phép – cấm – yêu cầu | 許可・禁止・依頼 |
| `grammarGroup.yChiNghiaVuCamXuc` | Ý chí – nghĩa vụ – cảm xúc | 意志・義務・感情 |

## grammarUnavailable

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `grammarUnavailable.hocTuVung` | Học từ vựng | 語彙を学ぶ |
| `grammarUnavailable.noiDungNguPhap` | Nội dung ngữ pháp được soạn từ giáo trình nên không đưa lên bản web công khai. Bạn vẫn học được đầy đủ từ vựng, chữ Hán, bộ thủ và thuật ngữ chuyên ngành. | 文法の内容は教材をもとに作成しているため、公開版には載せていません。語彙・漢字・部首・専門用語はすべて学習できます。 |

## handwritingPanel

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `handwritingPanel.chonUngVienDe` | Chọn ứng viên để thêm vào ô tìm, rồi vẽ chữ tiếp theo. | 候補を選ぶと検索欄に入ります。続けて次の字を書いてください。 |
| `handwritingPanel.chuUngVien` | Chữ ứng viên | 候補の字 |
| `handwritingPanel.chuaCoTrongDanh` | {ch} (chưa có trong danh sách) | {ch}（一覧にありません） |
| `handwritingPanel.dangTaiDuLieu` | Đang tải dữ liệu nhận dạng… | 認識データを読み込み中… |
| `handwritingPanel.hoanTacNet` | Hoàn tác nét | 一画戻す |
| `handwritingPanel.khongNhanRaChu` | Không nhận ra chữ, thử vẽ lại. | 認識できませんでした。もう一度書いてください。 |
| `handwritingPanel.khongTaiDuocDu` | Không tải được dữ liệu nhận dạng. | 認識データを読み込めませんでした。 |
| `handwritingPanel.khongThayChuDung` | Không thấy chữ đúng? Bấm "Nhờ AI đoán" để gửi ảnh khung vẽ cho AI. | 正しい字がありませんか？「AIに推測してもらう」で手書き画像を AI に送れます。 |
| `handwritingPanel.nay` | này | この字 |
| `handwritingPanel.nhoAiDoan` | Nhờ AI đoán | AIに推測してもらう |
| `handwritingPanel.veChuHan` | Vẽ chữ Hán | 漢字を書く |
| `handwritingPanel.veChuHanDe` | Vẽ chữ Hán để tìm | 漢字を書いて検索 |
| `handwritingPanel.veMotChuVao` | Vẽ một chữ vào khung, ứng viên hiện ở đây. | 枠に一字書くと、候補がここに出ます。 |
| `handwritingPanel.xemCachVietDung` | Xem cách viết đúng {picked} | {picked} の正しい書き方を見る |
| `handwritingPanel.xemChu` | Xem chữ  | 字を見る  |

## history

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `history.cuocTroChuyen` | Cuộc trò chuyện | 会話 |
| `history.cuocTroChuyenMoi` | Cuộc trò chuyện mới | 新しい会話 |

## historyList

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `historyList.boGhim` | Bỏ ghim | ピン留めを外す |
| `historyList.boGhim2` | Bỏ ghim {title} | {title} のピン留めを外す |
| `historyList.chuaCoCuocTro` | Chưa có cuộc trò chuyện nào. | まだ会話はありません。 |
| `historyList.cuocTroChuyenMoi` | + Cuộc trò chuyện mới | + 新しい会話 |
| `historyList.daGhim` | Đã ghim | ピン留め済み |
| `historyList.doiTen` | Đổi tên | 名前を変更 |
| `historyList.doiTen2` | Đổi tên {title} | {title} の名前を変更 |
| `historyList.luu` | Lưu | 保存 |
| `historyList.luuToiDaCuoc` | Lưu tối đa {MAX_CONVERSATIONS} cuộc trên máy này; cuộc thứ {v} sẽ xóa cuộc cũ nhất chưa ghim. | この端末には最大 {MAX_CONVERSATIONS} 件まで保存します。{v} 件目からは、ピン留めしていない一番古い会話が消えます。 |
| `historyList.meta` | {count} tin | {count} 件 |
| `historyList.pin` | Ghim | ピン留め |
| `historyList.pin2` | Ghim {title} | {title} をピン留め |
| `historyList.tenCuocTroChuyen` | Tên cuộc trò chuyện | 会話の名前 |
| `historyList.xoa` | Xóa {title} | {title} を削除 |
| `historyList.xoaCaCuoc` | Xóa cả {length} cuộc? | {length} 件すべて削除しますか？ |
| `historyList.xoaTatCa` | Xóa tất cả | すべて削除 |

## home

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `home.batDau` | Bắt đầu | 始める |
| `home.batDauHoc` | Bắt đầu học | 学習を始める |
| `home.chu` | {learned}/{kanjiTotal} chữ | {learned}/{kanjiTotal} 字 |
| `home.chuHanNgauNhien` | Chữ Hán ngẫu nhiên | ランダム漢字 |
| `home.chuKhac` | Chữ khác | 別の字 |
| `home.daThuoc` | {mastered}/{total} đã thuộc | {mastered}/{total} 習得 |
| `home.dangTaiBaiHoc` | Đang tải bài học tiếp | 続きの課を読み込み中 |
| `home.dangTaiChuHan` | Đang tải chữ Hán ngẫu nhiên | ランダム漢字を読み込み中 |
| `home.dangTaiTuDi` | Đang tải từ đi kèm | 関連語を読み込み中 |
| `home.dueCount` | <n>{n}</n> thẻ đến hạn | <n>{n}</n> 枚が復習時期 |
| `home.hocBaiMoiThe` | Học bài mới, thẻ sẽ tự vào lịch ôn. | 新しい課を学ぶと、カードが自動で復習に入ります。 |
| `home.hocTiep` | Học tiếp | 続きを学ぶ |
| `home.kotonohaTrangChu` | Kotonoha – Trang chủ | Kotonoha – ホーム |
| `home.ngayMaiThe` | Ngày mai: {tomorrow} thẻ | 明日：{tomorrow} 枚 |
| `home.onTapHomNay` | Ôn tập hôm nay | 今日の復習 |
| `home.onXongDeGiu` | Ôn xong để giữ nhịp nhớ. | 復習を終えて記憶のリズムを保ちましょう。 |
| `home.tienDoBai` | Tiến độ bài {v} | 第{v}課の進み具合 |
| `home.tiepTuc` | Tiếp tục | 続ける |
| `home.tu` | {learned}/{total} từ | {learned}/{total} 語 |
| `home.tu2` |  · từ {firstLevel} | ・{firstLevel} の語 |
| `home.tuCoChu` | Từ có chữ {kanji} | {kanji} を含む語 |
| `home.xemChiTietChu` | Xem chi tiết chữ {kanji}, {hanViet} | {kanji}（{hanViet}）の詳細を見る |
| `home.xemLichOn` | Xem lịch ôn | 復習予定を見る |

## index

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `index.caoCap` | Cao cấp | 上級 |
| `index.congNgheThongTin` | Công nghệ thông tin | IT |
| `index.dienTu` | Điện tử | 電子 |
| `index.hopGiayToGiao` | Họp, giấy tờ, giao tiếp công sở | 会議・書類・社内のやり取り |
| `index.machLinhKienSan` | Mạch, linh kiện, sản xuất | 回路・部品・製造 |
| `index.nhapMon` | Nhập môn | 入門 |
| `index.phatTrienPhanMem` | Phát triển phần mềm, dự án | ソフトウェア開発・プロジェクト |
| `index.phoTu` | Phó từ | 副詞 |
| `index.soCap` | Sơ cấp | 初級 |
| `index.trangTuHayGap` | Trạng từ hay gặp | よく使う副詞 |
| `index.trungCaoCap` | Trung cao cấp | 中上級 |
| `index.trungCap` | Trung cấp | 中級 |
| `index.tuAiGoiY` | Từ AI gợi ý | AI が提案した語 |
| `index.tuGhep` | Từ ghép | 熟語 |
| `index.tuHanGhepHai` | Từ Hán ghép hai chữ | 漢字二字の熟語 |
| `index.tuLay` | Từ láy | 擬音語・擬態語 |
| `index.tuTuongThanhTuong` | Từ tượng thanh, tượng hình | 擬音語・擬態語 |
| `index.vanPhong` | Văn phòng | オフィス |

## installApp

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `installApp.bamNutChiaSe` | Bấm nút Chia sẻ  | 共有ボタン  |
| `installApp.bamThemBieuTuong` | Bấm “Thêm”. Biểu tượng 言 Kotonoha sẽ xuất hiện trên màn hình chính. | 「追加」を押すと、ホーム画面に 言 Kotonoha のアイコンが表示されます。 |
| `installApp.banDangDungKotonoha` | Bạn đang dùng Kotonoha dạng app đã cài. | Kotonoha をインストール済みのアプリとして使っています。 |
| `installApp.cachCaiApp` | Cách cài app | インストール方法 |
| `installApp.caiLenManHinh` | Cài lên màn hình chính để mở nhanh như app, không có thanh địa chỉ, học được cả khi mất mạng với các bài đã mở. | ホーム画面に追加すると、アプリのようにすぐ開けて、アドレスバーもなく、開いたことのある課はオフラインでも学習できます。 |
| `installApp.chiaSe` | Chia sẻ | 共有 |
| `installApp.chonThemVaoMh` | Chọn “Thêm vào MH chính” (Add to Home Screen). | 「ホーム画面に追加」を選びます。 |
| `installApp.oThanhDuoiCua` |  ở thanh dưới của Safari. |  を Safari の下のバーで押します。 |
| `installApp.trenIphoneIpadCai` | Trên iPhone/iPad, cài bằng Safari: | iPhone / iPad では Safari でインストールします： |
| `installApp.trinhDuyetNayChua` | Trình duyệt này chưa hỗ trợ cài app. Dùng Chrome hoặc Edge (máy tính, Android), hoặc Safari trên iPhone. Nếu vừa mở trang, hãy đợi vài giây rồi tải lại. | このブラウザはアプリのインストールに対応していません。Chrome か Edge（パソコン、Android）、または iPhone の Safari をお使いください。ページを開いた直後なら、数秒待ってから再読み込みしてください。 |

## kana

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kana.bangChu` | Bảng chữ | 五十音表 |
| `kana.boChon` | Bỏ chọn | 選択解除 |
| `kana.chiTietChu` | Chi tiết chữ {v} | {v} の詳細 |
| `kana.chiTietChuKana` | Chi tiết chữ kana | かなの詳細 |
| `kana.chonHangMuonLuyen` | Chọn hàng muốn luyện bằng ô đầu hàng. Chạm vào chữ để nghe và xem chi tiết. | 行の先頭のチェックで練習する行を選びます。字をタップすると発音と詳細が出ます。 |
| `kana.chonItNhatMot` | Chọn ít nhất một hàng để luyện | 練習する行を 1 つ以上選んでください |
| `kana.chonTatCa` | Chọn tất cả | すべて選択 |
| `kana.chuYeu` | Chữ yếu ({v}) | 苦手な字（{v}） |
| `kana.chuaCoChuNao` | Chưa có chữ nào trả lời sai | まだ間違えた字はありません |
| `kana.chuaLuyenChuNao` | Chưa luyện chữ nào | まだ練習した字はありません |
| `kana.daChonChu` | Đã chọn {count} chữ | {count} 字を選択中 |
| `kana.groupBasic` | Bảng 50 âm | 五十音 |
| `kana.groupDakuten` | Âm đục, bán đục | 濁音・半濁音 |
| `kana.groupYoon` | Âm ghép | 拗音 |
| `kana.luyenChu` | Luyện {count} chữ {v} | {count} 字を練習 {v} |
| `kana.luyenChuDaChon` | Luyện {count} chữ đã chọn | 選んだ {count} 字を練習 |
| `kana.luyenChuYeu` | Luyện chữ yếu{v} | 苦手な字を練習{v} |
| `kana.luyenKana` | Luyện kana | かなの練習 |
| `kana.masteredOf` | Đã thuộc <b>{mastered}/{total}</b> chữ {script} | {script} 習得 <b>{mastered}/{total}</b> |
| `kana.onNgauNhien` | Ôn ngẫu nhiên ({v}) | ランダム復習（{v}） |
| `kana.onNgauNhien20` | Ôn ngẫu nhiên 20 chữ đã học | 学習済みの字からランダムに 20 字 |

## kanaChart

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanaChart.chonHang` | Chọn hàng {label} | {label} を選ぶ |
| `kanaChart.chonHang2` | Chọn hàng | 行を選ぶ |
| `kanaChart.chuThichMau` | Chú thích màu | 色の説明 |
| `kanaChart.daThuoc` | Đã thuộc {mastered}/{length} | 習得 {mastered}/{length} |
| `kanaChart.oTrong` | Ô trống | 空欄 |

## kanaDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanaDetail.chu` | Chữ {kana} | 字 {kana} |
| `kanaDetail.deNhamVoi` | Dễ nhầm với | 間違えやすい字 |
| `kanaDetail.dungNgayLanDau` | Đúng ngay lần đầu {MASTERED_STREAK} lần liên tiếp để thuộc chữ này. | 初回で {MASTERED_STREAK} 回続けて正解すると習得です。 |
| `kanaDetail.dungNgayLanDau2` | Đúng ngay lần đầu {right} lần, sai {wrong} lần, chuỗi đúng {streak}/{MASTERED_STREAK}. | 初回正解 {right} 回、不正解 {wrong} 回、連続正解 {streak}/{MASTERED_STREAK}。 |
| `kanaDetail.tuongUng` | {v} tương ứng | 対応する{v} |

## kanaSession

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanaSession.20Cau` | 20 câu | 20 問 |
| `kanaSession.50Cau` | 50 câu | 50 問 |
| `kanaSession.batDau` | Bắt đầu | 開始 |
| `kanaSession.cacChuDaSai` | Các chữ đã sai | 間違えた字 |
| `kanaSession.cauDungNgayLan` | câu đúng ngay lần đầu | 問を初回で正解 |
| `kanaSession.chonChuDung` | Chọn chữ đúng | 正しい字を選ぶ |
| `kanaSession.chu` | chữ {kana} | 字 {kana} |
| `kanaSession.chuNayDocLa` | Chữ này đọc là gì? | この字の読みは？ |
| `kanaSession.chuNaySeDuoc` | Chữ này sẽ được hỏi lại sau vài câu. Bấm Enter để tiếp. | この字は数問後にもう一度出ます。Enter で次へ。 |
| `kanaSession.chuoiDungDaiNhat` | Chuỗi đúng dài nhất | 最長連続正解 |
| `kanaSession.dangKiemTraGiong` | Đang kiểm tra giọng đọc tiếng Nhật… | 日本語の音声を確認中… |
| `kanaSession.dapAn` | Đáp án: | 答え： |
| `kanaSession.dung` | Đúng:  | 正解： |
| `kanaSession.goRomaji` | Gõ romaji | ローマ字入力 |
| `kanaSession.goRomajiCuaChu` | Gõ romaji của chữ này | この字のローマ字を入力 |
| `kanaSession.goRomajiViDu` | Gõ romaji, ví dụ: ka | ローマ字を入力（例：ka） |
| `kanaSession.hoanHaoDungHet` | Hoàn hảo, đúng hết ngay lần đầu | パーフェクト！すべて初回で正解 |
| `kanaSession.hoanThanhPhienLuyen` | Hoàn thành phiên luyện | 練習完了 |
| `kanaSession.khongCoKieuNghe` | Không có kiểu Nghe: máy này chưa có giọng đọc tiếng Nhật (ja-JP). Cài thêm giọng tiếng Nhật trong cài đặt ngôn ngữ của hệ thống rồi mở lại trang. | 「聞く」は使えません：この端末に日本語（ja-JP）の音声がありません。システムの言語設定で日本語の音声を追加してから、ページを開き直してください。 |
| `kanaSession.kieuCauHoi` | Kiểu câu hỏi | 出題形式 |
| `kanaSession.latTheTuCham` | Lật thẻ, tự chấm Nhớ / Chưa nhớ | カードをめくって、覚えた／まだを自分で判定 |
| `kanaSession.luyenLaiCacChu` | Luyện lại các chữ sai ({length}) | 間違えた字をもう一度（{length}） |
| `kanaSession.luyenLaiPhienNay` | Luyện lại phiên này | この練習をもう一度 |
| `kanaSession.moiCauMotKieu` | Mỗi câu một kiểu ngẫu nhiên | 問題ごとにランダムな形式 |
| `kanaSession.moiChu1Lan` | Mỗi chữ 1 lần ({length}) | 各字 1 回（{length}） |
| `kanaSession.moiChuMotThe` | Mỗi chữ một thẻ: Space lật, ← Chưa nhớ, → Đã nhớ, Z hoàn tác. | 1 字 1 枚：Space でめくる、← まだ、→ 覚えた、Z で元に戻す。 |
| `kanaSession.ngheLai` | Nghe lại | もう一度聞く |
| `kanaSession.nghePhatAmChon` | Nghe phát âm, chọn chữ | 発音を聞いて字を選ぶ |
| `kanaSession.ngheVaChonChu` | Nghe và chọn chữ đúng | 聞いて正しい字を選ぶ |
| `kanaSession.nguocLai` | Ngược lại | 逆方向 |
| `kanaSession.nhinChuChonCach` | Nhìn chữ, chọn cách đọc | 字を見て読みを選ぶ |
| `kanaSession.nhinChuGoCach` | Nhìn chữ, gõ cách đọc | 字を見て読みを入力 |
| `kanaSession.nhinRomajiChonChu` | Nhìn romaji, chọn chữ | ローマ字を見て字を選ぶ |
| `kanaSession.phimRNgheLai` |  (phím R nghe lại) | （R キーでもう一度聞く） |
| `kanaSession.saiLan` | sai {n} lần | {n} 回間違い |
| `kanaSession.saiLanNghePhat` | {kana}, {romaji}, sai {n} lần, nghe phát âm | {kana}、{romaji}、{n} 回間違い、発音を聞く |
| `kanaSession.soCau` | Số câu | 問題数 |
| `kanaSession.thoatPhienLuyen` | Thoát phiên luyện | 練習を終了 |
| `kanaSession.thoiGian` | Thời gian | 時間 |
| `kanaSession.tiep` | Tiếp | 次へ |
| `kanaSession.traLoiSaiThi` | Trả lời sai thì chữ đó được hỏi lại sau vài câu. Phiên kết thúc khi mọi chữ đều đúng. | 間違えた字は数問後にもう一度出ます。すべての字に正解すると終了です。 |
| `kanaSession.tracNghiem` | Trắc nghiệm | 選択式 |
| `kanaSession.tron` | Trộn | ミックス |
| `kanaSession.veBangChuCai` | Về bảng chữ cái | 五十音表に戻る |

## kanji

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanji.bo2` | bộ {radical} {name} | 部首 {radical} {name} |
| `kanji.bo3` | bộ {name} | 部首 {name} |
| `kanji.bo4` | Bộ {radical}, {name} | 部首 {radical}、{name} |
| `kanji.boChu` | Bộ {no} · {count} chữ | 部首 {no}・{count} 字 |
| `kanji.boNayTenLa` | Bộ này tên là gì? | この部首の名前は？ |
| `kanji.boThu` | Bộ thủ {no}–{no2} | 部首 {no}–{no2} |
| `kanji.boThuKhop` | {length} bộ thủ khớp | {length} 部首が一致 |
| `kanji.cacBai` | Các bài | 課の一覧 |
| `kanji.chiTiet` | Chi tiết | 詳細 |
| `kanji.chiTietChuHan` | Chi tiết chữ Hán | 漢字の詳細 |
| `kanji.chonMotBoDe` | Chọn một bộ để xem chi tiết | 部首を選ぶと詳細が出ます |
| `kanji.chonMotChuDe` | Chọn một chữ để xem chi tiết | 字を選ぶと詳細が出ます |
| `kanji.chonTenBo` | Chọn tên bộ | 部首名を選ぶ |
| `kanji.chu` | chữ {kanji} | 字 {kanji} |
| `kanji.chuHan` | Chữ Hán {toLowerCase} | 漢字 {toLowerCase} |
| `kanji.chuHanChu` | Chữ Hán · {levelLabel} · {length} chữ | 漢字・{levelLabel}・{length} 字 |
| `kanji.daHoc` | , đã học | 、学習済み |
| `kanji.khongCoBaiNay` | Không có bài này.  | この課はありません。 |
| `kanji.locBoThu` | Lọc bộ thủ | 部首を絞り込み |
| `kanji.locTheoCapXuat` | Lọc theo cấp xuất hiện | 初出レベルで絞り込み |
| `kanji.mucChuHan` | Mục chữ Hán | 漢字の項目 |
| `kanji.quizBoThu` | Quiz bộ thủ | 部首クイズ |
| `kanji.timBoTheoTen` | Tìm bộ theo tên, nghĩa hoặc số | 名前・意味・番号で部首を検索 |
| `kanji.tuN5ChuXuat` | "Từ N5" = chữ xuất hiện lần đầu trong từ vựng N5 của bạn, không phải cấp kanji JLPT. | 「N5 から」= あなたの N5 語彙で初めて出てくる字です。JLPT の漢字レベルではありません。 |
| `kanji.veCacBai` | Về các bài | 課の一覧に戻る |
| `kanji.veChu` | Vẽ chữ | 手書き |

## kanjiDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanjiDetail.bo` | Bộ | 部首 |
| `kanjiDetail.chiTietChu` | Chi tiết chữ {kanji} | {kanji} の詳細 |
| `kanjiDetail.chu` | chữ {kanji} | 字 {kanji} |
| `kanjiDetail.daHocChuNay` | Đã học chữ này | この字は学習済み |
| `kanjiDetail.hocCacTuNay` | Học các từ này | 語を学ぶ |
| `kanjiDetail.so` | số {no} | 番号 {no} |
| `kanjiDetail.tuChuaChu` | Từ chứa chữ {kanji}{v} | {kanji} を含む語{v} |

## kanjiLearn

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanjiLearn.tu` | {hanViet}, {length} từ | {hanViet}、{length} 語 |
| `kanjiLearn.tuCoChu` | Từ có chữ {kanji} | {kanji} を含む語 |
| `kanjiLearn.veChu` | Về chữ {kanji} | {kanji} に戻る |

## kanjiLessons

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanjiLessons.chiTrongTuGhep` | Chỉ trong từ ghép | 熟語のみ |
| `kanjiLessons.tu` | Từ {l} | {l} から |
| `kanjiLessons.tuGhep` | Từ ghép | 熟語 |

## kanjiQuiz

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanjiQuiz.amHanVietCua` | Âm Hán Việt của chữ này là gì? | この字の漢越音は？ |
| `kanjiQuiz.amKhac` | (âm khác: {join}) | （ほかの音：{join}） |
| `kanjiQuiz.chonAmHanViet` | Chọn âm Hán Việt | 漢越音を選ぶ |
| `kanjiQuiz.quizChuHan` | Quiz chữ Hán | 漢字クイズ |

## kanjiReadings

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanjiReadings.amKun` | Âm Kun | 訓読み |
| `kanjiReadings.amOn` | Âm On | 音読み |
| `kanjiReadings.jlptCuCap` |  · JLPT cũ cấp {jlpt} | ・旧 JLPT {jlpt} 級 |
| `kanjiReadings.soNet` | Số nét | 画数 |

## kanjiText

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `kanjiText.chiXuatHienTrong` | Chỉ xuất hiện trong từ ghép | 熟語にだけ出てきます |
| `kanjiText.xuatHienTuTrong` | Xuất hiện từ {firstLevel} trong bộ từ vựng của bạn | あなたの語彙では {firstLevel} から出てきます |

## layout

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `layout.dieuHuongChinh` | Điều hướng chính | メインメニュー |
| `layout.giaoDien` | Giao diện | 表示 |
| `layout.giaoDien2` | Giao diện: {toLowerCase} | 表示：{toLowerCase} |
| `layout.luyenViet` | LUYỆN VIẾT · {title} | 書き取り練習・{title} |
| `layout.radicalHead` | Bộ {no} · {name} | 部首 {no}・{name} |
| `layout.so` | Số {n} | No.{n} |
| `layout.so2` | {toUpperCase}: Số {n} | {toUpperCase}：No.{n} |
| `layout.timKiem` | Tìm kiếm | 検索 |
| `layout.timKiemPhim` | Tìm kiếm (phím /) | 検索（/ キー） |
| `layout.timTuChuHan` | Tìm từ, chữ Hán… | 語・漢字を検索… |
| `layout.veChuDeTim` | Vẽ chữ để tìm | 手書きで検索 |

## learn

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `learn.boTuKhac` | Bộ từ khác | その他の単語帳 |
| `learn.chuHanN5Bai` | Chữ Hán N5 bài 1 | 漢字 N5 第1課 |
| `learn.countersSub` | 助数詞: 本、枚、匹、人… | 本・枚・匹・人… |
| `learn.hiraganaKatakanaGoRomaji` | Hiragana, katakana, gõ romaji | ひらがな・カタカナ・ローマ字入力 |
| `learn.kanjiDesc` | Chia bài theo cấp xuất hiện, flashcard, quiz Hán Việt | 初出レベル別の課、フラッシュカード、漢越音クイズ |
| `learn.luyenViet` | Luyện viết | 書き取り練習 |
| `learn.moi` | Mới | NEW |
| `learn.n5DenN1Chia` | N5 đến N1, chia bài, flashcard, quiz | N5〜N1、課ごと・フラッシュカード・クイズ |
| `learn.n5DenN1Loc` | N5 đến N1, lọc theo nhóm | N5〜N1、グループで絞り込み |
| `learn.phieuTapVietPdf` | Phiếu tập viết PDF / Word | 練習シート（PDF / Word） |
| `learn.rowGrammar` | Mẫu ngữ pháp | 文型 |
| `learn.rowGrammarSub` | N5–N1, lọc theo nhóm | N5〜N1、グループ別 |
| `learn.rowKana` | Bảng chữ và luyện tập | 五十音表と練習 |
| `learn.rowKanaSub` | Hiragana, katakana | ひらがな・カタカナ |
| `learn.rowKanji` | Chữ Hán theo bài | 課ごとの漢字 |
| `learn.rowWriting` | Tạo phiếu luyện viết | 練習シートを作成 |
| `learn.rowWritingKanaSub` | Bảng 50 âm | 五十音 |
| `learn.rowWritingKanjiSub` | 20 chữ đầu tiên | 最初の 20 字 |
| `learn.rowWritingRadical` | Bộ thủ bài 1 | 部首 第1課 |
| `learn.rowWritingRadicalSub` | Theo bài hoặc theo số bộ | 課ごと・部首番号で選ぶ |
| `learn.rowWritingSub` | Chọn chữ từ bài, sổ tay, kana hoặc tự nhập | 課・ノート・かな・自由入力から選ぶ |
| `learn.thuatNgu` | Thuật ngữ | 専門用語 |
| `learn.thuoc` | {mastered}/{total} thuộc | {mastered}/{total} 習得 |
| `learn.tienDo` | Tiến độ {name} | {name} の進み具合 |
| `learn.tienDoBoThu` | Tiến độ bộ thủ | 部首の進み具合 |
| `learn.tienDoChuHan` | Tiến độ chữ Hán | 漢字の進み具合 |
| `learn.tienDoKana` | Tiến độ kana | かなの進み具合 |
| `learn.tienDoNguPhap` | Tiến độ ngữ pháp | 文法の進み具合 |
| `learn.tuBai` | {total} từ, {ceil} bài | {total} 語、{ceil} 課 |
| `learn.tuGhepTuLay` | Từ ghép, từ láy, phó từ, cách đếm | 熟語・擬音語・副詞・助数詞 |
| `learn.tuVungDungHang` | Từ vựng dùng hằng ngày ở công ty Nhật | 日本の会社で毎日使う語彙 |
| `learn.tuVungJlpt` | Từ vựng JLPT | JLPT 語彙 |

## lesson

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `lesson.baiTiepTheo` | Bài tiếp theo | 次の課 |
| `lesson.cachVietKhac` | Cách viết khác: {join} | 別の書き方：{join} |
| `lesson.chu` | Chữ | 語 |
| `lesson.chuaCo` | Chưa có | なし |
| `lesson.gocTiengAnh` | Gốc tiếng Anh: {origin} | 英語の語源：{origin} |
| `lesson.hanViet` | Hán Việt | 漢越音 |
| `lesson.hocBangFlashcard` | Học bằng flashcard | フラッシュカードで学ぶ |
| `lesson.luuNghe` | Lưu, nghe | 保存・音声 |
| `lesson.nghia` | Nghĩa | 意味 |
| `lesson.tu` | {length} từ | {length} 語 |
| `lesson.tuChuaThuoc` | Từ chưa thuộc | 未習得の語 |
| `lesson.tuLienQuan` | {length} từ liên quan | 関連語 {length} 語 |
| `lesson.tuTu` | Từ {v}–{v2}, {length} từ | {v}〜{v2} 語目、{length} 語 |
| `lesson.ve` | Về {deckTitle} | {deckTitle} に戻る |
| `lesson.xemTuChinh` | Xem từ chính | 元の語を見る |

## lessonGrid

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `lessonGrid.bai` | Bài {v}–{min} | 第{v}–{min}課 |
| `lessonGrid.baiDaHoc` | Bài {v}, {text}, đã học {learned}/{total} | 第{v}課、{text}、学習済み {learned}/{total} |
| `lessonGrid.cacBai` | Các bài | 課の一覧 |
| `lessonGrid.chuaCoMucNao` | Chưa có mục nào. | まだ項目がありません。 |
| `lessonGrid.hocBai` | Học Bài {v} | 第{v}課を学ぶ |
| `lessonGrid.hocTiepBai` | Học tiếp Bài {v} | 第{v}課の続きを学ぶ |
| `lessonGrid.moiBai` | Mỗi bài | 1 課あたり |
| `lessonGrid.soMoiBai` | Số {unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}} mỗi bài | 1 課あたりの{unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}}数 |
| `lessonGrid.summary` | <b>{count}</b> {unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}}, chia thành {lessons} bài | <b>{count}</b> {unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}}、{lessons} 課に分割 |
| `lessonGrid.tienDo` | Tiến độ {title} | {title} の進み具合 |
| `lessonGrid.tienDoBai` | Tiến độ bài {v} | 第{v}課の進み具合 |
| `lessonGrid.trangDanhSachBai` | Trang danh sách bài | 課の一覧のページ |

## lessons

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `lessons.soTuMoiBai` | Số từ mỗi bài phải lớn hơn 0 | 1 課あたりの語数は 0 より大きくしてください |

## loadState

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `loadState.dangTai` | Đang tải | 読み込み中 |
| `loadState.dangTaiChiTiet` | Đang tải chi tiết | 詳細を読み込み中 |
| `loadState.dangTaiDuLieu` | Đang tải dữ liệu… | データを読み込み中… |
| `loadState.dangTaiDuLieu2` | Đang tải dữ liệu | データを読み込み中 |
| `loadState.khongTaiDuocDu` | Không tải được dữ liệu | データを読み込めませんでした |
| `loadState.kiemTraKetNoi` | Kiểm tra kết nối mạng rồi thử lại. | ネットワーク接続を確認して、もう一度お試しください。 |

## me

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `me.aiKeyModelTrinh` | AI (key, model), trình độ, ôn tập FSRS | AI（キー、モデル）、レベル、FSRS 復習 |
| `me.caiDat` | Cài đặt | 設定 |
| `me.caiDatChung` | Cài đặt chung | 一般設定 |
| `me.canOnHomNay` | Cần ôn hôm nay | 今日の復習 |
| `me.giaoDien` | Giao diện | 表示 |
| `me.hoiAiTrangDay` | Hỏi AI (trang đầy đủ) | AIに質問（全画面） |
| `me.lichSuChatTra` | Lịch sử chat, tra từ, ngữ pháp, hội thoại, sửa câu | 会話履歴、語の検索、文法、会話、添削 |
| `me.tienDo` | Tiến độ | 学習の進み具合 |
| `me.xemTienDoChi` | Xem tiến độ chi tiết, xuất / nhập tiến độ | 詳しい進み具合、学習記録の書き出し／読み込み |

## nav

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `nav.cuaBan` | Của bạn | あなた |
| `nav.hocTap` | Học tập | 学習 |

## notFound

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `notFound.duongDanCoThe` | Đường dẫn có thể đã sai hoặc bộ học không tồn tại. | URL が間違っているか、その単語帳は存在しません。 |
| `notFound.khongTimThayTrang` | Không tìm thấy trang này | ページが見つかりません |
| `notFound.veTrangChu` | Về trang chủ | ホームに戻る |

## notebookPage

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `notebookPage.aiTao` | (AI tạo) | （AI 作成） |
| `notebookPage.amHanVietCua` | Âm Hán Việt của chữ này? | この字の漢越音は？ |
| `notebookPage.bamBieuTuongDanh` | Bấm biểu tượng đánh dấu trên từ, chữ Hán, bộ thủ hoặc mẫu ngữ pháp để lưu vào sổ này. | 語・漢字・部首・文型のブックマークを押すと、このノートに保存されます。 |
| `notebookPage.bo` | Bộ {name}: {meaning} | 部首 {name}：{meaning} |
| `notebookPage.boNayTenLa` | Bộ này tên là gì? | この部首の名前は？ |
| `notebookPage.cacMucTrongSo` | Các mục trong sổ | ノートの項目 |
| `notebookPage.chuKhac` | Chữ khác | その他の字 |
| `notebookPage.chuaCoTrongDanh` | Chưa có trong danh sách chữ Hán | 漢字一覧にありません |
| `notebookPage.daThemTheMoi` | Đã thêm {added} thẻ mới vào trang Ôn tập | 復習ページに新しいカードを {added} 枚追加しました |
| `notebookPage.docTheNao` | Đọc thế nào? | どう読みますか？ |
| `notebookPage.duLieuDaThay` | Dữ liệu đã thay đổi nên không tìm thấy các mục này. | データが変わったため、これらの項目が見つかりません。 |
| `notebookPage.goCacMucNay` | Gỡ các mục này khỏi sổ | これらの項目をノートから外す |
| `notebookPage.goKhoiSo` | Gỡ khỏi sổ | ノートから外す |
| `notebookPage.goKhoiSo2` | Gỡ {entryLabel} khỏi sổ | {entryLabel} をノートから外す |
| `notebookPage.khongCoMucNao` | Không có mục nào khớp. | 一致する項目はありません。 |
| `notebookPage.locTheoLoai` | Lọc theo loại | 種類で絞り込み |
| `notebookPage.mauNayNghiaLa` | Mẫu này nghĩa là gì? | この文型の意味は？ |
| `notebookPage.moDeXemGiai` | Mở để xem giải thích | 開いて説明を見る |
| `notebookPage.moiMucDaCo` | Mọi mục đã có trong lịch ôn | すべての項目が復習に入っています |
| `notebookPage.muc2` | {length} mục | {length} 項目 |
| `notebookPage.mucKhongConTrong` | {length} mục không còn trong dữ liệu | データにない項目が {length} 件あります |
| `notebookPage.quizSoTay` | Quiz sổ tay | ノートのクイズ |
| `notebookPage.soChuaCoMuc` | Sổ chưa có mục nào | ノートにまだ項目がありません |
| `notebookPage.themCaSoVao` | Thêm cả sổ vào lịch ôn | ノート全体を復習に追加 |
| `notebookPage.timTrongSo` | Tìm trong sổ | ノート内を検索 |
| `notebookPage.timTrongSoChu` | Tìm trong sổ: chữ, cách đọc, nghĩa | ノート内を検索：字・読み・意味 |
| `notebookPage.tuNayNghiaLa` | Từ này nghĩa là gì? | この語の意味は？ |
| `notebookPage.ve` | Về {name} | {name} に戻る |

## notebooks

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `notebooks.bamBieuTuongDanh` | Bấm biểu tượng đánh dấu trên từ, chữ Hán, bộ thủ hay mẫu ngữ pháp để lưu vào sổ. Nhấn giữ để lưu nhanh. | 語・漢字・部首・文型のブックマークを押すとノートに保存されます。長押しですぐ保存できます。 |
| `notebooks.cham` | Chàm | 藍 |
| `notebooks.doSon` | Đỏ son | 朱 |
| `notebooks.editedPart` |  · sửa {date} | ・{date} 編集 |
| `notebooks.hongAnhDao` | Hồng anh đào | 桜 |
| `notebooks.len` | Lên | 上へ |
| `notebooks.luu` | Lưu | 保存 |
| `notebooks.mau` | Màu | 色 |
| `notebooks.muc` | {itemCount} mục{v} | {itemCount} 項目{v} |
| `notebooks.muc2` | Mực | 墨 |
| `notebooks.soTayMoi` | Sổ tay mới | 新しいノート |
| `notebooks.sua` | Sửa | 編集 |
| `notebooks.suaSo` | Sửa sổ {name} | ノート {name} を編集 |
| `notebooks.taoSo` | Tạo sổ | 作成 |
| `notebooks.taoSoTay` | + Tạo sổ tay | + ノートを作成 |
| `notebooks.tenSoTay` | Tên sổ tay | ノートの名前 |
| `notebooks.timHoaTuDang` | Tím hoa tử đằng | 藤 |
| `notebooks.tuKho` | Từ khó | 難しい語 |
| `notebooks.vangHoangBa` | Vàng hoàng bá | 黄蘗 |
| `notebooks.viDuTuHay` | Ví dụ: Từ hay nhầm | 例：間違えやすい語 |
| `notebooks.xanhTroi` | Xanh trời | 空 |
| `notebooks.xanhTung` | Xanh tùng | 松 |
| `notebooks.xoaSo` | Xóa sổ | ノートを削除 |
| `notebooks.xoaSoChiBo` | Xóa sổ chỉ bỏ danh sách đã lưu, không ảnh hưởng tiến độ học. | ノートを削除しても保存した一覧が消えるだけで、学習の進み具合には影響しません。 |
| `notebooks.xoaSoVaCac` | Xóa sổ và các mục trong sổ? | ノートと中の項目を削除しますか？ |
| `notebooks.xuong` | Xuống | 下へ |

## optionsPanel

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `optionsPanel.1Tu` | 1 từ | 1 語 |
| `optionsPanel.2Tu` | 2 từ | 2 語 |
| `optionsPanel.4OVuong` | 4 ô vuông | 4 マス |
| `optionsPanel.amKun` | Âm Kun | 訓読み |
| `optionsPanel.amOn` | Âm On | 音読み |
| `optionsPanel.caHang` | Cả hàng | 1 行すべて |
| `optionsPanel.chuMoNhatDan` | Chữ mờ nhạt dần từ trái sang phải | 左から右へだんだん薄く |
| `optionsPanel.chuThapNetDut` | Chữ thập nét đứt | 十字の点線 |
| `optionsPanel.duongKeTrongO` | Đường kẻ trong ô | マスの補助線 |
| `optionsPanel.hanVietSoThu` | Hán Việt + số thứ tự | 漢越音＋番号 |
| `optionsPanel.hangTieuDe` | Hàng tiêu đề {v} | 見出し行 {v} |
| `optionsPanel.hangTieuDe2` | Hàng tiêu đề | 見出し行 |
| `optionsPanel.kanaNote` | (kana luôn hiện romaji và chữ bảng kia) | （かなは常にローマ字ともう一方のかなを表示） |
| `optionsPanel.khoGiay` | Khổ giấy | 用紙サイズ |
| `optionsPanel.khoGiayDoc` | Khổ giấy (dọc) | 用紙サイズ（縦） |
| `optionsPanel.khong` | Không | なし |
| `optionsPanel.o` | {fades} ô | {fades} マス |
| `optionsPanel.oChuMoDe` | Ô chữ mờ để tô (hàng đầu) | なぞり用の薄い字（1 行目） |
| `optionsPanel.soChuMoiTrang` | Số chữ mỗi trang | 1 ページの字数 |
| `optionsPanel.soHangTapViet` | Số hàng tập viết | 練習行の数 |
| `optionsPanel.soHangTapViet2` | Số hàng tập viết mỗi chữ | 1 字あたりの練習行の数 |
| `optionsPanel.soOMoiHang` | Số ô mỗi hàng | 1 行のマス数 |
| `optionsPanel.soThuTuNet` | Số thứ tự nét ở ô chữ mẫu | 手本に筆順の番号 |
| `optionsPanel.soTuViDu` | Số từ ví dụ | 例語の数 |
| `optionsPanel.tuViDu` | Từ ví dụ | 例語 |
| `optionsPanel.tuyChon` | Tùy chọn | オプション |

## progress

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `progress.boTuKhac` | Bộ từ khác | その他の単語帳 |
| `progress.canOnHomNay` | Cần ôn hôm nay | 今日の復習 |
| `progress.chuyenTienDoGiua` | Chuyển tiến độ giữa các máy | 端末間で学習記録を移す |
| `progress.daHoc` |  Đã học |  学習済み |
| `progress.daThuoc` | {mastered} đã thuộc{v} | 習得 {mastered}{v} |
| `progress.daThuocDangHoc` | {mastered} đã thuộc, {v} đang học | 習得 {mastered}、学習中 {v} |
| `progress.duePart` | , {n} cần ôn | 、復習 {n} |
| `progress.masteredLegend` |  Đã thuộc (khoảng cách ôn từ {n} ngày) |  習得（復習間隔 {n} 日以上） |
| `progress.nguPhap` | Ngữ pháp {l} | 文法 {l} |
| `progress.thuatNguChuyenNganh` | Thuật ngữ chuyên ngành | 専門用語 |
| `progress.tienDo` | Tiến độ | 学習の進み具合 |
| `progress.tienDoDangLuu` | Tiến độ đang lưu trên trình duyệt này. Xóa đi sẽ không khôi phục được. | 学習記録はこのブラウザに保存されています。削除すると元に戻せません。 |
| `progress.tuVungTheoCap` | Từ vựng theo cấp | レベル別の語彙 |
| `progress.xoaTienDo` | Xóa tiến độ | 学習記録を削除 |
| `progress.xoaToanBoThe` | Xóa toàn bộ {length} thẻ | カード {length} 枚をすべて削除 |

## progressBar

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `progressBar.daHocDaThuoc` | Đã học {learned}/{total}, đã thuộc {mastered} | 学習済み {learned}/{total}、習得 {mastered} |

## providers

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `providers.claudeHaiku55` | Claude Haiku 5.5 (mặc định, nhanh) | Claude Haiku 5.5（標準、速い） |
| `providers.gemini35Flash` | Gemini 3.5 Flash-Lite (nhanh, rẻ) | Gemini 3.5 Flash-Lite（速い、安い） |
| `providers.gemini38Flash` | Gemini 3.8 Flash (mặc định) | Gemini 3.8 Flash（標準） |
| `providers.nhaCungCapKhong` | Nhà cung cấp không hợp lệ | プロバイダーが正しくありません |
| `providers.taoKeyMienPhi` | Tạo key miễn phí ở Google AI Studio → Get API key. | Google AI Studio → Get API key で無料のキーを作成できます。 |
| `providers.taoKeyOAnthropic` | Tạo key ở Anthropic Console → API Keys (cần nạp credit). | Anthropic Console → API Keys でキーを作成します（クレジットの購入が必要）。 |

## quickSave

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `quickSave.daLuuVao` | Đã lưu vào {name} | {name} に保存しました |
| `quickSave.doi` | Đổi | 変更 |

## quizSession

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `quizSession.cacCauSaiSe` | Các câu sai sẽ quay lại sớm trong lịch ôn. | 間違えた問題は早めに復習に出てきます。 |
| `quizSession.cacTuODay` | Các từ ở đây chưa có cách đọc nên không gõ được. | ここの語には読み方がないため、入力形式は使えません。 |
| `quizSession.canXemLai` | Cần xem lại | 見直す語 |
| `quizSession.cauChon1Trong` | {total} câu, chọn 1 trong 4 đáp án, xen kẽ Nhật → Việt và Việt → Nhật. | {total} 問。4 択で、日本語 → ベトナム語とベトナム語 → 日本語が交互に出ます。 |
| `quizSession.cauCoDungGoi` |  {length} câu có dùng gợi ý (chấm "Khó"). |  ヒントを使った問題 {length} 問（「難しい」扱い）。 |
| `quizSession.cauGoCachDoc` | {typing} câu, gõ cách đọc bằng romaji hoặc kana.{v} | {typing} 問。読み方をローマ字かかなで入力します。{v} |
| `quizSession.chonTuTiengNhat` | Chọn từ tiếng Nhật đúng nghĩa | 意味に合う日本語を選んでください |
| `quizSession.chuaDung` | Chưa đúng | 不正解 |
| `quizSession.daDungGoiY` | Đã dùng gợi ý (đúng sẽ tính "Khó") | ヒント使用済み（正解でも「難しい」扱い） |
| `quizSession.diToiOnTap` | Đi tới ôn tập | 復習へ |
| `quizSession.dungHetCacTu` | Đúng hết. Các từ này sẽ được giãn lịch ôn. | 全問正解。これらの語は復習の間隔が延びます。 |
| `quizSession.goCachDoc` | Gõ cách đọc | 読み方を入力 |
| `quizSession.goCachDocCua` | Gõ cách đọc của từ | この語の読み方を入力 |
| `quizSession.goiY` | Gợi ý | ヒント |
| `quizSession.goiYBatDau` | Gợi ý: bắt đầu bằng | ヒント：最初の字は |
| `quizSession.goiYBo2` | Gợi ý (bỏ 2 đáp án sai) | ヒント（誤答を 2 つ消す） |
| `quizSession.ketQuaDuocDua` | Kết quả được đưa vào lịch ôn tập: câu sai sẽ quay lại sớm hơn. | 結果は復習に反映され、間違えた問題は早めに出てきます。 |
| `quizSession.missingReading` |  Từ thiếu cách đọc được bỏ qua. |  読み方のない語は除きました。 |
| `quizSession.romajiHoacKana` | romaji hoặc kana | ローマ字またはかな |
| `quizSession.tracNghiem` | Trắc nghiệm | 選択式 |
| `quizSession.tuNayNghiaLa` | Từ này nghĩa là gì? | この語の意味は？ |

## radicalDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `radicalDetail.bo` | bộ {name} | 部首 {name} |
| `radicalDetail.boChinhCuaChu` | Bộ chính của chữ theo Unicode Unihan. | Unicode Unihan による字の主な部首です。 |
| `radicalDetail.boSoNet` | Bộ số {no} · {strokes} nét | 部首番号 {no}・{strokes} 画 |
| `radicalDetail.charsInRadical` | {n} chữ Hán thuộc bộ này | この部首の漢字 {n} 字 |
| `radicalDetail.chiTietBo` | Chi tiết bộ {radical} | 部首 {radical} の詳細 |
| `radicalDetail.chu` | Chữ {ch}{v} | 字 {ch}{v} |
| `radicalDetail.chuaCoTrongDu` |  (chưa có trong dữ liệu) | （データにありません） |
| `radicalDetail.daHocBoNay` | Đã học bộ này | この部首は学習済み |
| `radicalDetail.dangKhac` | Dạng khác: | 別の形： |

## readings

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `readings.kun` | Kun | 訓 |
| `readings.loiKhiTaiAm` | Lỗi {status} khi tải âm đọc | 読みの読み込みでエラー {status} |
| `readings.on` | On | 音 |

## recognize

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `recognize.khongNapDuocDu` | Không nạp được dữ liệu nhận dạng chữ viết tay | 手書き認識データを読み込めませんでした |

## resumePrompt

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `resumePrompt.banDangLamDo` | Bạn đang làm dở bài này | この課は途中です |
| `resumePrompt.daChamKetQua` | Đã chấm {answered} {unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}}. Kết quả đã chấm vẫn nằm trong lịch ôn dù bạn chọn làm lại. | {answered} {unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}}判定済みです。やり直しても、判定済みの結果は復習に残ります。 |
| `resumePrompt.lamLai` | Làm lại | 最初から |
| `resumePrompt.tiepTuc` | Tiếp tục | 続ける |
| `resumePrompt.tiepTucTu` | Tiếp tục từ {unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}} {at}/{total}? | {at}/{total} {unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}}目から続けますか？ |

## review

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `review.bo` | Bộ {name} | 部首 {name} |
| `review.chonBaiHoc` | Chọn bài học | 課を選ぶ |
| `review.chuaCoCachDoc` | Chưa có cách đọc | 読み方なし |
| `review.chuaCoDuLieu` | Chưa có dữ liệu cho chữ này. | この字のデータはまだありません。 |
| `review.chuaCoTheNao` | Chưa có thẻ nào đến hạn | 復習時期のカードはまだありません |
| `review.conLai` | Còn lại | 残り |
| `review.conThe` | Còn {length} thẻ | 残り {length} 枚 |
| `review.conTheChoNgay` |  Còn {waiting} thẻ chờ ngày mai do giới hạn mỗi ngày (đổi trong Cài đặt). |  1 日の上限のため、{waiting} 枚が明日に回ります（設定で変更できます）。 |
| `review.daXong` | Đã xong | 完了 |
| `review.de` | Dễ | 簡単 |
| `review.hocTuMoiBang` | Học từ mới bằng flashcard hoặc làm quiz để tạo lịch ôn. | フラッシュカードやクイズで新しい語を学ぶと、復習予定が作られます。 |
| `review.kho` | Khó | 難しい |
| `review.kindDeck` | {kind}, {deck} | {kind}・{deck} |
| `review.latThe` | Lật thẻ | カードをめくる |
| `review.mauNayChuaTach` | Mẫu này chưa tách được ý nghĩa, mở trang chi tiết để xem. | この文型は意味をまだ取り出せていません。詳細ページで確認してください。 |
| `review.nextIn` | Thẻ tiếp theo sau <time>{time}</time> | 次のカードまで <time>{time}</time> |
| `review.nho` | Nhớ | 覚えた |
| `review.nhoLaiCachDoc` | Nhớ lại cách đọc và nghĩa rồi lật thẻ. | 読み方と意味を思い出してから、カードをめくってください。 |
| `review.onLuonBayGio` | Ôn luôn bây giờ | 今すぐ復習 |
| `review.phienOnTap` | Phiên ôn tập | 復習セッション |
| `review.quen` | Quên | 忘れた |
| `review.quenTrongPhien` | Quên trong phiên | 今回忘れた数 |
| `review.so` | {radical} số {no} | {radical} 番号 {no} |
| `review.so2` | {counter}: số + {counter2} | {counter}：数＋{counter2} |
| `review.theTiepTheoDen` | Thẻ tiếp theo đến hạn lúc {time}. | 次のカードは {time} に復習時期になります。 |
| `review.theVuaHocDang` | Thẻ vừa học đang ở bước nhắc lại ngắn. Chờ một chút để nhớ chắc hơn, hoặc ôn luôn. | 学習したばかりのカードは短い間隔で繰り返し中です。少し待つとより定着します。今すぐ復習もできます。 |
| `review.xemGiaiThichDay` | Xem giải thích đầy đủ | 詳しい説明を見る |
| `review.xongTheHetThe` | Xong {done} thẻ. Hết thẻ cần ôn. | {done} 枚完了。復習するカードはもうありません。 |
| `review.xuatHienTu` | {kanji}, xuất hiện từ {firstLevel} | {kanji}、{firstLevel} から出現 |

## saveSheet

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `saveSheet.chonMotHoacNhieu` | Chọn một hoặc nhiều sổ. Nhấn giữ nút đánh dấu để lưu nhanh vào sổ dùng gần nhất. | ノートを 1 つ以上選んでください。ブックマークを長押しすると、最近使ったノートにすぐ保存できます。 |
| `saveSheet.luuVaoSoTay` | Lưu vào sổ tay | ノートに保存 |
| `saveSheet.mau` | Màu | 色 |
| `saveSheet.mauSoTay` | Màu sổ tay | ノートの色 |
| `saveSheet.muc` | {itemCount} mục | {itemCount} 項目 |
| `saveSheet.taoSoTayMoi` |  Tạo sổ tay mới |  新しいノートを作成 |
| `saveSheet.taoVaLuu` | Tạo và lưu | 作成して保存 |
| `saveSheet.tenSoTay` | Tên sổ tay | ノートの名前 |
| `saveSheet.viDuTuHay` | Ví dụ: Từ hay nhầm, Kanji tuần này | 例：間違えやすい語、今週の漢字 |

## search

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `search.bai` |  Bài {lesson} |  第{lesson}課 |
| `search.moDeXemGiai` | Mở để xem giải thích | 開いて説明を見る |
| `search.tu` | từ {firstLevel} | {firstLevel} から |

## searchDialog

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `searchDialog.chuNhatKanaRomaji` | Chữ Nhật, kana, romaji, Hán Việt hoặc nghĩa | 日本語、かな、ローマ字、漢越音、意味 |
| `searchDialog.dangMoBangVe` | Đang mở bảng vẽ… | 手書き枠を開いています… |
| `searchDialog.dangTaiDuLieu` | Đang tải dữ liệu ({loaded}/{total})… | データを読み込み中（{loaded}/{total}）… |
| `searchDialog.dangTaiThemDu` | Đang tải thêm dữ liệu ({loaded}/{total}), kết quả có thể thay đổi. | データを追加で読み込み中（{loaded}/{total}）。結果が変わることがあります。 |
| `searchDialog.deChonEnterDe` | ↑ ↓ để chọn, Enter để mở, Esc để đóng. Tối đa 50 kết quả. | ↑ ↓ で選択、Enter で開く、Esc で閉じる。最大 50 件。 |
| `searchDialog.ketQuaTimKiem` | Kết quả tìm kiếm | 検索結果 |
| `searchDialog.khongTimThayThu` | Không tìm thấy "{deferred}". Thử bỏ dấu hoặc gõ ngắn hơn. | 「{deferred}」は見つかりませんでした。声調記号を外すか、短く入力してみてください。 |
| `searchDialog.loadingPart` |  Đang tải dữ liệu ({loaded}/{total})… |  データを読み込み中（{loaded}/{total}）… |
| `searchDialog.motSoDuLieu` | Một số dữ liệu chưa tải được. | 一部のデータを読み込めませんでした。 |
| `searchDialog.timKiem` | Tìm kiếm | 検索 |
| `searchDialog.timTuChuHan` | Tìm từ, chữ Hán, ngữ pháp | 語・漢字・文法を検索 |
| `searchDialog.veChuDeTim` | Vẽ chữ để tìm | 手書きで検索 |
| `searchDialog.viDuSankaTham` | Ví dụ: 参加, さんか, sanka, tham gia, THAM.{v} | 例：参加、さんか、sanka、tham gia、THAM。{v} |

## settings

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `settings.aiChonTuVung` | AI chọn từ vựng, ví dụ và độ sâu giải thích theo trình độ này. | AI はこのレベルに合わせて語彙・例文・説明の詳しさを選びます。 |
| `settings.aiHoiAi` | AI (Hỏi AI) | AI（AIに質問） |
| `settings.an` | Ẩn | 隠す |
| `settings.apiKey` | API key {name} | {name} の API キー |
| `settings.caiDat` | Cài đặt | 設定 |
| `settings.chiLuuTrenMay` | chỉ lưu trên máy này | この端末にだけ保存され |
| `settings.chuaCoKey` | Chưa có key. | キーが未設定です。 |
| `settings.daCoKeyNhap` | Đã có key, nhập để thay | キー設定済み。入力すると置き換えます |
| `settings.daCoKeyTren` | Đã có key trên máy này. | この端末にキーが保存されています。 |
| `settings.daLuuKeyTren` | Đã lưu key trên máy này. | この端末にキーを保存しました。 |
| `settings.danKeyVaoDay` | Dán key vào đây | ここにキーを貼り付け |
| `settings.dangKiemTra` | Đang kiểm tra… | 確認中… |
| `settings.explainJa` | Tiếng Nhật | 日本語 |
| `settings.explainLang` | Ngôn ngữ giải thích của AI | AI の説明言語 |
| `settings.explainLangHelp` | AI hỏi và trả lời bằng ngôn ngữ này, không phụ thuộc ngôn ngữ giao diện. Phần tiếng Nhật trong câu trả lời (ví dụ, mẫu câu) vẫn là tiếng Nhật. | AI はこの言語で質問・回答します（画面の言語とは別です）。回答中の日本語（例文・文型）はそのまま日本語です。 |
| `settings.explainVi` | Tiếng Việt | ベトナム語 |
| `settings.hien` | Hiện | 表示 |
| `settings.ketNoiDuocVoi` | Kết nối được với {name} ({model}). | {name}（{model}）に接続できました。 |
| `settings.kiemTraKetNoi` | Kiểm tra kết nối | 接続を確認 |
| `settings.language` | Ngôn ngữ | 言語 |
| `settings.languageHelp` | Ngôn ngữ của giao diện. Dữ liệu học (nghĩa, âm Hán Việt, giải thích ngữ pháp…) luôn là tiếng Việt. | 画面の表示言語です。学習データ（意味、漢越音、文法の説明など）は常にベトナム語です。 |
| `settings.localstorageKhongCoTrong` |  (localStorage), không có trong file Xuất tiến độ, không gửi đi đâu ngoài nhà cung cấp AI. Ai dùng được trình duyệt này thì cũng đọc được key, nên đừng nhập key trên máy dùng chung. | （localStorage）、学習記録の書き出しにも含まれず、AI プロバイダー以外には送られません。このブラウザを使える人はキーを読めるので、共用の端末では入力しないでください。 |
| `settings.luuKey` | Lưu key | キーを保存 |
| `settings.moTienDo` | Mở Tiến độ | 学習の進み具合を開く |
| `settings.moTrangLayKey` | Mở trang lấy key | キーの取得ページを開く |
| `settings.model` | Model | モデル |
| `settings.modelKhac` | Model khác… | その他のモデル… |
| `settings.nhaCungCap` | Nhà cung cấp | プロバイダー |
| `settings.nhaCungCapAi` | Nhà cung cấp AI | AI プロバイダー |
| `settings.tenModel` | Tên model | モデル名 |
| `settings.tienDoVaSao` | Tiến độ và sao lưu | 学習記録とバックアップ |
| `settings.trinhDo` | Trình độ | レベル |
| `settings.trinhDoJlpt` | Trình độ JLPT | JLPT レベル |
| `settings.trinhDuyetGoiThang` | Trình duyệt gọi thẳng AI bằng API key của bạn. Key  | ブラウザがあなたの API キーで直接 AI を呼び出します。キーは |
| `settings.xemTienDoXuat` | Xem tiến độ, xuất / nhập tiến độ sang máy khác (không kèm API key). | 学習の進み具合の確認、別の端末への書き出し／読み込み（API キーは含みません）。 |
| `settings.xoaKey` | Xóa key | キーを削除 |

## sourcePicker

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `sourcePicker.bai` | Bài  | 第 |
| `sourcePicker.bai2` | Bài {n} | 第{n}課 |
| `sourcePicker.baiChuHan` | Bài Chữ Hán | 漢字の課 |
| `sourcePicker.bangChu` | Bảng chữ | かな表 |
| `sourcePicker.capXuatHien` | Cấp xuất hiện | 初出レベル |
| `sourcePicker.chonChu` | Chọn chữ | 字を選ぶ |
| `sourcePicker.chonMotHoacNhieu` | Chọn một hoặc nhiều bài (giống cách chia bài ở trang Chữ Hán): | 課を 1 つ以上選んでください（漢字ページと同じ分け方）： |
| `sourcePicker.chuaCoSoTay` | Chưa có sổ tay nào. | ノートがまだありません。 |
| `sourcePicker.daBoKyTu` | Đã bỏ {length} ký tự không có dữ liệu nét: {join}{v} | 筆順データのない {length} 字を除きました：{join}{v} |
| `sourcePicker.danChuBatKy` | Dán chữ bất kỳ: chữ trùng và chữ không có dữ liệu nét sẽ tự bỏ. | 好きな字を貼り付けてください。重複と筆順データのない字は自動で除きます。 |
| `sourcePicker.hang` | Hàng {label} | {label} |
| `sourcePicker.nguonChu` | Nguồn chữ | 字の出どころ |
| `sourcePicker.radicalByLesson` | Theo bài | 課ごと |
| `sourcePicker.radicalByNo` | Theo số bộ | 部首番号 |
| `sourcePicker.radicalLessonsHelp` | Chọn một hoặc nhiều bài (giống cách chia bài ở tab Bộ thủ): | 課を 1 つ以上選んでください（部首タブと同じ分け方）： |
| `sourcePicker.radicalMode` | Cách chọn bộ thủ | 部首の選び方 |
| `sourcePicker.radicalNosHelp` | Số Khang Hy từ 1 đến 214. Đang chọn {n} bộ. | 康熙部首の番号（1〜214）。{n} 個を選択中。 |
| `sourcePicker.radicalNosLabel` | Số bộ (vd. 1-20, 30) | 部首番号（例：1-20, 30） |
| `sourcePicker.tuNhap` | Tự nhập | 自由入力 |
| `sourcePicker.viDu` | Ví dụ: 日本語を勉強します | 例：日本語を勉強します |

## sources

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `sources.bai` | {level} · Bài {label} | {level}・第{label}課 |
| `sources.caBang` | cả bảng | 表全体 |
| `sources.hang` | {length} hàng | {length} 行 |
| `sources.radicalLessons` | Bộ thủ · Bài {label} | 部首・第{label}課 |
| `sources.radicalNos` | Bộ thủ · Số {label} | 部首・No.{label} |
| `sources.soTay` | Sổ tay · {name} | ノート・{name} |
| `sources.tuChon` | Tự chọn | 自由選択 |

## speakButton

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `speakButton.mayChuaCoGiong` | Máy chưa có giọng đọc tiếng Nhật. Cài thêm giọng ja-JP trong cài đặt hệ thống để nghe chuẩn hơn. | この端末には日本語の音声がありません。システム設定で ja-JP の音声を追加すると、正しい発音で聞けます。 |
| `speakButton.nghePhatAm` | Nghe phát âm | 発音を聞く |

## srs

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `srs.1Phut` | < 1 phút | 1 分未満 |
| `srs.gio` | {round} giờ | {round} 時間 |
| `srs.nam` | {replace} năm | {replace} 年 |
| `srs.ngay` | {days} ngày | {days} 日 |
| `srs.phut` | {round} phút | {round} 分 |
| `srs.thang` | {round} tháng | {round} か月 |

## srsSettings

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `srsSettings.loadLess` |  (ở 90% là {base}, ít hơn {pct}%) | （90% のときは {base}、{pct}% 少ない） |
| `srsSettings.loadMore` |  (ở 90% là {base}, nhiều hơn {pct}%) | （90% のときは {base}、{pct}% 多い） |

## srsSettingsSection

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `srsSettingsSection.80OnIt` | 80% · ôn ít | 80%・復習少なめ |
| `srsSettingsSection.95NhoChac` | 95% · nhớ chắc | 95%・しっかり記憶 |
| `srsSettingsSection.caoHonThiNho` | Cao hơn thì nhớ chắc hơn nhưng phải ôn nhiều hơn; thấp hơn thì ôn ít nhưng quên nhiều hơn. Mặc định 90%. | 高くするとよく覚えられますが復習が増え、低くすると復習は減りますが忘れやすくなります。標準は 90%。 |
| `srsSettingsSection.chuaDuDuLieu` | Chưa đủ dữ liệu để ước tính số lượt ôn mỗi ngày. | 1 日の復習回数を見積もるためのデータがまだ足りません。 |
| `srsSettingsSection.deTheHocCung` | Để thẻ học cùng lúc không dồn vào một ngày | 同時に学んだカードが同じ日に集中しないようにします |
| `srsSettingsSection.khoangCachToiDa` | Khoảng cách tối đa (ngày) | 最大間隔（日） |
| `srsSettingsSection.lichOnDungThuat` | Lịch ôn dùng thuật toán FSRS: mỗi thẻ được hẹn ôn đúng lúc khả năng nhớ sắp xuống tới mức bạn chọn. | 復習には FSRS アルゴリズムを使います。記憶の定着度が設定した水準まで下がる頃に各カードの復習が来ます。 |
| `srsSettingsSection.luotOnToiDa` | Lượt ôn tối đa mỗi ngày | 1 日の最大復習回数 |
| `srsSettingsSection.mucGhiNhoMong` | Mức ghi nhớ mong muốn | 目標の記憶率 |
| `srsSettingsSection.theMoiToiDa` | Thẻ mới tối đa mỗi ngày | 1 日の新規カード上限 |
| `srsSettingsSection.voiTheDangOn` | Với {reviewCount} thẻ đang ôn: ≈ {toFixed} lượt ôn/ngày{v} | 復習中のカード {reviewCount} 枚：1 日あたり約 {toFixed} 回{v} |
| `srsSettingsSection.xaoNheNgayOn` | Xáo nhẹ ngày ôn | 復習日を少しばらす |

## srsStats

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `srsStats.29Ngay` | +29 ngày | +29 日 |
| `srsStats.caoNhatTheNgay` | Cao nhất {max} thẻ/ngày | 最大 {max} 枚／日 |
| `srsStats.hocLai` | Học lại | 再学習 |
| `srsStats.homNay` | Hôm nay | 今日 |
| `srsStats.inDays` | {n} ngày nữa | {n} 日後 |
| `srsStats.lichOn` | Lịch ôn | 復習予定 |
| `srsStats.moi` | Mới | 新規 |
| `srsStats.mucMongMuon` | Mức mong muốn | 目標 |
| `srsStats.mucMongMuon2` | Mức mong muốn {pct}{v} | 目標 {pct}{v} |
| `srsStats.retNone` |  · chưa có lượt ôn thẻ Ôn tập | ・まだ復習カードの記録がありません |
| `srsStats.retPart` |  · {ok}/{total} lượt ôn nhớ được | ・{ok}/{total} 回思い出せた |
| `srsStats.soTheTheoTrang` | Số thẻ theo trạng thái | 状態別のカード数 |
| `srsStats.the` | {v}: {n} thẻ | {v}：{n} 枚 |
| `srsStats.theDenHan30` | Thẻ đến hạn 30 ngày tới (cột đầu gồm cả thẻ quá hạn) | 今後 30 日の復習予定（最初の列は期限切れを含む） |
| `srsStats.today` | Hôm nay | 今日 |
| `srsStats.tyLeNhoThuc` | Tỷ lệ nhớ thực tế (30 ngày) | 実際の記憶率（30 日） |

## strokeOrder

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `strokeOrder.anCachViet` | Ẩn cách viết | 書き方を隠す |
| `strokeOrder.chuaCoDuLieu` | Chưa có dữ liệu thứ tự nét | 筆順データがありません |
| `strokeOrder.khongTaiDuocThu` | Không tải được thứ tự nét. | 筆順を読み込めませんでした。 |
| `strokeOrder.thuTuNet` | Thứ tự nét | 筆順 |
| `strokeOrder.thuTuNetChu` | Thứ tự nét chữ {char} | {char} の筆順 |
| `strokeOrder.thuTuNetChu2` | Thứ tự nét chữ {char}: {total} nét. Chạm để vẽ lại | {char} の筆順：{total} 画。タップでもう一度 |
| `strokeOrder.veLaiThuTu` | Vẽ lại thứ tự nét chữ {char} | {char} の筆順をもう一度表示 |
| `strokeOrder.xemCachViet` | Xem cách viết | 書き方を見る |

## strokes

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `strokes.loadError` | Lỗi {status} khi tải nét chữ {ch} | {ch} の筆順の読み込みでエラー {status} |

## studyLayout

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `studyLayout.phienHoc` | Phiên học | 学習セッション |
| `studyLayout.phimTat` | Phím tắt | ショートカットキー |
| `studyLayout.thongTinPhienHoc` | Thông tin phiên học | 学習セッションの情報 |

## tatoeba

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `tatoeba.hetThoiGianCho` | Hết thời gian chờ Tatoeba | Tatoeba の応答がタイムアウトしました |

## types

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `types.aiTuChoiTra` | AI từ chối trả lời câu này. Thử hỏi theo cách khác. | AI がこの質問への回答を断りました。聞き方を変えてみてください。 |
| `types.apiKeyKhongDung` | API key không đúng hoặc chưa được cấp quyền. Kiểm tra lại trong Cài đặt. | API キーが正しくないか、権限がありません。設定で確認してください。 |
| `types.coLoiKhiGoi` | Có lỗi khi gọi AI, thử lại sau. | AI の呼び出しでエラーが発生しました。しばらくしてから再試行してください。 |
| `types.daDung` | Đã dừng. | 停止しました。 |
| `types.daHetLuotMien` | Đã hết lượt miễn phí, thử lại sau ít phút. | 無料枠を使い切りました。数分後に再試行してください。 |
| `types.khongKetNoiDuoc` | Không kết nối được, kiểm tra mạng rồi thử lại. | 接続できません。ネットワークを確認して再試行してください。 |
| `types.mayChuAiDang` | Máy chủ AI đang quá tải, thử lại sau. | AI サーバーが混み合っています。後で再試行してください。 |
| `types.yeuCauKhongHop` | Yêu cầu không hợp lệ (có thể tên model sai hoặc model không hỗ trợ ảnh). Kiểm tra model trong Cài đặt. | リクエストが正しくありません（モデル名の誤り、またはモデルが画像に非対応の可能性があります）。設定でモデルを確認してください。 |

## unlockGate

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `unlockGate.chiHoiMotLan` | Chỉ hỏi một lần trên mỗi máy. | 端末ごとに一度だけ入力します。 |
| `unlockGate.dangKiemTra` | Đang kiểm tra… | 確認中… |
| `unlockGate.maChuaDungThu` | Mã chưa đúng, thử lại. | コードが違います。もう一度入力してください。 |
| `unlockGate.maMoKhoa4` | Mã mở khóa 4 số | 4 桁の解除コード |
| `unlockGate.nhapMa4So` | Nhập mã 4 số để mở | 4 桁のコードを入力して開く |

## updatePrompt

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `updatePrompt.coBanCapNhat` | Có bản cập nhật | アップデートがあります |
| `updatePrompt.daSanSangHoc` | Đã sẵn sàng học offline | オフラインで学習できるようになりました |
| `updatePrompt.dongThongBao` | Đóng thông báo | 通知を閉じる |
| `updatePrompt.taiLai` | Tải lại | 再読み込み |

## useChatSend

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `useChatSend.daDu10Cuoc` | Đã đủ 10 cuộc trò chuyện đều được ghim. Bỏ ghim một cuộc để tạo cuộc mới. | ピン留めした会話が 10 件あります。新しい会話を始めるには、どれかのピン留めを外してください。 |

## useStudySession

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `useStudySession.hocTiep` | Học tiếp | 学習を続ける |
| `useStudySession.roiPhienHoc` | Rời phiên học? | 学習を中断しますか？ |
| `useStudySession.roiTrang` | Rời trang | ページを離れる |
| `useStudySession.tienDoDaDuoc` | Tiến độ đã được lưu ({unit, select, word {từ} char {chữ} radical {bộ} item {mục} card {thẻ} question {câu} other {mục}} {answered}/{total}). Mở lại bài này để tiếp tục từ chỗ đang dừng. | 進み具合は保存されています（{answered}/{total} {unit, select, word {語} char {字} radical {部首} item {項目} card {枚} question {問} other {件}}）。この課をもう一度開くと、続きから再開できます。 |

## useStudyStats

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `useStudyStats.mau` | {learned}/{total} mẫu | {learned}/{total} 文型 |
| `useStudyStats.troSoTu` | {total} trợ số từ | 助数詞 {total} |
| `useStudyStats.troSoTuO` | {size} trợ số từ · {cells} ô ôn | 助数詞 {size}・復習マス {cells} |

## useTheme

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `useTheme.sang` | Sáng | ライト |
| `useTheme.theoHeThong` | Theo hệ thống | システムに合わせる |
| `useTheme.toi` | Tối | ダーク |

## vocabBits

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `vocabBits.cachDocKhac` | Cách đọc khác | 別の読み方 |
| `vocabBits.cachVietKhac` | Cách viết khác | 別の書き方 |
| `vocabBits.ghiChu` | Ghi chú | メモ |
| `vocabBits.gocTiengAnh` | Gốc tiếng Anh | 英語の語源 |
| `vocabBits.tuChinh` | Từ chính | 元の語 |
| `vocabBits.tuLienQuan` | Từ liên quan | 関連語 |
| `vocabBits.tuLoai` | Từ loại | 品詞 |
| `vocabBits.xemTu` | Xem {length} từ | {length} 語を見る |
| `vocabBits.xemTuChinh` | Xem từ chính | 元の語を見る |

## vocabCardFaces

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `vocabCardFaces.chamDeLatThe` | Chạm để lật thẻ | タップでカードをめくる |

## vocabDeck

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `vocabDeck.chuHanXuatHien` | Chữ Hán xuất hiện từ {level} | {level} から出てくる漢字 |
| `vocabDeck.tienDoTuChua` | Tiến độ từ chưa thuộc | 未習得の語の進み具合 |
| `vocabDeck.tuBanDaDanh` | {length} từ bạn đã đánh dấu "Chưa thuộc" trong file Excel | Excel ファイルで「未習得」に印を付けた語 {length} 語 |
| `vocabDeck.tuChuaThuoc` | Từ chưa thuộc | 未習得の語 |

## wordDetail

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `wordDetail.chu` | Chữ {kanji}, {hanViet} | 字 {kanji}、{hanViet} |
| `wordDetail.chuHanTrongTu` | Chữ Hán trong từ | 語に含まれる漢字 |
| `wordDetail.daHocBoDanh` | Đã học, bỏ đánh dấu | 学習済み（解除する） |
| `wordDetail.dangChoOTrang` | Đang chờ ở trang Ôn tập | 復習ページで待機中 |
| `wordDetail.denHanOn` | Đến hạn ôn | 復習時期です |
| `wordDetail.moTrangDayDu` | Mở trang đầy đủ | 詳細ページを開く |
| `wordDetail.onLaiSau` | Ôn lại sau {formatDelay} | {formatDelay}後に復習 |
| `wordDetail.tuChinh` | Từ chính | 元の語 |
| `wordDetail.tuLienQuan` | Từ liên quan | 関連語 |
| `wordDetail.tuNayChuaCo` | Từ này chưa có cách đọc trong dữ liệu; nút nghe đọc theo chữ viết. | この語はデータに読み方がないため、音声は表記どおりに読み上げます。 |

## wordExamples

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `wordExamples.aiDich` | (AI dịch) | （AI 訳） |
| `wordExamples.aiTao` | AI tạo | AI 作成 |
| `wordExamples.amThanh` | ; âm thanh: {audioBy} | ；音声：{audioBy} |
| `wordExamples.chuaTimThayVi` | Chưa tìm thấy ví dụ. | 例文が見つかりませんでした。 |
| `wordExamples.daLuuCauVao` | Đã lưu câu vào {name} | {name} に例文を保存しました |
| `wordExamples.dangDich` | Đang dịch… | 翻訳中… |
| `wordExamples.dangTai` | Đang tải… | 読み込み中… |
| `wordExamples.dichLai` | Dịch lại | もう一度翻訳 |
| `wordExamples.dichSangTiengViet` | Dịch sang tiếng Việt | ベトナム語に翻訳 |
| `wordExamples.luuCauVaoSo` | Lưu câu vào sổ tay | 例文をノートに保存 |
| `wordExamples.moLaiKhiCo` | Mở lại khi có mạng, hoặc thêm khóa AI trong Cài đặt để AI tạo câu. | ネットワークにつながったら開き直すか、設定で AI キーを追加すると AI が例文を作ります。 |
| `wordExamples.ngheCau` | Nghe câu: {ja} | 例文を聞く：{ja} |
| `wordExamples.ngheGiongThatTatoeba` | Nghe (giọng thật, Tatoeba) | 聞く（肉声、Tatoeba） |
| `wordExamples.viDuKhac` | Ví dụ khác | ほかの例文 |

## wordPage

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `wordPage.bai` | {deckTitle}, Bài {lesson} | {deckTitle}、第{lesson}課 |
| `wordPage.chiTietTu` | Chi tiết từ | 語の詳細 |

## writing

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `writing.chonItNhatMot` | Chọn ít nhất một chữ để xem trước | プレビューするには字を 1 つ以上選んでください |
| `writing.daTao` | Đã tạo {name} ({formatBytes}) | {name} を作成しました（{formatBytes}） |
| `writing.dangTao` | Đang tạo… | 作成中… |
| `writing.dangTaoPdf` | Đang tạo PDF… | PDF を作成中… |
| `writing.footerPrefix` | Kotonoha · Trang  | Kotonoha・ |
| `writing.footerSuffix` | (rỗng) |  ページ |
| `writing.khongTaiDuocDanh` | Không tải được danh sách chữ có dữ liệu nét. Kiểm tra mạng rồi tải lại trang. | 筆順データのある字の一覧を読み込めませんでした。ネットワークを確認してページを再読み込みしてください。 |
| `writing.luyenViet` | Luyện viết | 書き取り練習 |
| `writing.nextPage` | Trang sau | 次のページ |
| `writing.pageOf` | Trang {page}/{total} | {page}/{total} ページ |
| `writing.pdfDaSanSang` | PDF đã sẵn sàng: bấm để mở bảng chia sẻ (Lưu vào Tệp / In) | PDF の準備ができました：タップすると共有メニューが開きます（ファイルに保存／プリント） |
| `writing.pdfVectorInRo` | PDF vector, in rõ nét; Word sửa được chữ tiêu đề. | PDF はベクター形式で印刷がきれい、Word は見出しの文字を編集できます。 |
| `writing.taiPdf` | Tải PDF | PDF をダウンロード |
| `writing.taiPdfChu` | Tải PDF ({count} chữ) | PDF をダウンロード（{count} 字） |
| `writing.taoPhieuTapViet` | Tạo phiếu tập viết tay, in ra giấy (PDF hoặc Word). | 手書き練習シートを作って印刷できます（PDF または Word）。 |
| `writing.trangTruoc` | Trang trước | 前のページ |
| `writing.xemTruoc` | Xem trước | プレビュー |
| `writing.xemTruocTrang` | Xem trước trang {v}/{length}: {title} | ページ {v}/{length} のプレビュー：{title} |

## writingSheetLink

| Khóa | Tiếng Việt | 日本語 |
|---|---|---|
| `writingSheetLink.taoPhieuLuyenViet` | Tạo phiếu luyện viết | 練習シートを作成 |
