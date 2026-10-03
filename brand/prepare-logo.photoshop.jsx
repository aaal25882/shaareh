// شارح — آماده‌سازی لوگوی shaareh.ir در Photoshop برای ردگیری برداری
// ورودی: brand/source/shaareh-original.png (558×722، پس‌زمینه‌ی شفاف)
// خروجی: brand/source/shaareh-hires.png — چهار برابر بزرگ‌تر، سیاه‌وسفید با لبه‌های تمیز
(function () {
  var ROOT = 'C:/Users/aaal2/project/shaareh/brand/source/';
  try {
    app.preferences.rulerUnits = Units.PIXELS;
    app.displayDialogs = DialogModes.NO;
    var doc = app.open(new File(ROOT + 'shaareh-original.png'));
    if (doc.mode != DocumentMode.RGB) doc.changeMode(ChangeMode.RGB);

    // زمینه‌ی سفید زیر لوگو
    var art = doc.activeLayer;
    var bg = doc.artLayers.add();
    bg.move(art, ElementPlacement.PLACEAFTER);
    doc.activeLayer = bg;
    var white = new SolidColor();
    white.rgb.hexValue = 'FFFFFF';
    doc.selection.selectAll();
    doc.selection.fill(white);
    doc.selection.deselect();
    doc.flatten();

    // بزرگ‌نمایی ۴× و صاف کردنِ پله‌پله‌گیِ لبه‌ها پیش از آستانه
    var w = doc.width.as('px') * 4;
    var h = doc.height.as('px') * 4;
    doc.resizeImage(UnitValue(w, 'px'), UnitValue(h, 'px'), doc.resolution, ResampleMethod.BICUBICSMOOTHER);
    doc.activeLayer.applyGaussianBlur(2.2);
    doc.activeLayer.threshold(128);
    doc.resizeCanvas(UnitValue(w + 240, 'px'), UnitValue(h + 240, 'px'), AnchorPosition.MIDDLECENTER);

    doc.saveAs(new File(ROOT + 'shaareh-hires.png'), new PNGSaveOptions(), true, Extension.LOWERCASE);
    var size = doc.width.as('px') + 'x' + doc.height.as('px');
    doc.close(SaveOptions.DONOTSAVECHANGES);
    return 'ok ' + size;
  } catch (e) {
    return 'ERR line ' + e.line + ': ' + e;
  }
})();
