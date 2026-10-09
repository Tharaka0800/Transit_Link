import React from 'react';
import { View } from 'react-native';
import { mapHtml } from './busMapHtml';
export default function BusMap({
  buses
}) {
  return <View style={{
    height: 280
  }}><iframe title="Demo bus map" srcDoc={mapHtml(buses)} style={{
      width: '100%',
      height: '100%',
      border: 0
    }} /></View>;
}
