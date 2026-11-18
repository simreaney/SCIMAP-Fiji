/* SCIMAP dashboard — the report: every layer on a map of its own for print,
 * and the same report as Markdown.
 *
 * Markdown cannot carry images itself, so "Save as Markdown" hands over a zip:
 * the report, with its maps as JPEG files beside it in maps/. Every map is
 * composited from the embedded data (SCIMAP_MAP2D.renderStaticMap), never
 * read back from the tiles, which a file:// page cannot do, at the "report"
 * size: 2400 pixels along its longer side, about 300 dpi across a page.
 */
(function (global) {
  'use strict';

  /** One of the report's maps, as a JPEG data URI: *layers* each drawn
   * alone, or without them the map as it is on screen. JPEG because a risk
   * surface is noise to PNG's compression: about 11 MB a map against 2.6 MB. */
  function reportMap(layers) {
    return global.SCIMAP_MAP2D.renderStaticMap('report', {jpeg: true, layers: layers});
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fmt(value, digits) { return global.SCIMAP.formatValue(value, digits); }

  /** A latitude or longitude: fixed decimals, even next to the meridian. */
  function coord(value) {
    return value === null || value === undefined || !isFinite(value) ? '' : value.toFixed(5);
  }

  // ── legends ─────────────────────────────────────────────────────────────

  /** A raster layer's legend: its ramp and range, or one chip per class. */
  function layerLegend(layer) {
    var box = make('div', 'layer-legend');
    if (layer.classes) {
      var classes = make('div', 'legend-classes');
      layer.classes.forEach(function (cls) {
        var entry = make('div', 'legend-class');
        var chip = make('span', 'legend-chip');
        chip.style.background = cls.colour;
        entry.appendChild(chip);
        entry.appendChild(make('span', null, cls.label));
        classes.appendChild(entry);
      });
      box.appendChild(classes);
      return box;
    }
    var swatch = make('div', 'legend');
    swatch.style.background = global.SCIMAP.rampCss(global.SCIMAP.rampFor(layer.key));
    box.appendChild(swatch);
    var scale = make('div', 'legend-scale');
    scale.appendChild(make('span', null, fmt(layer.vmin, 3)));
    if (layer.units) scale.appendChild(make('span', 'legend-units', layer.units));
    scale.appendChild(make('span', null, fmt(layer.vmax, 3)));
    box.appendChild(scale);
    return box;
  }

  /** The 5-95% stretch the reaches and stream risk points are coloured over. */
  function riskStretch(collection) {
    return (collection || {}).riskStretch || (collection || {}).riskRange || [0, 1];
  }

  /** The colour ramp the reaches and stream risk points are drawn with. */
  function streamLegend(collection) {
    var stretch = riskStretch(collection);
    var legend = make('div', 'vector-legend');
    legend.title = 'From the 5th to the 95th percentile of in-stream risk; ' +
      'values beyond take the end colours.';
    var swatch = make('div', 'legend');
    swatch.style.background = global.SCIMAP.rampCss('plasma');
    legend.appendChild(swatch);
    var scale = make('div', 'legend-scale');
    scale.appendChild(make('span', null, fmt(stretch[0], 3)));
    scale.appendChild(make('span', null, fmt(stretch[1], 3)));
    legend.appendChild(scale);
    return legend;
  }

  /** The stream network drawn on the maps, if it is switched on. */
  function shownStreams() {
    var vectors = global.SCIMAP_VECTORS || {};
    var streams = vectors.streams;
    if (!streams || !(streams.features || []).length) return null;
    return global.SCIMAP.state.vectors.streams ? streams : null;
  }

  // ── print: every layer on a map of its own ──────────────────────────────

  /** One map per raster layer, each with its legend, into *host*. */
  function fillPrintLayers(host) {
    host.innerHTML = '';
    var layers = global.SCIMAP.rasterLayers();
    if (!layers.length) return;
    host.appendChild(make('h2', 'print-heading', 'Every result layer'));
    var streams = shownStreams();
    layers.forEach(function (layer) {
      var url = reportMap([layer]);
      if (!url) return;
      var figure = make('figure', 'print-figure');
      figure.appendChild(make('h3', null, layer.label));
      var image = document.createElement('img');
      image.src = url;
      image.alt = 'Map of ' + layer.label;
      figure.appendChild(image);
      var key = make('div', 'print-key');
      key.appendChild(layerLegend(layer));
      if (streams) {
        var stream = make('div', 'print-stream-key');
        stream.appendChild(make('span', null, 'In-stream risk concentration'));
        stream.appendChild(streamLegend(streams));
        key.appendChild(stream);
      }
      figure.appendChild(key);
      if (layer.description) figure.appendChild(make('p', 'print-caption', layer.description));
      host.appendChild(figure);
    });
  }

  // ── Markdown ────────────────────────────────────────────────────────────

  /** Inline text, with the characters Markdown would act on escaped. */
  function esc(text) {
    return String(text === null || text === undefined ? '' : text)
      .replace(/\s+/g, ' ')
      .replace(/([\\`*_[\]<>|#])/g, '\\$1');
  }

  function table(lines, header, rows) {
    if (!rows.length) return;
    lines.push('| ' + header.map(esc).join(' | ') + ' |');
    lines.push('|' + header.map(function () { return ' --- '; }).join('|') + '|');
    rows.forEach(function (row) {
      lines.push('| ' + row.map(function (cell) {
        return cell === null || cell === undefined || cell === '' ? '—' : esc(cell);
      }).join(' | ') + ' |');
    });
    lines.push('');
  }

  function percent(fraction, digits) {
    if (fraction === null || fraction === undefined || !isFinite(fraction)) return '—';
    return (fraction * 100).toFixed(digits === undefined ? 1 : digits) + '%';
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'layer';
  }

  function dataBytes(url) {
    return global.SCIMAP.base64Bytes(url.slice(url.indexOf(',') + 1));
  }

  function describeDate(iso) {
    var stamp = iso ? new Date(iso) : null;
    return stamp && !isNaN(stamp) ? stamp.toLocaleString() : '';
  }

  /** The report as Markdown, and the map images it links to.
   *
   * *allMaps* adds a map of each raster layer, as the printed report does;
   * without it the report has only the map as it is on screen. */
  function markdownReport(allMaps) {
    var meta = global.SCIMAP_META || {};
    var charts = global.SCIMAP_CHARTS || {};
    var vectors = global.SCIMAP_VECTORS || {};
    var lines = [];
    var images = [];

    function image(name, url, alt) {
      if (!url) return;
      images.push({name: 'maps/' + name, bytes: dataBytes(url)});
      lines.push('![' + esc(alt) + '](maps/' + name + ')', '');
    }

    lines.push('# ' + esc(meta.title || 'SCIMAP results'), '');
    if (meta.subtitle) lines.push(esc(meta.subtitle), '');
    var byline = [meta.organisation, meta.generated ? 'Generated ' + describeDate(meta.generated) : '']
      .filter(Boolean).join(' · ');
    if (byline) lines.push('*' + esc(byline) + '*', '');
    if (meta.disclaimer) lines.push('> ' + esc(meta.disclaimer), '');

    // The map as it is on screen.
    lines.push('## Map', '');
    var shown = global.SCIMAP.drawOrder().slice().reverse().map(function (layer) {
      return layer.label;
    });
    lines.push(esc(shown.length
      ? 'The map as shown on the dashboard: ' + shown.join(', ') + '.'
      : 'The map as shown on the dashboard: the shaded relief.'), '');
    image('00-map.jpg', reportMap(), 'Map of the catchment');

    // Every raster layer.
    var layers = global.SCIMAP.rasterLayers();
    if (layers.length) lines.push('## Result layers', '');
    layers.forEach(function (layer, index) {
      lines.push('### ' + esc(layer.label), '');
      if (layer.description) lines.push(esc(layer.description), '');
      if (allMaps) {
        var number = index + 1 < 10 ? '0' + (index + 1) : String(index + 1);
        image(number + '-' + slug(layer.key) + '.jpg', reportMap([layer]),
              'Map of ' + layer.label);
      }
      if (layer.classes) {
        table(lines, ['Class', 'Colour'], layer.classes.map(function (cls) {
          return [cls.label, cls.colour];
        }));
      } else {
        lines.push(esc('Colours run along the ' + global.SCIMAP.rampFor(layer.key) +
          ' ramp from ' + fmt(layer.vmin, 3) + ' to ' + fmt(layer.vmax, 3) +
          (layer.units ? ' ' + layer.units : '') + ', the 5th to 95th percentile ' +
          'of the layer; values beyond take the end colours.'), '');
        var stats = layer.stats || {};
        table(lines, ['Minimum', 'Maximum', 'Mean', 'Standard deviation'],
              stats.min === undefined ? [] :
              [[fmt(stats.min, 4), fmt(stats.max, 4), fmt(stats.mean, 4), fmt(stats.std, 4)]]);
        var curve = (charts.concentration || {})[layer.key];
        if (curve) {
          if (curve.headline) lines.push(esc(curve.headline), '');
          table(lines, ['Highest-risk share of the catchment', 'Share of the risk it produces'],
                (curve.worst || []).map(function (row) {
                  return ['top ' + row.landPct + '%', row.riskPct + '%'];
                }));
        }
      }
    });

    // The stream network.
    if (vectors.streams && (vectors.streams.features || []).length) {
      var stretch = riskStretch(vectors.streams);
      lines.push('## In-stream risk concentration', '');
      lines.push(esc('The stream network is coloured along the plasma ramp from ' +
        fmt(stretch[0], 3) + ' to ' + fmt(stretch[1], 3) + ', the 5th to 95th ' +
        'percentile of reach risk; values beyond take the end colours.'), '');
      var reaches = charts.topReaches || [];
      if (reaches.length) {
        lines.push('### Priority reaches', '');
        lines.push('The reaches carrying the highest in-channel risk concentration.', '');
        table(lines, ['Rank', 'Risk', 'Length (m)', 'Latitude', 'Longitude'],
              reaches.map(function (row, index) {
                return [index + 1, fmt(row.risk, 4), Math.round(row.lengthM || 0),
                        coord(row.lat), coord(row.lon)];
              }));
      }
    }

    // Critical source areas.
    var areas = charts.priorityAreas;
    if (areas && (areas.areas || []).length) {
      lines.push('## Critical source areas', '');
      lines.push(esc('Land where erosion risk and connectivity to the river are both ' +
        'high, so material is both given up and carried to the channel. Each area is ' +
        'a contiguous patch of the catchment’s top ' +
        Math.round((areas.topFraction || 0.05) * 100) + '% of land by erosion risk × ' +
        'connectivity, largest first. Together they hold ' +
        percent(areas.reportedRiskShare) + ' of the catchment’s source risk' +
        (areas.patches > areas.areas.length
          ? ', and are the largest of ' + areas.patches.toLocaleString() + ' such areas.'
          : '.')), '');
      table(lines, ['#', 'Area (ha)', 'Source risk', 'Connectivity', 'Erosion', 'Driven by',
                    'Latitude', 'Longitude'],
            areas.areas.map(function (area) {
              return [area.rank, fmt(area.areaHa, 1), percent(area.riskShare),
                      fmt(area.connectivity, 2), fmt(area.erosion, 2),
                      global.SCIMAP.driverOf(area.driver).label,
                      coord(area.lat), coord(area.lon)];
            }));
    }

    // The data bundle.
    var downloads = meta.downloads || [];
    if (downloads.length) {
      lines.push('## Data', '');
      lines.push('In the dashboard folder, beside its index.html.', '');
      table(lines, ['File', 'Contents', 'Format', 'Size'], downloads.map(function (entry) {
        return [entry.file, entry.label, entry.format, global.SCIMAP.formatBytes(entry.bytes)];
      }));
    }

    // Provenance, as on the Provenance tab.
    lines.push('## How these results were produced', '');
    var plugin = meta.plugin || {}, run = meta.run || {};
    table(lines, ['Run', 'Details'], [
      ['Algorithm', run.algorithm], ['Generated', describeDate(meta.generated)],
      ['Plugin', [plugin.name, plugin.version].filter(Boolean).join(' ')],
      ['QGIS', plugin.qgis], ['GDAL', plugin.gdal],
      ['Connectivity backend', run.connectivityBackend]
    ].filter(function (row) { return row[1]; }));
    if (meta.weights && Object.keys(meta.weights).length) {
      lines.push('### Land cover risk weights', '');
      table(lines, ['Class', 'Weight'], Object.keys(meta.weights).map(function (key) {
        return [(meta.classNames || {})[key] || 'Class ' + key, meta.weights[key]];
      }));
    }
    if (run.parameters && Object.keys(run.parameters).length) {
      lines.push('### Parameters', '');
      table(lines, ['Parameter', 'Value'], Object.keys(run.parameters).map(function (key) {
        return [key, run.parameters[key]];
      }));
    }
    if ((meta.inputs || []).length) {
      lines.push('### Inputs', '');
      table(lines, ['Role', 'Name', 'CRS', 'Size (px)', 'Pixel size (m)'],
            meta.inputs.map(function (input) {
              return [input.role, input.name, input.crs,
                      input.size ? input.size.join(' × ') : '',
                      input.pixel ? input.pixel.map(function (v) {
                        return Math.abs(v).toFixed(2);
                      }).join(' × ') : ''];
            }));
    }
    if (meta.citation) {
      lines.push('### Method', '');
      lines.push(esc(meta.citation.text || '') +
        (meta.citation.doi ? ' [doi:' + esc(meta.citation.doi) + '](https://doi.org/' +
          meta.citation.doi + ')' : ''), '');
    }
    lines.push('---', '', '*' + esc('Saved from the SCIMAP dashboard on ' +
      new Date().toLocaleString() + '.') + '*', '');

    return {text: lines.join('\n'), images: images};
  }

  // ── zip ─────────────────────────────────────────────────────────────────

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /** A zip of *files* ({name, bytes}), stored rather than deflated: the PNGs
   * are compressed already and the Markdown is small. UTF-8 names. */
  function zip(files) {
    var encoder = new TextEncoder();
    var now = new Date();
    var time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var parts = [], central = [], offset = 0, centralSize = 0;

    files.forEach(function (file) {
      var name = encoder.encode(file.name);
      var data = file.bytes;
      var crc = crc32(data);

      var local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);                  // version needed
      local.setUint16(6, 0x0800, true);              // UTF-8 names
      local.setUint16(8, 0, true);                   // stored
      local.setUint16(10, time, true);
      local.setUint16(12, date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      parts.push(local.buffer, name, data);

      var entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);                  // made by
      entry.setUint16(6, 20, true);                  // version needed
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(10, 0, true);
      entry.setUint16(12, time, true);
      entry.setUint16(14, date, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, data.length, true);
      entry.setUint16(28, name.length, true);
      entry.setUint32(42, offset, true);             // where its local header is
      central.push(entry.buffer, name);
      centralSize += 46 + name.length;
      offset += 30 + name.length + data.length;
    });

    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), {type: 'application/zip'});
  }

  /** The Markdown report and its maps, zipped under one folder named *stem*. */
  function markdownZip(stem, allMaps) {
    var report = markdownReport(allMaps);
    var files = [{name: stem + '/report.md', bytes: new TextEncoder().encode(report.text)}];
    report.images.forEach(function (image) {
      files.push({name: stem + '/' + image.name, bytes: image.bytes});
    });
    return zip(files);
  }

  global.SCIMAP_REPORT = {
    layerLegend: layerLegend, streamLegend: streamLegend,
    fillPrintLayers: fillPrintLayers, reportMap: reportMap,
    markdownReport: markdownReport, markdownZip: markdownZip,
    zip: zip, crc32: crc32
  };
})(window);
