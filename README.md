# Personal Progress Tracker

A web application for tracking weekly progress against personal goals using a template-and-entry data model.

## Project Structure

* `backend/` — Spring Boot application with JPA and PostgreSQL
* `frontend/` — React application with TypeScript and Tailwind CSS

## Authentication

This is a single-user **Personal Progress Tracker**. There is no authentication or multi-tenant support. Goals and entries are not partitioned by user.

## Getting Started

### Prerequisites

* Docker
* Docker Compose

### Configuration

The application supports two PostgreSQL configurations.

#### Option A — Internal PostgreSQL

The default configuration starts PostgreSQL as part of the Docker Compose stack.

No external database is required.

```bash
docker compose up --build
```

The PostgreSQL database uses a named Docker volume for persistent data.

Default configuration:

* Database: `goaly_db`
* User: `goaly_user`
* Password: `goaly_password`
* Port: `5432`

#### Option B — External PostgreSQL

Use this configuration when PostgreSQL is already running outside the Goaly Docker stack.

Configure the database connection in `.env`:

```env
DB_URL=jdbc:postgresql://localhost:5432/goaly_db
DB_USER=your_user
DB_PASSWORD=your_password
```

Then start the application with:

```bash
docker compose -f docker-compose.external-db.yml up --build
```

`.env` is gitignored. See `.env.example` for the available configuration options.

### Access

After starting the application:

* Frontend: `http://localhost:3002`
* Backend API: `http://localhost:8080`

When using the internal PostgreSQL configuration, the database is available on:

```text
localhost:5432
```

## Features

* Goal tracking with configurable targets
* Historical target tracking
* Weekly progress entries
* Interactive progress visualization
* Percentage-based scaling for comparing different units
* Persistent PostgreSQL storage

## Architecture

```text
React / TypeScript
        │
        ▼
   Spring Boot
        │
        ▼
   PostgreSQL
```

The application can use either a PostgreSQL container managed by Docker Compose or an existing external PostgreSQL instance.
