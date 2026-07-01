# Car Wash Management System

A full-stack car wash management application with React frontend and Node.js backend, using Firebase Firestore for data storage.

## Features

- **Dashboard**: Real-time analytics and business metrics
- **Service Management**: Add, edit, and track car wash services
- **Records Management**: View and search service records
- **Payment Tracking**: Support for Cash and M-Pesa payments
- **Staff Performance**: Track attendant performance and revenue
- **Real-time Data**: All data stored in Firebase Firestore

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui components
- Lucide React icons

### Backend
- Node.js with Express
- Firebase Admin SDK
- Firestore for database
- CORS enabled for frontend communication

## Setup Instructions

### Prerequisites
- Node.js 24 and npm. Use [nvm](https://github.com/nvm-sh/nvm) and run `nvm use` in the project root (reads `.nvmrc`).
- Firebase project with Firestore enabled
- Firebase service account key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy your Firebase service account key to `backend/configs/firebase-service.json`
   - Create a `.env` file with:
     ```
     DATABASE_URL=your_firebase_database_url
     PORT=3001
     ```

4. Start the backend server:
   ```bash
   npm start
   ```

The backend will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file with:
     ```
     VITE_API_URL=http://localhost:3001/api
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Records
- `POST /api/records` - Add a new car wash record
- `GET /api/records` - Get all records (with optional filters)
- `GET /api/records/:id` - Get a specific record
- `PUT /api/records/:id` - Update a record
- `DELETE /api/records/:id` - Delete a record
- `GET /api/records/search?q=query` - Search records
- `GET /api/records/dashboard` - Get dashboard statistics

### Authentication
- `POST /api/auth/login` - Login (demo implementation)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify session

### Settings
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

## Data Structure

### CarWashRecord
```typescript
{
  id: string;                    // Auto-generated service order ID
  registrationNumber: string;    // Vehicle registration
  carModel: string;             // Vehicle model
  services: string;             // Services provided
  amountPaid: number;           // Amount charged
  paymentMethod: 'Cash' | 'Mpesa';
  attendant: string;            // Staff member name
  date: string;                 // Service date
  time: string;                 // Service time
  status: 'Pending' | 'In Progress' | 'Completed';
  mpesaCode?: string;           // M-Pesa transaction code
  createdAt: Timestamp;         // Firestore timestamp
  updatedAt: Timestamp;         // Firestore timestamp
}
```

## Firebase Collections

- `records` - Car wash service records
- `sessions` - User sessions (demo auth)
- `settings` - System configuration

## Development Notes

- The authentication system is simplified for demo purposes
- All data is stored in Firebase Firestore
- The frontend automatically connects to the backend API
- Error handling includes fallback to sample data if API is unavailable
- Service order IDs are auto-generated in format: `SO-YYYY-XXX`

## Production Deployment

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. The backend serves the built frontend files
3. Deploy the entire backend directory to your hosting platform
4. Update environment variables for production URLs

## License

This project is for demonstration purposes.
