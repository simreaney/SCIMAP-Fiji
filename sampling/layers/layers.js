var wms_layers = [];


        var lyr_ESRISatellite_0 = new ol.layer.Tile({
            'title': 'ESRI Satellite',
            'type':'base',
            'opacity': 1.000000,
            
            
            source: new ol.source.XYZ({
            attributions: ' ',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            })
        });
var format_FijiFieldworkLocationsfiji_fieldwork_locations_1 = new ol.format.GeoJSON();
var features_FijiFieldworkLocationsfiji_fieldwork_locations_1 = format_FijiFieldworkLocationsfiji_fieldwork_locations_1.readFeatures(json_FijiFieldworkLocationsfiji_fieldwork_locations_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_FijiFieldworkLocationsfiji_fieldwork_locations_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_FijiFieldworkLocationsfiji_fieldwork_locations_1.addFeatures(features_FijiFieldworkLocationsfiji_fieldwork_locations_1);
var lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_FijiFieldworkLocationsfiji_fieldwork_locations_1, 
                style: style_FijiFieldworkLocationsfiji_fieldwork_locations_1,
                popuplayertitle: 'Fiji Fieldwork Locations — fiji_fieldwork_locations',
                interactive: true,
                title: '<img src="styles/legend/FijiFieldworkLocationsfiji_fieldwork_locations_1.png" /> Fiji Fieldwork Locations — fiji_fieldwork_locations'
            });

lyr_ESRISatellite_0.setVisible(true);lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1.setVisible(true);
var layersList = [lyr_ESRISatellite_0,lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1];
lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1.set('fieldAliases', {'fid': 'fid', 'id': 'id', 'Name': 'Name', 'description': 'description', 'timestamp': 'timestamp', 'begin': 'begin', 'end': 'end', 'altitudeMode': 'altitudeMode', 'tessellate': 'tessellate', 'extrude': 'extrude', 'visibility': 'visibility', 'drawOrder': 'drawOrder', 'icon': 'icon', });
lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1.set('fieldImages', {'fid': 'TextEdit', 'id': 'TextEdit', 'Name': 'TextEdit', 'description': 'TextEdit', 'timestamp': 'DateTime', 'begin': 'DateTime', 'end': 'DateTime', 'altitudeMode': 'TextEdit', 'tessellate': 'Range', 'extrude': 'Range', 'visibility': 'Range', 'drawOrder': 'Range', 'icon': 'TextEdit', });
lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1.set('fieldLabels', {'fid': 'no label', 'id': 'no label', 'Name': 'inline label - always visible', 'description': 'no label', 'timestamp': 'no label', 'begin': 'no label', 'end': 'no label', 'altitudeMode': 'no label', 'tessellate': 'no label', 'extrude': 'no label', 'visibility': 'no label', 'drawOrder': 'no label', 'icon': 'no label', });
lyr_FijiFieldworkLocationsfiji_fieldwork_locations_1.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});