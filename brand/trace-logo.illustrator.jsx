// شارح — تبدیلِ لوگوی shaareh.ir به برداری در Adobe Illustrator (Image Trace)
// ورودی: brand/source/shaareh-hires.png (خروجیِ prepare-logo.photoshop.jsx)
// خروجی: brand/shaareh-logo.ai — گروهِ برداری با نامِ shaareh-logo روی یک آرت‌بورد
(function () {
  var ROOT = 'C:/Users/aaal2/project/shaareh/brand/';
  var log = [];
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
  function set(obj, key, value) {
    try {
      obj[key] = value;
    } catch (e) {
      log.push('skip ' + key + ': ' + e);
    }
  }
  try {
    var doc = app.documents.add(DocumentColorSpace.RGB, 1200, 1500);
    var placed = doc.placedItems.add();
    placed.file = new File(ROOT + 'source/shaareh-hires.png');
    var traced = placed.trace();
    var opt = traced.tracing.tracingOptions;
    set(opt, 'tracingMode', TracingModeType.TRACINGMODEBLACKANDWHITE);
    set(opt, 'threshold', 128);
    set(opt, 'ignoreWhite', true);
    set(opt, 'fills', true);
    set(opt, 'strokes', false);
    set(opt, 'pathFidelity', 80);
    set(opt, 'cornerFidelity', 75);
    set(opt, 'noiseFidelity', 40);
    set(opt, 'tracingMethod', TracingMethodType.TRACINGMETHODABUTTING);
    app.redraw();
    var group = traced.tracing.expandTracing();
    group.name = 'shaareh-logo';
    log.push('expanded: ' + group.typename + ' items=' + group.pageItems.length);

    // اندازه‌ی استاندارد: ارتفاع ۱۰۰۰ واحد، وسطِ آرت‌بورد
    var b = group.geometricBounds;
    var s = (1000 / (b[1] - b[3])) * 100;
    group.resize(s, s, true, true, true, true, s);
    var ab = doc.artboards[0].artboardRect;
    b = group.geometricBounds;
    group.translate((ab[0] + ab[2]) / 2 - (b[0] + b[2]) / 2, (ab[1] + ab[3]) / 2 - (b[1] + b[3]) / 2);
    b = group.geometricBounds;
    doc.artboards[0].artboardRect = [b[0] - 40, b[1] + 40, b[2] + 40, b[3] - 40];
    doc.artboards[0].name = 'shaareh-logo';

    // فهرستِ قطعه‌ها (برای رنگ‌آمیزیِ جداگانه)
    function walk(it, depth) {
      var g = it.geometricBounds;
      log.push(new Array(depth + 1).join('  ') + it.typename + ' w=' + Math.round(g[2] - g[0]) + ' h=' + Math.round(g[1] - g[3]) + ' L=' + Math.round(g[0] - b[0]) + ' T=' + Math.round(b[1] - g[1]));
      if (it.typename === 'GroupItem' && depth < 2) for (var i = 0; i < it.pageItems.length; i++) walk(it.pageItems[i], depth + 1);
      if (it.typename === 'CompoundPathItem') log.push(new Array(depth + 2).join('  ') + 'subpaths=' + it.pathItems.length);
    }
    walk(group, 0);

    var opts = new IllustratorSaveOptions();
    opts.pdfCompatible = true;
    doc.saveAs(new File(ROOT + 'shaareh-logo.ai'), opts);
    log.push('saved');
  } catch (e) {
    log.push('ERR line ' + e.line + ': ' + e);
  }
  return log.join('\n');
})();
