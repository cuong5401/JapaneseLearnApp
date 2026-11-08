import { expect, test, type Page } from "@playwright/test";

/** Vẽ tay để tìm chữ Hán: vẽ 日 bằng chuột → ứng viên 日 (NHẬT) → chọn → ô tìm là 日, có kết quả. */

const WIDTHS = [390, 1280];

/** Các nét của 日 theo tỉ lệ khung (0–1): sổ trái, ngang + sổ phải, ngang giữa, ngang đáy. */
const HI: [number, number][][] = [
  [
    [0.25, 0.12],
    [0.25, 0.9],
  ],
  [
    [0.25, 0.12],
    [0.75, 0.12],
    [0.75, 0.88],
  ],
  [
    [0.25, 0.5],
    [0.75, 0.5],
  ],
  [
    [0.25, 0.88],
    [0.75, 0.88],
  ],
];

/** 本: ngang, sổ, phẩy, mác, ngang ngắn. */
const HON: [number, number][][] = [
  [
    [0.15, 0.3],
    [0.85, 0.3],
  ],
  [
    [0.5, 0.08],
    [0.5, 0.92],
  ],
  [
    [0.48, 0.33],
    [0.15, 0.75],
  ],
  [
    [0.52, 0.33],
    [0.85, 0.75],
  ],
  [
    [0.33, 0.7],
    [0.67, 0.7],
  ],
];

async function draw(page: Page, strokes: [number, number][][]) {
  const pad = page.locator("canvas[data-drawpad]");
  await expect(pad).toBeVisible();
  const box = (await pad.boundingBox())!;
  for (const s of strokes) {
    const [x0, y0] = s[0];
    await page.mouse.move(box.x + x0 * box.width, box.y + y0 * box.height);
    await page.mouse.down();
    for (const [x, y] of s.slice(1))
      await page.mouse.move(box.x + x * box.width, box.y + y * box.height, {
        steps: 12,
      });
    await page.mouse.up();
  }
}

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 844 : 900 } });

    test("Vẽ 日 → chọn ứng viên → tìm được 日 / 日本; vẽ tiếp để ghép chữ", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Vẽ chữ để tìm" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Tìm kiếm" });
      await expect(dialog.locator("[data-handwriting]")).toBeVisible();
      await expect(page.locator("canvas[data-drawpad]")).toHaveCSS(
        "touch-action",
        "none",
      );

      await draw(page, HI);
      const hi = page.locator('[data-candidate="日"]');
      await expect(hi).toBeVisible({ timeout: 20_000 });
      await expect(hi).toContainText("NHẬT");
      await expect(page.locator("[data-candidate]").first()).toHaveAttribute(
        "data-candidate",
        "日",
      );
      expect(
        await page.locator("[data-candidate]").count(),
      ).toBeLessThanOrEqual(10);

      // Hoàn tác một nét: ứng viên cập nhật; vẽ lại nét cuối.
      await page.getByRole("button", { name: "Hoàn tác nét" }).click();
      await draw(page, [HI[3]]);
      await expect(page.locator("[data-candidate]").first()).toHaveAttribute(
        "data-candidate",
        "日",
      );

      await hi.click();
      const input = dialog.getByRole("combobox");
      await expect(input).toHaveValue("日");
      // Khung đã xóa để vẽ chữ tiếp.
      await expect(page.locator("[data-candidate]")).toHaveCount(0);
      await expect(
        dialog.getByRole("option").filter({ hasText: "日本" }).first(),
      ).toBeAttached();

      // Vẽ tiếp 本 → ô tìm thành 日本.
      await draw(page, HON);
      await page.locator('[data-candidate="本"]').click();
      await expect(input).toHaveValue("日本");

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);

      // Đóng bảng vẽ (hộp tìm vẫn mở) → thấy kết quả tìm.
      await page
        .locator("[data-handwriting]")
        .getByRole("button", { name: "Đóng", exact: true })
        .click();
      await expect(page.locator("[data-handwriting]")).toHaveCount(0);
      await expect(
        dialog.getByRole("option").filter({ hasText: "日本" }).first(),
      ).toBeVisible();
    });

    test('"Xem chữ" mở chi tiết; nút "Vẽ chữ" ở trang Kanji', async ({
      page,
    }) => {
      await page.goto("/kanji");
      await page.locator("[data-draw-kanji]").click();
      await draw(page, HI);
      await expect(page.locator('[data-candidate="日"]')).toBeVisible({
        timeout: 20_000,
      });
      await page.getByRole("button", { name: /^Xem chữ/ }).click();
      await expect(page).toHaveURL(/\/kanji\?k=%E6%97%A5/);
      await expect(page.locator('[data-detail-kanji="日"]')).toBeVisible();
    });

    test("Chữ ngoài kanji.json: trang tối giản có từ chứa chữ và nút lưu sổ tay", async ({
      page,
    }) => {
      await page.goto(`/kanji?k=${encodeURIComponent("璃")}`);
      const detail = page.locator('[data-detail-char="璃"]');
      await expect(detail).toBeVisible();
      await expect(detail).toContainText("Chữ ngoài danh sách");
      const bookmark = detail.locator("[data-bookmark]");
      await expect(bookmark).toHaveAttribute("data-bookmark", "ch-7483");
      await bookmark.click();
      await page
        .getByRole("dialog", { name: "Lưu vào sổ tay" })
        .getByRole("checkbox")
        .first()
        .check();
      await page.getByRole("button", { name: "Xong" }).click();
      await page.goto("/notebooks/default");
      await expect(
        page.locator('[data-notebook-item="ch-7483"]'),
      ).toContainText("璃");
    });
  });
}
