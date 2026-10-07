# TransitLink

Expo (React Native) + Node.js/Express module for **TransitLink**, covering authentication, profile management, notifications, help & support, and the Transport Officer Dashboard.

## Folder Structure

```
./
├── frontend/                          # Expo React Native app
│   ├── src/
│   │   ├── components/                # Navbar, Button, FormInput, BottomNav
│   │   ├── screens/                   # Home, Login, Profile, Notifications, HelpSupport
│   │   ├── app/                       # Expo Router stacks, tabs, and officer screens
│   │   ├── utils/                     # Local incident CRUD and tests
│   │   ├── services/                  # api.js (Axios + AsyncStorage)
│   │   └── theme.js
│   ├── app.json
│   └── package.json
├── backend/                           # Node.js REST API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   ├── package.json
│   └── .env
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas or local MongoDB
- Expo Go / Android emulator / iOS simulator

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

API: `http://localhost:5000`

### 2. Frontend (Expo)

```bash
cd frontend
npm install
npx expo start
```

Android emulator uses `http://10.0.2.2:5000/api` automatically.

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Primary | `tharukee01@gmail.com` | `password123` |
| Secondary | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |

## REST API (CRUD)

| Method | Endpoint | Operation |
|--------|----------|-----------|
| POST | `/api/users/register` | Create user |
| POST | `/api/users/login` | Authenticate + JWT |
| GET | `/api/users/profile` | Read profile |
| PUT | `/api/users/profile` | Update profile |
| DELETE | `/api/users/profile` | Delete account |
| GET | `/api/notifications` | Read notifications |
| POST | `/api/notifications` | Create notification |
| DELETE | `/api/notifications/:id` | Dismiss notification |

## Screens (Milestone prototypes)

| Screen | Status |
|--------|--------|
| Login / Register / Forgot Password | Done |
| Home | Done |
| Profile / Edit Profile / Settings | Done |
| Notifications | Done |
| Help & Support | Done |
| My Tickets (Upcoming / Past) | Done |
| Favourite Routes | Done (Routes tab) |
| Fare Information (Calculator / General) | Done |
| Transport Officer Dashboard / Add & Edit Alert | Done (Officer tab, local CRUD) |

## Design

- Brand: TransitLink
- Primary: Blue `#2563EB`
- Styling: React Native `StyleSheet.create`
- Navigation: Expo Router + bottom tabs (Home, Routes, Tickets, Profile, Officer)
- Session: AsyncStorage for JWT
- Officer incidents: AsyncStorage key `@transit_incidents`; sample alerts seed once, and Resolve deletes an alert

See [frontend setup and validation](frontend/README.md) for the officer CRUD demonstration and check commands. The project remains on Expo SDK 51.
