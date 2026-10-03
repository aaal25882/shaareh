// شارح — نسخه‌های رنگیِ لوگوی shaareh.ir در Adobe Illustrator
// ورودی: brand/shaareh-logo.ai (خروجیِ trace-logo.illustrator.jsx) — شکلِ لوگو دست نمی‌خورد، فقط رنگ‌آمیزی می‌شود.
// خروجی: آرت‌بوردهای color / ink / light / app-icon در همان فایل + SVG و PNG در brand/export
(function () {
  var ROOT = 'C:/Users/aaal2/project/shaareh/brand/';
  var log = [];
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

  var C = {
    ink: '#1B1610',
    paper: '#F3EADB',
    flameA: '#F6CF6A',
    flameB: '#E0573A',
    goldA: '#F0CB7C',
    goldB: '#B7801F',
    turqA: '#3CC2B5',
    turqB: '#14857F',
    lapisA: '#2A5DB0',
    lapisB: '#13306A',
    tileA: '#221A12',
    tileB: '#120E0A',
    rule: '#D9A441'
  };

  function rgb(hex) {
    var c = new RGBColor();
    c.red = parseInt(hex.substr(1, 2), 16);
    c.green = parseInt(hex.substr(3, 2), 16);
    c.blue = parseInt(hex.substr(5, 2), 16);
    return c;
  }
  function grad(doc, name, a, b, angle) {
    var g = doc.gradients.add();
    g.name = name;
    g.type = GradientType.LINEAR;
    g.gradientStops[0].color = rgb(a);
    g.gradientStops[0].rampPoint = 0;
    g.gradientStops[1].color = rgb(b);
    g.gradientStops[1].rampPoint = 100;
    var gc = new GradientColor();
    gc.gradient = g;
    return gc;
  }
  function paintAll(item, color) {
    if (item.typename === 'PathItem') {
      item.filled = true;
      item.fillColor = color;
      item.stroked = false;
    } else if (item.typename === 'CompoundPathItem') {
      for (var i = 0; i < item.pathItems.length; i++) paintAll(item.pathItems[i], color);
    } else if (item.typename === 'GroupItem') {
      for (var j = 0; j < item.pageItems.length; j++) paintAll(item.pageItems[j], color);
    }
  }
  /** قطعه‌های لوگو را از روی جایشان می‌شناسد */
  function parts(group) {
    var gb = group.geometricBounds;
    var p = { flame: null, torch: null, slot: null, leafL: null, leafR: null, base: null };
    for (var i = 0; i < group.pageItems.length; i++) {
      var it = group.pageItems[i];
      var b = it.geometricBounds;
      var w = b[2] - b[0];
      var top = gb[1] - b[1];
      var left = b[0] - gb[0];
      var gw = gb[2] - gb[0];
      if (it.typename === 'CompoundPathItem') p.torch = it;
      else if (w > gw * 0.9) p.base = it;
      else if (top < 5) p.flame = it;
      else if (w < gw * 0.06) p.slot = it;
      else if (left < gw * 0.3) p.leafL = it;
      else p.leafR = it;
    }
    return p;
  }
  function fit(item, x, y, h) {
    var b = item.geometricBounds;
    var s = (h / (b[1] - b[3])) * 100;
    item.resize(s, s, true, true, true, true, s);
    b = item.geometricBounds;
    item.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
  }

  try {
    var doc = app.open(new File(ROOT + 'shaareh-logo.ai'));
    var src = doc.groupItems.getByName('shaareh-logo');
    var ab0 = doc.artboards[0].artboardRect;
    var W = ab0[2] - ab0[0];
    var H = ab0[1] - ab0[3];
    var GAP = 200;

    var flame = grad(doc, 'Shaareh Flame', C.flameA, C.flameB);
    var gold = grad(doc, 'Shaareh Gold', C.goldA, C.goldB);
    var turq = grad(doc, 'Shaareh Turquoise', C.turqA, C.turqB);
    var lapis = grad(doc, 'Shaareh Lapis', C.lapisA, C.lapisB);
    var tileG = grad(doc, 'Shaareh Ink Tile', C.tileA, C.tileB);

    function variant(name, index, colors) {
      var L = ab0[0] + index * (W + GAP);
      var ab = index === 0 ? doc.artboards[0] : doc.artboards.add([L, ab0[1], L + W, ab0[3]]);
      if (index === 0) ab.artboardRect = [L, ab0[1], L + W, ab0[3]];
      ab.name = name;
      var g = index === 0 ? src : src.duplicate(doc.layers[0], ElementPlacement.PLACEATEND);
      if (index !== 0) g.translate(index * (W + GAP), 0);
      g.name = 'shaareh-logo-' + name;
      var p = parts(g);
      paintAll(p.flame, colors.flame);
      paintAll(p.torch, colors.torch);
      paintAll(p.slot, colors.slot);
      paintAll(p.leafL, colors.leaves);
      paintAll(p.leafR, colors.leaves);
      paintAll(p.base, colors.base);
      return g;
    }

    // ۱) رنگی — پالتِ نگارگری و کاشیِ ایرانی
    variant('color', 0, { flame: flame, torch: gold, slot: gold, leaves: turq, base: lapis });
    // ۲) مرکبی با شعله‌ی زرین — برای زمینه‌ی روشن
    variant('ink', 1, { flame: flame, torch: rgb(C.ink), slot: rgb(C.ink), leaves: rgb(C.ink), base: rgb(C.ink) });
    // ۳) کاغذی با شعله‌ی زرین — برای زمینه‌ی تیره
    variant('light', 2, { flame: flame, torch: rgb(C.paper), slot: rgb(C.paper), leaves: rgb(C.paper), base: rgb(C.paper) });
    log.push('variants ok');

    // ۴) آیکن: کاشیِ مرکبی با جدول‌کشیِ زرین و لوگوی رنگی
    var S = 1024;
    var L4 = ab0[0] + 3 * (W + GAP);
    var T4 = ab0[1];
    var ab4 = doc.artboards.add([L4, T4, L4 + S, T4 - S]);
    ab4.name = 'app-icon';
    var layer = doc.layers[0];
    var tile = layer.pathItems.roundedRectangle(T4, L4, S, S, 220, 220);
    paintAll(tile, tileG);
    var r1 = layer.pathItems.roundedRectangle(T4 - 52, L4 + 52, S - 104, S - 104, 172, 172);
    r1.filled = false;
    r1.stroked = true;
    r1.strokeColor = rgb(C.rule);
    r1.strokeWidth = 7;
    var r2 = layer.pathItems.roundedRectangle(T4 - 70, L4 + 70, S - 140, S - 140, 156, 156);
    r2.filled = false;
    r2.stroked = true;
    r2.strokeColor = rgb(C.rule);
    r2.strokeWidth = 2.5;
    r2.opacity = 70;
    var icon = src.duplicate(layer, ElementPlacement.PLACEATBEGINNING);
    icon.name = 'shaareh-logo-icon';
    var ip = parts(icon);
    paintAll(ip.flame, flame);
    paintAll(ip.torch, gold);
    paintAll(ip.slot, gold);
    paintAll(ip.leafL, turq);
    paintAll(ip.leafR, turq);
    paintAll(ip.base, rgb(C.paper));
    fit(icon, L4 + S / 2, T4 - S / 2 + 8, S * 0.62);
    log.push('icon ok');

    doc.save();
    log.push('saved');

    var exportDir = new Folder(ROOT + 'export');
    if (!exportDir.exists) exportDir.create();
    for (var i = 0; i < doc.artboards.length; i++) {
      doc.artboards.setActiveArtboardIndex(i);
      var png = new ExportOptionsPNG24();
      png.artBoardClipping = true;
      png.transparency = true;
      png.antiAliasing = true;
      png.horizontalScale = 100;
      png.verticalScale = 100;
      doc.exportFile(new File(ROOT + 'export/logo-' + doc.artboards[i].name + '.png'), ExportType.PNG24, png);
    }
    log.push('png ok');

    var svg = new ExportOptionsSVG();
    svg.saveMultipleArtboards = true;
    svg.artboardRange = '';
    svg.fontType = SVGFontType.OUTLINEFONT;
    svg.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;
    svg.coordinatePrecision = 1;
    svg.documentEncoding = SVGDocumentEncoding.UTF8;
    doc.exportFile(new File(ROOT + 'export/logo.svg'), ExportType.SVG, svg);
    log.push('svg ok');
  } catch (e) {
    log.push('ERR line ' + e.line + ': ' + e);
  }
  return log.join('\n');
})();
