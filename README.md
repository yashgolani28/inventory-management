# Inventory Management System

A full-stack inventory management application built with FastAPI (backend) and React + TypeScript (frontend). This system provides comprehensive inventory tracking, user authentication, and data import/export capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Inventory Management System is designed to manage inventory across multiple regions and districts, tracking components, poles, junctions, landmarks, and credentials with full audit trails. Features include:

- **User Authentication**: Secure JWT-based authentication
- **Role-Based Access Control**: Fine-grained permission management
- **Inventory Tracking**: Manage regions, districts, poles, components, junctions, and landmarks
- **Data Import/Export**: Excel file import with validation and export capabilities
- **Search & Filtering**: Advanced search functionality across all inventory items
- **Audit Logging**: Complete audit trail for compliance and debugging
- **RESTful API**: Comprehensive API endpoints for all operations

## 🏗️ Architecture

### Technology Stack

**Backend:**
- FastAPI 0.115.5 - Modern Python web framework
- SQLModel - SQL databases with Python objects
- SQLAlchemy 2.0.36 - ORM and database toolkit
- Pydantic 2.9.2 - Data validation using Python type annotations
- Python-Jose - JWT token handling
- Passlib + Bcrypt - Secure password hashing

**Frontend:**
- React 18.3.1 - UI framework
- TypeScript 5.6.3 - Type-safe JavaScript
- Vite 7.2.7 - Fast build tool
- TanStack React Query 5.59.3 - Data fetching and caching
- Recharts 2.15.4 - Data visualization

**Database:**
- SQLite (development/small deployments)
- Compatible with PostgreSQL, MySQL for production

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴───────────────┐
        │                              │
┌───────▼────────────┐      ┌──────────▼────────────┐
│  Frontend (React)  │      │  API Requests (HTTP)  │
│  - UI Components   │      │  - Authentication     │
│  - State Management│      │  - CRUD Operations    │
│  - Form Handling   │      │  - File Upload/Export │
└────────────────────┘      └──────────┬────────────┘
                                      │
                            ┌─────────▼──────────┐
                            │  FastAPI Backend   │
                            │  - Routes          │
                            │  - Auth Logic      │
                            │  - Business Logic  │
                            │  - Data Validation │
                            └─────────┬──────────┘
                                      │
                            ┌─────────▼──────────┐
                            │   SQLite Database  │
                            │   - Inventory Data │
                            │   - User Data      │
                            │   - Audit Logs     │
                            └────────────────────┘
```

## 📦 Prerequisites

### Required
- Docker and Docker Compose (recommended for all deployments)
- OR manually:
  - Python 3.11+
  - Node.js 20+
  - npm or yarn

### Optional
- Visual Studio Code with Python and TypeScript extensions
- Postman or similar API testing tool
- Git for version control

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone and navigate to project:**
   ```bash
   git clone <our-repo>
   cd gui
   ```

2. **Configure environment:**
   ```bash
   # Copy example configuration
   cp .env.example .env
   
   # Edit .env with our settings (optional - defaults work for local dev)
   # For production: update VITE_API_URL, CORS_ORIGINS, DATABASE_URL
   ```

3. **Start the complete stack:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

5. **Stop the stack:**
   ```bash
   docker-compose down
   ```

### Manual Local Setup

#### Backend Setup

1. **Create virtual environment:**
   ```bash
   cd c:\ESSI\Projects\gui
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   Backend runs on: http://localhost:8000

#### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Frontend runs on: http://localhost:5173

## 💻 Development

### Development Workflow

