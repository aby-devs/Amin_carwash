# Car Wash Management System

A comprehensive car wash management system built with modern web technologies for tracking services, payments, staff commissions, and business analytics.

## Features

- **Service Management**: Track car wash services, vehicle types, and payments
- **Staff Commission System**: Automatic commission calculation based on daily revenue
- **Business Analytics**: Comprehensive reporting with profit analysis and performance metrics
- **Excel Export**: Export monthly data for both services and commissions
- **Authentication**: Secure login system with JWT tokens
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

This project is built with:

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Authentication**: JWT tokens
- **Export**: Excel (xlsx), PDF (jsPDF)

## Getting Started

### Prerequisites

- Node.js 24 and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating) (`nvm use` reads `.nvmrc` in the project root)

### Installation

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd car-wash-management-system

# Step 3: Install frontend dependencies
cd frontend
npm i

# Step 4: Install backend dependencies
cd ../backend
npm i

# Step 5: Start the development servers
# Terminal 1 - Backend (from backend directory)
npm start

# Terminal 2 - Frontend (from frontend directory)
npm run dev
```

### Configuration

1. Set up Firebase project and add your configuration to `backend/configs/firebase_db.js`
2. Update environment variables in `backend/.env`
3. The application will be available at `http://localhost:8080`

## Project Structure

```
car-wash-management-system/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/     # Page components
│   │   ├── services/  # API services
│   │   └── contexts/  # React contexts
│   └── package.json
├── backend/           # Express.js backend
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Express middleware
│   ├── routes/        # API routes
│   └── configs/       # Configuration files
└── README.md
```

## Features Overview

### Service Management
- Add, edit, and delete car wash records
- Multiple service selection with pricing
- Daily book concept for clean data entry
- Payment method tracking

### Staff Commission System
- Automatic commission calculation
- Dynamic rates based on daily revenue (20% < KSh 6,000, 30% ≥ KSh 6,000)
- Individual commission records per day
- Commission deletion and management

### Business Analytics
- Comprehensive profit analysis
- Staff performance metrics
- Service profitability breakdown
- Monthly projections and trends
- Excel and PDF export capabilities

## Deployment

This application can be deployed to any hosting platform that supports Node.js applications. Make sure to:

1. Set up your production database (Firebase)
2. Configure environment variables
3. Build the frontend: `npm run build`
4. Start the backend server

## License

This project is private and proprietary.
