import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  saveFavouriteRoute,
  getFavouriteRoutes,
  deleteFavouriteRoute,
  updateFavouriteRoute,
} from '../services/storage';

export default function RouteSearchScreen({ navigation }) {
  const [from, setFrom] = useState('Colombo Fort');
  const [to, setTo] = useState('Kandy');
  const [favourites, setFavourites] = useState([]);

  // READ - Load favourites when screen opens
  useEffect(() => {
    loadFavourites();
  }, []);

  const loadFavourites = async () => {
    const data = await getFavouriteRoutes();
    setFavourites(data);
  };

  const handleSearch = () => {
    navigation.navigate('SearchResults', { from, to });
  };

  const swap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  // CREATE - Save current route as favourite
  const handleSaveFavourite = async () => {
    if (!from || !to) {
      if (Platform.OS === 'web') {
        window.alert('Please enter both From and To');
      } else {
        Alert.alert('Error', 'Please enter both From and To');
      }
      return;
    }
    await saveFavouriteRoute({ from, to });
    await loadFavourites();
    if (Platform.OS === 'web') {
      window.alert(`${from} → ${to} saved as favourite!`);
    } else {
      Alert.alert('Success', `${from} → ${to} saved as favourite!`);
    }
  };

  // UPDATE - Update a favourite route
  const handleUpdateFavourite = async (id, oldRoute) => {
    if (Platform.OS === 'web') {
      const newFrom = window.prompt('Update From:', oldRoute.from);
      const newTo = window.prompt('Update To:', oldRoute.to);
      if (newFrom && newTo) {
        await updateFavouriteRoute(id, { from: newFrom, to: newTo });
        await loadFavourites();
      }
      return;
    }
    Alert.prompt(
      'Update Favourite',
      'Enter new From:',
      async (newFrom) => {
        if (newFrom) {
          await updateFavouriteRoute(id, { from: newFrom, to: oldRoute.to });
          await loadFavourites();
        }
      },
      'plain-text',
      oldRoute.from
    );
  };

  // DELETE - Remove favourite route
  const handleDeleteFavourite = async (id) => {
    // For web browser
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to remove this favourite?');
      if (confirmed) {
        await deleteFavouriteRoute(id);
        await loadFavourites();
      }
      return;
    }

    // For mobile (Android/iOS)
    Alert.alert(
      'Delete Favourite',
      'Are you sure you want to remove this favourite?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFavouriteRoute(id);
            await loadFavourites();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Find Your Route</Text>
      </View>

      {/* SEARCH CARD */}
      <View style={styles.searchCard}>
        <TextInput
          style={styles.input}
          value={from}
          onChangeText={setFrom}
          placeholder="Enter starting point"
        />
        <TouchableOpacity style={styles.swapBtn} onPress={swap}>
          <Text style={styles.swapText}>⇅</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={to}
          onChangeText={setTo}
          placeholder="Enter destination"
        />

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search Routes</Text>
        </TouchableOpacity>

        {/* CREATE BUTTON */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFavourite}>
          <Text style={styles.saveBtnText}>⭐ Save as Favourite</Text>
        </TouchableOpacity>
      </View>

      {/* READ - FAVOURITES LIST */}
      <Text style={styles.sectionTitle}>My Favourite Routes</Text>
      {favourites.length === 0 ? (
        <Text style={styles.emptyText}>No favourites yet. Save one!</Text>
      ) : (
        favourites.map(item => (
          <View key={item.id} style={styles.favItem}>
            <Text style={styles.favText}>⭐ {item.from} → {item.to}</Text>
            <View style={styles.actionRow}>
              {/* UPDATE BUTTON */}
              <TouchableOpacity
                onPress={() => handleUpdateFavourite(item.id, item)}
                style={styles.iconBtn}
              >
                <Text style={styles.editText}>✏️</Text>
              </TouchableOpacity>

              {/* DELETE BUTTON */}
              <TouchableOpacity
                onPress={() => handleDeleteFavourite(item.id)}
                style={styles.iconBtn}
              >
                <Text style={styles.deleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Recent Searches</Text>
      {['Colombo → Kandy', 'Maharagama → Pettah', 'Negombo → Colombo'].map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.recentItem}
          onPress={() => {
            const [f, t] = item.split(' → ');
            setFrom(f);
            setTo(t);
          }}
        >
          <Text>🕐 {item}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Popular Routes</Text>
      <View style={styles.chipRow}>
        {['154', '138', '177', '122'].map((chip, i) => (
          <View key={i} style={styles.chip}>
            <Text>{chip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  back: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  swapBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    padding: 4,
  },
  swapText: {
    fontSize: 18,
    color: '#2563EB',
  },
  searchBtn: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  searchBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  saveBtnText: {
    color: '#92400E',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  favItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  favText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
    marginLeft: 4,
  },
  editText: {
    fontSize: 18,
  },
  deleteText: {
    fontSize: 18,
  },
  recentItem: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
});