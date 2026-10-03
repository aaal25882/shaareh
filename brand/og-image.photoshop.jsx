// شارح — تصویرِ اشتراک‌گذاری (Open Graph) در Photoshop: ۱۲۰۰×۶۳۰
// زمینه‌ی مرکبی با نورِ گرمِ شعله و بافت + لوگوی رنگی + نوشته (از og-text.illustrator.jsx)
(function () {
  var ROOT = 'C:/Users/aaal2/project/shaareh/';
  function color(hex) {
    var c = new SolidColor();
    c.rgb.hexValue = hex;
    return c;
  }
  /** فایلِ PNG را به‌صورت لایه‌ی تازه در سند می‌گذارد و اندازه و جایش را تنظیم می‌کند */
  function placePng(doc, path, height, cx, cy) {
    var src = app.open(new File(path));
    src.selection.selectAll();
    src.activeLayer.copy();
    src.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
    var layer = doc.paste();
    var b = layer.bounds;
    var h = b[3].as('px') - b[1].as('px');
    var s = (height / h) * 100;
    layer.resize(s, s, AnchorPosition.MIDDLECENTER);
    b = layer.bounds;
    layer.translate(cx - (b[0].as('px') + b[2].as('px')) / 2, cy - (b[1].as('px') + b[3].as('px')) / 2);
    return layer;
  }
  try {
    app.preferences.rulerUnits = Units.PIXELS;
    app.displayDialogs = DialogModes.NO;
    var W = 1200;
    var H = 630;
    var doc = app.documents.add(W, H, 72, 'shaareh-og', NewDocumentMode.RGB, DocumentFill.WHITE);

    // زمینه‌ی مرکبی
    doc.selection.selectAll();
    doc.selection.fill(color('120E0A'));
    doc.selection.deselect();

    // نورِ گرمِ شعله: بیضیِ نرم با تاریِ زیاد
    var glow = doc.artLayers.add();
    glow.name = 'flame glow';
    doc.selection.select([[690, 40], [1110, 40], [1110, 560], [690, 560]], SelectionType.REPLACE, 0, true);
    doc.selection.fill(color('B85A22'));
    doc.selection.deselect();
    glow.applyGaussianBlur(170);
    glow.opacity = 55;

    // بافتِ کاغذ
    var grain = doc.artLayers.add();
    grain.name = 'grain';
    doc.selection.selectAll();
    doc.selection.fill(color('808080'));
    doc.selection.deselect();
    grain.applyAddNoise(9, NoiseDistribution.GAUSSIAN, true);
    grain.blendMode = BlendMode.OVERLAY;
    grain.opacity = 35;

    // جدول‌کشیِ زرین
    var rule = doc.artLayers.add();
    rule.name = 'jadval';
    doc.selection.select([[24, 24], [W - 24, 24], [W - 24, H - 24], [24, H - 24]], SelectionType.REPLACE, 0, false);
    doc.selection.stroke(color('DCAA52'), 2, StrokeLocation.CENTER);
    doc.selection.select([[34, 34], [W - 34, 34], [W - 34, H - 34], [34, H - 34]], SelectionType.REPLACE, 0, false);
    doc.selection.stroke(color('DCAA52'), 1, StrokeLocation.CENTER);
    doc.selection.deselect();
    rule.opacity = 70;

    var logo = placePng(doc, ROOT + 'brand/export/logo-color.png', 440, 900, H / 2);
    logo.name = 'logo';
    var words = placePng(doc, ROOT + 'brand/export/og-text.png', 330, 400, H / 2 + 6);
    words.name = 'wordmark';

    doc.saveAs(new File(ROOT + 'brand/og-image.psd'), new PhotoshopSaveOptions(), true, Extension.LOWERCASE);
    var jpg = new JPEGSaveOptions();
    jpg.quality = 10;
    doc.flatten();
    doc.saveAs(new File(ROOT + 'public/icons/og-image.jpg'), jpg, true, Extension.LOWERCASE);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    return 'ok';
  } catch (e) {
    return 'ERR line ' + e.line + ': ' + e;
  }
})();