1. **Start all services with Docker Compose:**
   ```bash
   docker-compose up
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

3. **Rebuild after code changes:**
   ```bash
   docker-compose up --build
   ```

### Adding New Dependencies

**Backend:**
```bash
pip install <package-name>
pip freeze > requirements.txt
```

**Frontend:**
```bash
npm install <package-name>
```

### Code Structure

**Backend (`app/`):**
- `main.py` - Application entry point and configuration
- `database.py` - Database connection and session management
- `models.py` - SQLModel data models
- `auth.py` - Authentication utilities
- `auth_routes.py` - Authentication endpoints
- `routers.py` - API endpoint handlers
- `importers.py` - Excel file import logic
- `__init__.py` - Package initialization

**Frontend (`frontend/src/`):**
- `main.tsx` - React application entry point
- `App.tsx` - Root component and routing
- `Login.tsx` - Authentication component
- `api.ts` - API client and request handlers
- `styles.css` - Global styles

### API Endpoints

**Authentication:**
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user

**Inventory Management:**
- `GET/POST /regions` - Region operations
- `GET/POST /districts` - District operations
- `GET/POST /poles` - Pole operations
- `GET/POST /components` - Component operations
- `GET/POST /junctions` - Junction box operations
- `GET/POST /landmarks` - Landmark operations
- `GET/POST /credentials` - Credential operations

**Utilities:**
- `GET /health` - Health check
- `GET /` - API status
- `POST /import` - Import Excel data
- `GET /search` - Search across inventory
- `GET /audit` - View audit logs
- `POST /export` - Export data to Excel

**Interactive API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🐳 Deployment

### Docker Compose (Development)

```bash
docker-compose up --build
```

**Features:**
- Hot reload enabled
- Source code volume mounted for live changes
- Network bridging between services
- Health checks configured

### Docker Compose (Production)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Improvements:**
- Automatic service restart
- Removed hot reload (better performance)
- Service dependency ordering
- Persistent data volumes

### Cloud Deployment Options

#### AWS ECS/Fargate
1. Push images to Amazon ECR
2. Create ECS task definition from docker-compose
3. Deploy using ECS service

#### Google Cloud Run
```bash
gcloud run deploy inventory-backend --source .
gcloud run deploy inventory-frontend --source .
```

#### Azure Container Instances
```bash
az container create --name inventory-backend --image <image-url>
az container create --name inventory-frontend --image <image-url>
```

#### DigitalOcean App Platform
1. Connect repository
2. Create app from docker-compose.yml
3. Deploy

#### Docker Hub + VPS
1. Push images:
   ```bash
   docker tag inventory-backend <username>/inventory-backend:latest
   docker push <username>/inventory-backend:latest
   ```

2. On VPS, pull and run:
   ```bash
   docker pull <username>/inventory-backend:latest
   docker run -d -p 8000:8000 <username>/inventory-backend:latest
   ```

### Environment Configuration

Create `.env` file in project root:

```env
# Backend
PYTHONUNBUFFERED=1
DATABASE_URL=sqlite:///./inventory.db

# Frontend
VITE_API_URL=http://api.ourdomain.com

# Security (production)
CORS_ORIGINS=https://ourdomain.com
```

### Database Backup

```bash
# Backup SQLite database
docker exec inventory-backend cp inventory.db inventory.db.backup

# Restore from backup
docker exec inventory-backend cp inventory.db.backup inventory.db
```

## 📁 Project Structure

```
gui/
├── app/                          # Backend application
│   ├── __init__.py
│   ├── main.py                  # FastAPI app configuration
│   ├── database.py              # Database setup and sessions
│   ├── models.py                # SQLModel data models
│   ├── auth.py                  # Authentication logic
│   ├── auth_routes.py           # Auth API endpoints
│   ├── routers.py               # All inventory endpoints
│   ├── importers.py             # Excel import handling
│   └── __pycache__/
│
├── frontend/                     # React TypeScript application
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── Login.tsx            # Login component
│   │   ├── api.ts               # API client
│   │   ├── styles.css           # Global styles
│   │   └── vite-env.d.ts        # Vite type definitions
│   ├── index.html               # HTML template
│   ├── package.json             # Frontend dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite configuration
│
├── Dockerfile.backend           # Backend container image
├── Dockerfile.frontend          # Frontend container image
├── docker-compose.yml           # Development compose file
├── docker-compose.prod.yml      # Production compose file
├── .dockerignore                # Docker build exclusions
├── requirements.txt             # Python dependencies
├── README.md                    # This file
│
└── inventory.db                 # SQLite database (created at runtime)
```

## 📖 API Documentation

Full interactive API documentation is available at:

- **Swagger UI (Recommended):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Example API Requests

**Login:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'
```

