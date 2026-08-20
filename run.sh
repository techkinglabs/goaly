#!/bin/bash

echo "Starting Weekly Progress Tracker application..."
echo "Creating docker containers..."

# Build and start all services
docker-compose up -d

echo "Waiting for PostgreSQL to be ready..."
sleep 10

echo "Application started successfully!"
echo "Backend API: http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"