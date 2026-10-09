import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { mapHtml } from './busMapHtml';
export default function BusMap({
  buses
}) {
  const [failed, setFailed] = useState(false);
  return <View style={{
    height: 280
  }}>{failed ? <Text>Map unavailable. Check your internet connection. Bus details are available below.</Text> : <WebView source={{
      html: mapHtml(buses)
    }} originWhitelist={['*']} onError={() => setFailed(true)} style={{
      flex: 1
    }} />}</View>;
}
