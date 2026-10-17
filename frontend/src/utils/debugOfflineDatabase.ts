import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export async function debugOfflineDatabase(): Promise<void> {
  if (!__DEV__) return;

  try {
    const keys = await AsyncStorage.getAllKeys();
    const records = await AsyncStorage.multiGet(keys);
    const formattedData = records.map(([key, value]) => ({
      Record_Key: key,
      Stored_Value: value,
    }));

    console.log('\n--- ASYNC STORAGE OFFLINE DATABASE ---');
    console.table(formattedData);

    // SDK 51 forwards console.log to Metro, but not native console.table.
    if (Platform.OS !== 'web') {
      const keyWidth = Math.max('Record_Key'.length, ...keys.map((key) => key.length));
      console.log([
        `${'Record_Key'.padEnd(keyWidth)} | Stored_Value`,
        `${'-'.repeat(keyWidth)}-+-------------`,
        ...formattedData.map(({ Record_Key, Stored_Value }) =>
          `${Record_Key.padEnd(keyWidth)} | ${Stored_Value ?? 'null'}`),
      ].join('\n'));
    }
  } catch (error) {
    // Keep diagnostic failures in the console, without an alert or UI change.
    console.log('[AsyncStorage debug] Unable to read the offline database:', error);
  }
}
