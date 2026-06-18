# Rental Tracker

![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue)
![Expo](https://img.shields.io/badge/Expo-~54.0.0-000020)
![TypeScript](https://img.shields.io/badge/TypeScript-~5.6.2-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)

**A comprehensive mobile rental income management application designed for property managers in the UAE market.**

---

## Zukünftige Änderungen

### Backend/Email Verbesserungen

**1. Einladungsemail überarbeiten (Backend-TODO)**
- Die aktuelle Einladungsemail enthält einen „Login"-Button, der ins Leere führt
- Dieser Button muss entfernt oder durch einen funktionierenden Link ersetzt werden

**2. Einladungsemail landet im Spam-Ordner**
- Die Email wird von vielen Mail-Providern als Spam markiert
- Es muss geprüft werden, wie dies verhindert werden kann (z. B. durch SPF, DKIM, DMARC, saubere Absenderdomain, korrektes HTML-Template)

**3. Wöchentliches automatisches CSV-Backup per Email**
- Es soll ein automatischer wöchentlicher Export aller Daten als CSV-Datei implementiert werden
- Die CSV-Datei soll per Email als Backup versendet werden
- Dies ermöglicht eine regelmäßige Datensicherung außerhalb des Systems

---

## Overview

Rental Tracker is a full-stack mobile application built with React Native and Expo, designed to simplify rental property management for the UAE market. The app features a custom fiscal year system (December-November), role-based access control, quarterly reporting, and PDF generation capabilities.

### Who It's For
- Property managers in the UAE
- Real estate administrators
- Landlords managing multiple tenants
- Accounting teams tracking rental income

### Key Features
- **Multi-User System** with role-based access (Admin, Rent Collector, Spectator)
- **User Activity Tracking** with real-time "last seen" indicators
- **Collector Performance Statistics** with interactive charts and analytics
- **Custom Fiscal Year** (December to November with shifted quarters)
- **Quarterly Breakdowns** with Soll/Ist/Differenz (Expected/Actual/Outstanding)
- **PDF Generation** for individual tenant reports and global quarterly reports
- **Pro-Rata Rent Calculations** from exact move-in date
- **AED Currency** throughout the application
- **Email Invitations** for new users via Resend API
- **HTTPS/SSL** with Let's Encrypt
- **JWT Authentication** with refresh token support

---

## Architecture Overview

Rental Tracker follows a client-server architecture with a mobile frontend, REST API backend, and SQLite database.

### Frontend (React Native / Expo)
- Built with **React Native 0.81.5** and **TypeScript 5.6.2**
- Uses **Expo SDK 54** managed workflow
- **EAS Build** for Android APK generation
- Key screens:
  - `LoginScreen` - User authentication
  - `DashboardScreen` - Main view with tenant list and global reports
  - `TenantDetailScreen` - Individual tenant details and quarterly breakdowns
  - `AddTenantScreen` - Create new tenant entries
  - `TeamManagementScreen` - User management with activity tracking (Admin only)
  - `CollectorStatsScreen` - Performance analytics for rent collectors (Admin only)
- **State Management**: React Context API (`AuthContext`)
- **API Communication**: Axios with JWT interceptors (`src/services/api.ts`)
- **Business Logic**: `src/utils/rentCalculations.ts` handles all fiscal year calculations

### Backend (FastAPI / Python)
- **REST API** built with FastAPI
- **JWT Authentication** (access token + refresh token)
- **Role-Based Access Control** (RBAC):
  - **Admin**: Full access (create/edit/delete tenants, manage team)
  - **Rent Collector**: Add payments, edit tenant details
  - **Spectator**: Read-only access
- Deployed on **DigitalOcean Droplet**
- Served via **Nginx** reverse proxy on port 8000
- **SSL/HTTPS** via Let's Encrypt

### Database
- **SQLite** database via SQLAlchemy ORM
- Hosted on DigitalOcean server
- Tables: Users, Tenants, Payments

### Email Service
- **Resend API** for transactional emails
- User invitation emails with login credentials
- Email configuration managed server-side

---

## System Architecture Diagram

```
┌─────────────────────┐         ┌──────────────────────────────┐
│   Android Device    │  HTTPS  │   DigitalOcean Droplet       │
│  (React Native App) │────────▶│                              │
│                     │         │  ┌────────────────────────┐  │
│  - Expo/EAS Build   │         │  │ Nginx (reverse proxy)  │  │
│  - JWT Auth         │         │  │ Port: 80/443           │  │
│  - PDF Generation   │         │  └──────────┬─────────────┘  │
│                     │         │             │                │
└─────────────────────┘         │  ┌──────────▼─────────────┐  │
                                │  │ FastAPI (Python)       │  │
                                │  │ Port: 8000             │  │
                                │  │ - JWT Auth             │  │
                                │  │ - RBAC                 │  │
                                │  └──────────┬─────────────┘  │
                                │             │                │
                                │  ┌──────────▼─────────────┐  │
                                │  │ SQLite Database        │  │
                                │  │ - Users                │  │
                                │  │ - Tenants              │  │
                                │  │ - Payments             │  │
                                │  └────────────────────────┘  │
                                └──────────┬───────────────────┘
                                           │
                                ┌──────────▼────────────────────┐
                                │   External Services           │
                                │   - Resend (Email API)        │
                                │   - Let's Encrypt (SSL/TLS)   │
                                └───────────────────────────────┘
```

---

## Key Features

### User Activity Tracking
- **Real-time activity status** for all team members
- **Color-coded indicators**:
  - 🟢 **Green "Active now"**: User active within last 5 minutes
  - 🟡 **Yellow "X minutes ago"**: User active within last hour
  - ⚫ **Gray "X hours/days ago"**: Older activity
- **Automatic tracking**: `last_seen` timestamp updated on every API request
- **Privacy-friendly**: Efficient 1-minute threshold to reduce database writes
- **Visible to admins** in Team Management screen

### Collector Performance Statistics
- **Comprehensive analytics** for rent collectors (Admin only)
- **Key metrics**:
  - All-time collection totals and payment counts
  - This week vs last week comparison with % change
  - This month vs last month comparison with % change
- **Interactive charts**:
  - **Line chart**: Daily collections over last 30 days
  - **Bar chart**: Monthly collections over last 6 months
- **Empty state handling**: Graceful display when no data available
- **AED currency formatting** throughout

### Custom Lease Year System
- **Lease year runs December to November** (e.g., "Lease Year 2026" = Dec 2025 → Nov 2026)
- **December belongs to the NEW lease year** (Dec 2025 is part of Lease Year 2026)
- **Shifted quarters**:
  - **Q1**: December, January, February
  - **Q2**: March, April, May
  - **Q3**: June, July, August
  - **Q4**: September, October, November

### Financial Calculations
- **Soll (Expected)**: Pro-rated rent based on move-in date (day-exact calculation)
- **Ist (Actual)**: Sum of all payments made
- **Differenz (Outstanding)**: Difference between expected and actual
- Monthly rent = Annual rent ÷ 12
- Move-in month pro-rated: `(monthly_rent / days_in_month) × days_from_move_in`

### PDF Reports
- **Individual Tenant Reports**: Detailed breakdown by fiscal year and quarter
- **Global Quarterly Reports**: All tenants consolidated for a specific quarter
- Generated using `expo-print` and shareable via `expo-sharing`

### Role-Based Access Control
| Permission | Admin | Rent Collector | Spectator |
|-----------|-------|----------------|-----------|
| View tenants/payments | ✅ | ✅ | ✅ |
| Add payments | ✅ | ✅ | ❌ |
| Edit tenants | ✅ | ✅ | ❌ |
| Delete tenants | ✅ | ❌ | ❌ |
| Manage team | ✅ | ❌ | ❌ |
| Create users | ✅ | ❌ | ❌ |
| View activity status | ✅ | ❌ | ❌ |
| View collector statistics | ✅ | ❌ | ❌ |

---

## Project Structure

```
rental-income-tracker/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx         # JWT authentication, login/logout, RBAC helpers
│   ├── screens/
│   │   ├── LoginScreen.tsx         # User login
│   │   ├── RegisterScreen.tsx      # User registration (unused in production)
│   │   ├── DashboardScreen.tsx     # Main screen, tenant list, global reports
│   │   ├── TenantDetailScreen.tsx  # Individual tenant details, payments, quarterly view
│   │   ├── AddTenantScreen.tsx     # Create new tenant
│   │   ├── TeamManagementScreen.tsx # User management with activity tracking (Admin only)
│   │   ├── CollectorStatsScreen.tsx # Performance analytics with charts (Admin only)
│   │   └── index.ts                # Screen exports
│   ├── services/
│   │   ├── api.ts                  # Axios instance, API endpoints, JWT interceptors
│   │   ├── calculationService.ts   # Tenant balance calculations
│   │   ├── pdfService.ts           # Individual tenant PDF generation
│   │   ├── globalReportPdfService.ts # Global quarterly PDF generation
│   │   └── index.ts                # Service exports
│   ├── models/
│   │   ├── Tenant.ts               # Tenant interface
│   │   ├── Payment.ts              # Payment interface
│   │   ├── User.ts                 # User interface with last_seen
│   │   └── index.ts                # Model exports
│   └── utils/
│       ├── rentCalculations.ts     # Core business logic: fiscal years, quarters, Soll/Ist
│       └── timeUtils.ts            # Time formatting utilities (last seen, activity status)
├── App.tsx                         # Navigation, AuthProvider, stack navigators
├── app.json                        # Expo configuration
├── eas.json                        # EAS Build configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript configuration
└── .gitignore                      # Git ignore rules
```

---

## Business Logic

### Lease Year and Quarter System

**Lease Year Label**: The year containing January-November (e.g., "Lease Year 2026")

**Date Range**: December of the previous calendar year to November of the label year
- Lease Year 2026 = **Dec 1, 2025** to **Nov 30, 2026**

**Quarter Breakdown**:
- **Q1 (Dez-Feb)**: December (prev year), January, February
- **Q2 (Mär-Mai)**: March, April, May
- **Q3 (Jun-Aug)**: June, July, August
- **Q4 (Sep-Nov)**: September, October, November

### Rent Calculation

**Monthly Rent**: `annual_rent / 12`

**Move-In Month (Pro-Rated)**:
```
days_in_month = total days in the move-in month
move_in_day = day of move-in
days_from_move_in = days_in_month - move_in_day + 1
soll = (monthly_rent / days_in_month) × days_from_move_in
```

**Full Months**: `soll = monthly_rent`

**Termination Month**: Similar pro-rata calculation up to termination date

**Quarterly Totals**: Sum of all months in the quarter

---

## Setup & Development

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (for building): `npm install -g eas-cli`
- **Android device or emulator** (for testing)

### Frontend Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rental-income-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API URL** (if needed):
   - Open `src/services/api.ts`
   - Update `DEFAULT_API_URL` on line 8 to your backend URL

4. **Run the app**:
   ```bash
   npm start
   ```
   Scan the QR code with Expo Go app (development) or build an APK (production)

### Backend Setup

**Note**: The backend is hosted separately on a DigitalOcean droplet. For local development:

1. Set up Python 3.12+ environment
2. Install FastAPI and dependencies
3. Configure environment variables (database URL, JWT secret, Resend API key)
4. Run with `uvicorn main:app --reload`

Refer to backend repository (if separate) for detailed setup instructions.

---

## Building the APK

### With EAS Build (Recommended)

1. **Login to EAS**:
   ```bash
   eas login
   ```

2. **Configure build**:
   - `eas.json` is already configured for preview builds

3. **Build APK**:
   ```bash
   eas build --platform android --profile preview
   ```

4. **Download APK**:
   - EAS will provide a download link when the build completes
   - Share the APK directly with users

---

## Deployment

### Frontend Deployment
- **Platform**: Android (APK distribution)
- **Build Service**: EAS Build
- **Distribution**: Direct APK download (no Play Store)

### Backend Deployment
- **Server**: DigitalOcean Droplet (Ubuntu)
- **Web Server**: Nginx (reverse proxy)
- **SSL/TLS**: Let's Encrypt (via Certbot)
- **Domain**: `https://api.takamul-cars.com`

**Nginx Configuration** (example):
```nginx
server {
    listen 80;
    server_name api.takamul-cars.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.takamul-cars.com;

    ssl_certificate /etc/letsencrypt/live/api.takamul-cars.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.takamul-cars.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Environment Variables

### Frontend (React Native)

**Note**: Expo apps do not use `.env` files by default. To use environment variables:

1. Install `expo-constants`: `npm install expo-constants`
2. Add to `app.json` under `expo.extra`:
   ```json
   {
     "expo": {
       "extra": {
         "apiBaseUrl": "https://api.takamul-cars.com"
       }
     }
   }
   ```
3. Access in code:
   ```typescript
   import Constants from 'expo-constants';
   const apiUrl = Constants.expoConfig.extra.apiBaseUrl;
   ```

**Current Configuration**: API URL is hardcoded in `src/services/api.ts:8`

### Backend (FastAPI)

Create a `.env` file on the server:

```env
# Database
DATABASE_URL=sqlite:///./rental_tracker.db

# JWT Configuration
JWT_SECRET_KEY=<generated-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# CORS (if needed)
ALLOWED_ORIGINS=["https://app.example.com"]

# SSL/TLS (for local HTTPS development)
CERT_PATH=/etc/letsencrypt/live/api.takamul-cars.com/fullchain.pem
KEY_PATH=/etc/letsencrypt/live/api.takamul-cars.com/privkey.pem
```

Refer to `.env.example` in the repository for all variables.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Mobile app framework |
| Expo | ~54.0.0 | Development platform |
| TypeScript | ~5.6.2 | Type safety |
| React Navigation | ^7.3.1 | Screen navigation |
| Axios | ^1.18.0 | HTTP client |
| expo-print | ~15.0.8 | PDF generation |
| expo-sharing | ~14.0.8 | File sharing |
| jwt-decode | ^4.0.0 | JWT token decoding |
| AsyncStorage | ^2.2.0 | Local storage |
| react-native-chart-kit | ^6.12.0 | Chart visualization (LineChart, BarChart) |
| react-native-svg | ^16.11.1 | SVG rendering for charts |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API framework |
| SQLAlchemy | ORM for database |
| Pydantic | Data validation |
| Python 3.12 | Backend language |
| JWT | Authentication |
| Resend API | Email service |

### Infrastructure
| Service | Purpose |
|---------|---------|
| DigitalOcean | VPS hosting |
| Nginx | Reverse proxy |
| Let's Encrypt | SSL certificates |
| EAS Build | Android APK builds |

---

## Security Notes

### Completed Security Audit ✅

1. **No hardcoded secrets** found in the codebase
2. **API URL** is documented and can be moved to environment variables if needed
3. **`.gitignore`** properly excludes `.env` files
4. **JWT tokens** stored securely in AsyncStorage
5. **HTTPS** enforced via Nginx and Let's Encrypt
6. **Refresh token rotation** implemented in API interceptors

### Recommendations

- **API URL**: Consider moving to `app.json` extras for easier configuration
- **Backend secrets**: Always use environment variables on the server
- **Password policy**: Enforce strong passwords for admin users
- **Rate limiting**: Consider adding rate limiting to backend API

---

## Contributing

This is a private project for Takamul Cars. For issues or feature requests, contact the development team.

---

## License

Proprietary - All rights reserved.

---

## Support

For technical support or questions:
- **Email**: Contact the development team
- **Issues**: Report bugs via GitHub Issues

---

**Built with ❤️ for Takamul Cars**
