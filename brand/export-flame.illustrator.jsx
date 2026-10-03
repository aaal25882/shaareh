// شارح — بیرون کشیدنِ شعله‌ی لوگو (نسخه‌ی رنگی) به یک SVG جدا برای آیکنِ «فالِ شارح»
(function () {
  var ROOT = 'C:/Users/aaal2/project/shaareh/brand/';
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
  try {
    var src = app.open(new File(ROOT + 'shaareh-logo.ai'));
    var g = src.groupItems.getByName('shaareh-logo-color');
    var gb = g.geometricBounds;
    var flame = null;
    for (var i = 0; i < g.pageItems.length; i++) {
      var b = g.pageItems[i].geometricBounds;
      if (gb[1] - b[1] < 5 && g.pageItems[i].typename !== 'CompoundPathItem') flame = g.pageItems[i];
    }
    if (!flame) return 'ERR flame not found';
    var doc = app.documents.add(DocumentColorSpace.RGB, 400, 400);
    var copy = flame.duplicate(doc.layers[0], ElementPlacement.PLACEATBEGINNING);
    var fb = copy.geometricBounds;
    doc.artboards[0].artboardRect = [fb[0] - 4, fb[1] + 4, fb[2] + 4, fb[3] - 4];
    var svg = new ExportOptionsSVG();
    svg.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;
    svg.coordinatePrecision = 1;
    svg.documentEncoding = SVGDocumentEncoding.UTF8;
    doc.exportFile(new File(ROOT + 'export/flame.svg'), ExportType.SVG, svg);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    src.close(SaveOptions.DONOTSAVECHANGES);
    return 'ok ' + Math.round(fb[2] - fb[0]) + 'x' + Math.round(fb[1] - fb[3]);
  } catch (e) {
    return 'ERR line ' + e.line + ': ' + e;
  }
})();