**Get All Regions:**
```bash
curl -X GET "http://localhost:8000/regions" \
  -H "Authorization: Bearer <token>"
```

**Create New Region:**
```bash
curl -X POST "http://localhost:8000/regions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"North Region","code":"NR001"}'
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file from the provided `.env.example`:

```bash
cp .env.example .env
```

**Key Variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:8000` | Frontend API endpoint |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000` | Allowed domains for backend |
| `DATABASE_URL` | `sqlite:///./inventory.db` | Database connection string |
| `BACKEND_PORT` | `8000` | Backend service port |
| `FRONTEND_PORT` | `3000` | Frontend service port |

### Production Deployment Configuration

1. **Update `.env` for our domain:**
   ```env
   VITE_API_URL=https://api.ourdomain.com
   CORS_ORIGINS=https://ourdomain.com,https://api.ourdomain.com
   DATABASE_URL=postgresql://user:password@db:5432/inventory
   ```

2. **Use PostgreSQL for production:**
   ```env
   DATABASE_URL=postgresql://username:password@postgres-host:5432/inventory
   ```

3. **Update ports if needed:**
   ```env
   BACKEND_PORT=8000
   FRONTEND_PORT=80
   ```

**Note:** Never commit `.env` to git. Add it to `.gitignore`.

## 🔒 Security Best Practices

1. **Change Default Credentials:** Update all default usernames/passwords
2. **Enable HTTPS:** Use reverse proxy (Nginx) with SSL certificates
3. **Database Security:**
   - Enable database authentication
   - Use encrypted backups
   - Regular backup schedules

4. **API Security:**
   - Implement rate limiting
   - Validate all inputs
   - Use environment variables for secrets

5. **Container Security:**
   - Keep base images updated
   - Use specific version tags, not `latest`
   - Scan images for vulnerabilities: `docker scan <image>`

## 🐛 Troubleshooting

### Docker Issues

**Ports already in use:**
```bash
# Find and stop conflicting containers
docker ps
docker stop <container-id>

# Or use different ports in docker-compose.yml
```

**Database locked:**
```bash
# Remove old database and restart
docker-compose down
rm inventory.db
docker-compose up
```

**Service won't start:**
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Backend Issues

**Module not found:**
```bash
pip install -r requirements.txt
```

**Database initialization fails:**
- Check `DATABASE_URL` environment variable
- Ensure write permissions on database directory
- Review error in `docker-compose logs backend`

### Frontend Issues

**API connection refused:**
- Verify backend is running: http://localhost:8000/health
- Check `VITE_API_URL` configuration
- Check CORS settings in backend

**Blank page or 404:**
```bash
# Clear cache and rebuild
npm run build
# Or in development:
npm run dev
```

**Dependencies installation fails:**
```bash
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install
```

## 📝 Logging & Monitoring

### View Logs

**All services:**
```bash
docker-compose logs -f
```

**Specific service:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Follow logs with timestamps:**
```bash
docker-compose logs -f --timestamps
```

### Health Checks

Both services include automated health checks:
```bash
# Check container status
docker ps

# Manual health check
curl http://localhost:8000/health
```

## 🔄 Continuous Integration/Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Docker Hub

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push
        run: |
          docker login -u ${{ secrets.DOCKER_USER }} -p ${{ secrets.DOCKER_PASS }}
          docker build -f Dockerfile.backend -t backend:${{ github.sha }} .
          docker push backend:${{ github.sha }}
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [React Documentation](https://react.dev)
- [Docker Documentation](https://docs.docker.com)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com)

## 🤝 Contributing

1. Create a feature branch
2. Make changes with descriptive commits
3. Test thoroughly (local and Docker)
4. Submit pull request with detailed description

## 📄 License

[Specify our license here]

## 👥 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review application logs
3. Check API documentation at `/docs`
4. Contact development team

---

**Last Updated:** December 2025
**Version:** 0.1.0
**Status:** Development
