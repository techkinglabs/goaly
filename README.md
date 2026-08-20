# Weekly Progress Tracker

A web application to track weekly progress against ongoing goals using a template-and-entry data model.

## Project Structure

- `backend/`: Spring Boot application with JPA and PostgreSQL
- `frontend/`: React application with TypeScript and Tailwind CSS

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Running the Application

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Database: postgres://localhost:5432/weekly_progress_db

## Features

- Goal tracking with targets
- Weekly progress entries
- Interactive visualization of progress over time
- Percentage-based scaling for comparison across different units