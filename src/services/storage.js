import AsyncStorage from '@react-native-async-storage/async-storage';

// CREATE - Save a favourite route
export const saveFavouriteRoute = async (route) => {
  try {
    const existing = await getFavouriteRoutes();
    const updated = [...existing, { ...route, id: Date.now().toString() }];
    await AsyncStorage.setItem('favouriteRoutes', JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving favourite:', error);
    return [];
  }
};

// READ - Get all favourite routes
export const getFavouriteRoutes = async () => {
  try {
    const data = await AsyncStorage.getItem('favouriteRoutes');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting favourites:', error);
    return [];
  }
};

// UPDATE - Update a favourite route
export const updateFavouriteRoute = async (id, updatedRoute) => {
  try {
    const existing = await getFavouriteRoutes();
    const updated = existing.map(route =>
      route.id === id ? { ...route, ...updatedRoute } : route
    );
    await AsyncStorage.setItem('favouriteRoutes', JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating favourite:', error);
    return [];
  }
};

// DELETE - Delete a favourite route
export const deleteFavouriteRoute = async (id) => {
  try {
    const existing = await getFavouriteRoutes();
    const updated = existing.filter(route => route.id !== id);
    await AsyncStorage.setItem('favouriteRoutes', JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error deleting favourite:', error);
    return [];
  }
};