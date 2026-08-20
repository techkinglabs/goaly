# Development Guide

## Prerequisites
- Java 17+ installed
- Node.js 20+ installed (frontend has compatibility issues with Node.js 18)
- Maven 3.8+
- PostgreSQL database (external)

## Backend Setup

### Building Backend
```bash
cd backend
mvn clean package -DskipTests
```

### Running Backend
```bash
cd backend
# Run with default profile
java -jar target/weekly-progress-tracker-backend-0.0.1-SNAPSHOT.jar

# Or run with specific environment variables
export DB_URL=jdbc:postgresql://localhost:5432/weekly_progress_db
export DB_USER=postgres
export DB_PASSWORD=postgres
java -jar target/weekly-progress-tracker-backend-0.0.1-SNAPSHOT.jar
```

### Backend Debugging
```bash
# Run with debug enabled
cd backend
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -jar target/weekly-progress-tracker-backend-0.0.1-SNAPSHOT.jar

# Or attach debugger to already running process
jdb -attach <pid>
```

## Frontend Setup

### Building Frontend
```bash
cd frontend
npm install
npm run build
```

### Running Frontend
```bash
cd frontend
npm run dev
```

### Frontend Debugging
```bash
# Run development server with debugging enabled
cd frontend
npm run dev
```

**Note**: The frontend requires Node.js 20+ due to dependency compatibility issues. Node.js 18 (as currently installed) will cause build errors.

## Running with Docker Compose (External Database)

Create a `.env` file in the root directory:
```
DB_URL=jdbc:postgresql://your-external-db-host:5432/your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
```

Then run:
```bash
docker-compose up
```

## API Endpoints

- **Goals**: `/api/goals`
- **Weekly Entries**: `/api/weekly-entries`  
- **Charts**: `/api/charts`

## Project Structure
- `backend/` - Spring Boot backend application
- `frontend/` - React frontend application