# TransitLink Frontend (Expo / React Native)

Mobile client for the TransitLink Login/Profile module.

## Setup

```bash
cd frontend
npm install
npx expo start
```

Then press `a` for Android emulator or scan the QR code with Expo Go.

## API base URL

Configured in `src/services/api.js`:

- **Android emulator:** `http://10.0.2.2:5000/api`
- **iOS simulator:** `http://localhost:5000/api`

Ensure the backend is running on port 5000.

## Auth storage

JWT and user session are stored with `@react-native-async-storage/async-storage`.

## Screens

| Screen | File |
|--------|------|
| Login / Register / Forgot | `src/screens/Login.js` |
| Home | `src/screens/Home.js` |
| Profile / Edit / Settings | `src/screens/Profile.js` |
| Notifications | `src/screens/Notifications.js` |
| Help & Support | `src/screens/HelpSupport.js` |

## Demo login

- Email: `tharukee01@gmail.com`
- Password: `password123`
