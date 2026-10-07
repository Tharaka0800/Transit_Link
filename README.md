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
│   │   ├── utils/                     # Incident API service and tests
│   │   ├── services/                  # api.js (Axios + AsyncStorage)
│   │   └── theme.js
│   ├── app.json
│   └── package.json
├── backend/                           # Node.js REST API
│   ├── src/                           # TypeScript server, incident controller/repository
│   ├── db/                            # Supabase SQL schema
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   ├── package.json
│   └── .env
├── shared/                            # Shared TypeScript incident/event contracts
└── README.md
```

## Prerequisites

- Node.js 22+
- MongoDB Atlas or local MongoDB
- Supabase project for incident storage
- Expo Go / Android emulator / iOS simulator

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Before starting, apply `backend/db/schema.sql` in your Supabase SQL editor and put the Supabase URL and server key in an ignored `backend/.env.local`, following `backend/.env.example`. Retain the existing MongoDB/JWT settings in `.env`. Use `npm run seed` for demo accounts when needed; the existing memory-database auto-seeding also remains available.

REST API and Socket.IO: `http://localhost:5000`. See [backend setup](backend/README.md).

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
| GET | `/api/incidents` | Read Supabase incidents |
| POST | `/api/incidents` | Create incident and broadcast update |
| PUT | `/api/incidents/:id` | Update incident and broadcast update |
| DELETE | `/api/incidents/:id` | Resolve/delete incident and broadcast update |

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
| Transport Officer Dashboard / Add & Edit Alert | Done (Officer tab, Supabase CRUD + Socket.IO) |

## Design

- Brand: TransitLink
- Primary: Blue `#2563EB`
- Styling: React Native `StyleSheet.create`
- Navigation: Expo Router + bottom tabs (Home, Routes, Tickets, Profile, Officer)
- Session: AsyncStorage for JWT
- Officer incidents: Supabase PostgreSQL via authenticated Express REST; Socket.IO updates connected dashboards
- Shared incident and event types: `shared/incident.ts`

See [frontend setup and validation](frontend/README.md) for the officer CRUD demonstration and check commands. The project remains on Expo SDK 51.
