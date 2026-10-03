// شارح — نوشته‌ی تصویرِ اشتراک‌گذاری («شارح» به نستعلیق + شعار) به PNG شفاف
(function () {
  var ROOT = 'C:/Users/aaal2/project/shaareh/brand/';
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
  function rgb(hex) {
    var c = new RGBColor();
    c.red = parseInt(hex.substr(1, 2), 16);
    c.green = parseInt(hex.substr(3, 2), 16);
    c.blue = parseInt(hex.substr(5, 2), 16);
    return c;
  }
  function text(layer, s, font, size, color) {
    var tf = layer.textFrames.add();
    tf.contents = s;
    tf.textRange.characterAttributes.textFont = app.textFonts.getByName(font);
    tf.textRange.characterAttributes.size = size;
    tf.textRange.characterAttributes.fillColor = rgb(color);
    return tf.createOutline();
  }
  function centerX(item, x) {
    var b = item.geometricBounds;
    item.translate(x - (b[0] + b[2]) / 2, 0);
  }
  try {
    var doc = app.documents.add(DocumentColorSpace.RGB, 1400, 800);
    var layer = doc.layers[0];
    var word = text(layer, '\u0634\u0627\u0631\u062D', 'UrduTypesetting-Bold', 300, '#DCAA52');
    var tag = text(layer, '\u0634\u0631\u062D \u0648 \u062A\u0641\u0633\u06CC\u0631 \u0634\u0639\u0631 \u0648 \u0627\u062F\u0628 \u0641\u0627\u0631\u0633\u06CC', 'Vazir-Medium', 52, '#EADCC0');
    var latin = text(layer, 'S H A A R E H', 'Vazir-Bold', 30, '#A8987D');
    centerX(word, 700);
    centerX(tag, 700);
    centerX(latin, 700);
    var wb = word.geometricBounds;
    var tb = tag.geometricBounds;
    tag.translate(0, wb[3] - 30 - tb[1]);
    tb = tag.geometricBounds;
    var lb = latin.geometricBounds;
    latin.translate(0, tb[3] - 34 - lb[1]);
    var all = [word.geometricBounds, tag.geometricBounds, latin.geometricBounds];
    var u = all[0].slice();
    for (var i = 1; i < all.length; i++) {
      u[0] = Math.min(u[0], all[i][0]);
      u[1] = Math.max(u[1], all[i][1]);
      u[2] = Math.max(u[2], all[i][2]);
      u[3] = Math.min(u[3], all[i][3]);
    }
    doc.artboards[0].artboardRect = [u[0] - 10, u[1] + 10, u[2] + 10, u[3] - 10];
    var png = new ExportOptionsPNG24();
    png.artBoardClipping = true;
    png.transparency = true;
    png.antiAliasing = true;
    png.horizontalScale = 100;
    png.verticalScale = 100;
    doc.exportFile(new File(ROOT + 'export/og-text.png'), ExportType.PNG24, png);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    return 'ok';
  } catch (e) {
    return 'ERR line ' + e.line + ': ' + e;
  }
})();
