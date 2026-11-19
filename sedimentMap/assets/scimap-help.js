/* SCIMAP dashboard — the Help view.
 *
 * The approach, the views and the caveats are prose in index.html. This adds
 * what changes from one export to the next: a card for each layer actually in
 * this dashboard, saying what it shows and how to use it, with a button that
 * puts it on the map. */
(function (global) {
  'use strict';

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* How to use each raster the Create Web Dashboard tool names (its
   * RASTER_SLOTS, CONNECTED_RISK and CATEGORICAL_SLOTS). What each one *is*
   * comes from the layer's own description, written by the plugin, so the
   * two never disagree. */
  var RASTER_USES = {
    erosion:
      'Points to source measures — keeping the ground covered, soil ' +
      'management, a change of land use — on the steepest, most vulnerable ' +
      'ground. On its own it overstates the problem: erodible land that is ' +
      'poorly connected rarely delivers to the river, so read it alongside ' +
      'connectivity.',
    connectivity:
      'Points to pathway measures. High values trace the flow routes, hollows ' +
      'and field corners where runoff gathers on its way to the channel — ' +
      'where buffer strips, hedges, ponds or breaking up a flow route will ' +
      'intercept it. Poorly connected land matters little for the river, ' +
      'however much it erodes.',
    erosion_x_connectivity:
      'The map to target work on the land from. Its top 5% makes up the ' +
      'critical source areas (Analysis, Where to act first). Compare the two ' +
      'layers it is made from to see whether a hot spot needs source or ' +
      'pathway measures.',
    network_index:
      'A baseline set by the shape of the land alone. Where it differs from ' +
      'Network connectivity, the run’s other inputs are changing which land ' +
      'connects to the river.',
    flood_mean:
      'Places to look first for natural flood management: slowing, storing ' +
      'or soaking up water there does most for the flood downstream.',
    flood_stdev:
      'Read it with the mean. A high mean with low variability is a robust ' +
      'target whichever way the storm tracks; high variability means the ' +
      'benefit depends on where the rain falls.',
    landcover:
      'The assumption behind the run, mapped: the risk weight given to each ' +
      'land cover (the full list is under Provenance). Set beside Erosion ' +
      'risk, it shows whether a hot spot comes from the land use or the ' +
      'terrain — and only the land use can be changed.',
    nbs_priority:
      'Where to look first for nature-based solutions. The recommended ' +
      'measure layers say which measure suits each place.',
    nbs_option_1:
      'What to do where. Read it with NbS priority to decide where a measure ' +
      'is worth the effort.',
    nbs_option_2:
      'An alternative where the first choice does not suit the land or the ' +
      'landowner.',
    nbs_option_3:
      'A further alternative where neither of the first two suits.',
    nbs_leaf:
      'Why each cell got its recommendation. Useful for checking or ' +
      'explaining a recommendation to someone else.',
    nbs_position:
      'The setting the recommendations depend on, and a quick check that the ' +
      'terrain analysis has found the valleys and floodplains where you ' +
      'expect them.'
  };

  /* The feature layers, in the order the rail lists them. */
  var FEATURES = [
    {name: 'streams', label: 'In-stream risk concentration',
     what: 'Every reach of the river network, coloured and thickened by its ' +
           'in-channel risk concentration: the headline SCIMAP result.',
     use: 'Start here. The thickest, brightest reaches are where to look ' +
          'upstream for the source. Click a reach for its value, rank and ' +
          'length; Analysis, Priority reaches, lists the highest.'},
    {name: 'priorityAreas', label: 'Critical source areas',
     what: 'Patches of the catchment’s top 5% of land by erosion risk × ' +
           'connectivity, numbered largest first. The outline colour says ' +
           'what makes each one critical.',
     use: 'The short list of places to visit. Analysis, Where to act first, ' +
          'gives each area’s size, its share of the risk and its scores.'},
    {name: 'catchment', label: 'Catchment boundary',
     what: 'The land draining to the outlet. Everything SCIMAP analysed lies ' +
           'inside it.'},
    {name: 'points', label: 'Stream risk points',
     what: 'Channel cells with their in-channel risk, one point each. There ' +
           'are many, so they start switched off.',
     use: 'Finer-grained than the reaches: they show where along a reach the ' +
          'risk steps up, such as below a tributary.'},
    {name: 'pourPoint', label: 'Pour point',
     what: 'The outlet the catchment was delineated to.'}
  ];

  /* Source or pathway: the colours of the critical source area outlines. */
  var DRIVER_HELP = {
    connectivity: 'well connected: pathway measures',
    erosion: 'prone to erosion: source measures',
    both: 'both: source and pathway together'
  };

  var options = {};

  /** Fill the Help view. *opts.show(kind, key)* puts a layer on the map. */
  function build(opts) {
    options = opts || {};
    var layers = global.SCIMAP.rasterLayers();
    fillLayers(document.getElementById('help-layer-list'), layers);
    fillFeatures(document.getElementById('help-feature-list'));
    fillFlowRamps();
    fillConditionals(layers);
    wireContents();
  }

  function fillLayers(host, layers) {
    if (!host) return;
    host.innerHTML = '';
    if (!layers.length) {
      host.appendChild(make('p', 'panel-note', 'This export has no raster layers.'));
      return;
    }
    layers.forEach(function (layer) {
      var card = layerCard(layer.label, 'raster', layer.key);
      card.appendChild(global.SCIMAP_REPORT.layerLegend(layer));
      var what = layer.description ||
        'A layer added to this dashboard alongside the SCIMAP results.';
      paragraph(card, 'What it shows', what);
      if (RASTER_USES[layer.key]) paragraph(card, 'How to use it', RASTER_USES[layer.key]);
      host.appendChild(card);
    });
  }

  function fillFeatures(host) {
    if (!host) return;
    host.innerHTML = '';
    var shown = FEATURES.filter(function (feature) {
      return global.SCIMAP_MAP2D.hasVector(feature.name);
    });
    var heading = document.getElementById('help-feature-heading');
    if (heading) heading.classList.toggle('gone', !shown.length);
    shown.forEach(function (feature) {
      var card = layerCard(feature.label, 'vector', feature.name);
      if (feature.name === 'streams' || feature.name === 'points') {
        card.appendChild(global.SCIMAP_REPORT.streamLegend(
          (global.SCIMAP_VECTORS || {})[feature.name]));
      }
      paragraph(card, 'What it shows', feature.what);
      if (feature.name === 'priorityAreas') card.appendChild(driverKey());
      if (feature.use) paragraph(card, 'How to use it', feature.use);
      host.appendChild(card);
    });
  }

  function layerCard(title, kind, key) {
    var card = make('article', 'help-layer');
    var head = make('div', 'help-layer-head');
    head.appendChild(make('h3', null, title));
    var button = make('button', 'ghost help-show', 'Show on map');
    button.title = kind === 'raster'
      ? 'Switch this layer on, and the other result layers off, and go to the map'
      : 'Switch these features on and go to the map';
    button.addEventListener('click', function () {
      if (options.show) options.show(kind, key);
    });
    head.appendChild(button);
    card.appendChild(head);
    return card;
  }

  function paragraph(card, lead, text) {
    var p = make('p', 'help-text');
    p.appendChild(make('b', null, lead + '. '));
    p.appendChild(document.createTextNode(text));
    card.appendChild(p);
  }

  function driverKey() {
    var list = make('ul', 'help-drivers');
    Object.keys(global.SCIMAP.DRIVERS).forEach(function (name) {
      var item = make('li');
      item.appendChild(make('span', 'driver-swatch driver-' + name));
      item.appendChild(make('b', null, global.SCIMAP.driverOf(name).label));
      item.appendChild(document.createTextNode('— ' + DRIVER_HELP[name]));
      list.appendChild(item);
    });
    return list;
  }

  /** Under each step of the method, the colours it has on the map. */
  function fillFlowRamps() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ramp-layer]'), function (bar) {
      var key = bar.getAttribute('data-ramp-layer');
      var ramp = null;
      if (key === 'streams') {
        if (global.SCIMAP_MAP2D.hasVector('streams')) ramp = 'plasma';
      } else if (global.SCIMAP.layerByKey(key)) {
        ramp = global.SCIMAP.rampFor(key);
      }
      bar.classList.toggle('gone', !ramp);
      if (ramp) bar.style.background = global.SCIMAP.rampCss(ramp);
    });
  }

  /** Sentences that only hold for some exports. */
  function fillConditionals(layers) {
    var meta = global.SCIMAP_META || {};
    var has = function (key) { return layers.some(function (l) { return l.key === key; }); };
    var nbs = layers.some(function (layer) { return layer.key.indexOf('nbs_') === 0; });
    toggle('online', !!meta.onlineBasemaps);
    toggle('nbs', nbs);
    toggle('flood', has('flood_mean') || has('flood_stdev'));

    describeCells(meta);
  }

  /** The dashboard's cell size, from its grid, and the results' own where the
   * export made the grid coarser to keep the page light. */
  function describeCells(meta) {
    var host = document.getElementById('help-cell-text');
    var grid = global.SCIMAP_GRID;
    if (!host || !grid || !grid.pixelSize3857) return;
    var scale = grid.mercatorScale || 1;
    var cell = grid.pixelSize3857[0] * scale;
    var source = grid.sourcePixel3857 ? grid.sourcePixel3857 * scale : null;
    var text = 'The dashboard’s cells are about ' + metres(cell) + ' across';
    var coarser = source && cell > source * 1.1;
    if (coarser) {
      text += ', coarser than the ' + metres(source) + ' the results were ' +
              'made at, to keep the page light.';
    } else if (source) {
      text += ', the resolution the results were made at.';
    } else {
      text += '.';
    }
    text += ' Anything smaller than a cell, such as a narrow buffer strip, is ' +
            'averaged in with its surroundings';
    text += coarser && (meta.downloads || []).length
      ? '; the files under Data keep the full resolution.' : '.';
    host.textContent = text;
  }

  function metres(value) {
    return (value < 10 ? Math.round(value * 10) / 10 : Math.round(value)) + ' m';
  }

  function toggle(flag, on) {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-help-if="' + flag + '"]'),
      function (node) { node.classList.toggle('gone', !on); });
  }

  /** The contents list scrolls the view rather than changing the URL hash,
   * which names the open tab. */
  function wireContents() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-help-target]'), function (button) {
      if (button.dataset.wired) return;
      button.dataset.wired = 'yes';
      button.addEventListener('click', function () {
        var target = document.getElementById(button.getAttribute('data-help-target'));
        if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
      });
    });
  }

  global.SCIMAP_HELP = {build: build};
})(window);
