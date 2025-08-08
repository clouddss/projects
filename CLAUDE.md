# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blunr is a full-stack social media/content platform with subscription and payment features, built with:
- **Backend**: Node.js/Express with MongoDB (ES6 modules)
- **Frontend**: Angular 19 with Bootstrap, TypeScript, and SCSS

## Development Commands

### Backend (Blunr-backend/)
```bash
# Install dependencies
npm install

# Start development server with nodemon (auto-reload)
npm start

# Server runs on port 5000 by default
```

### Frontend (Blunr-frontend/)
```bash
# Install dependencies
npm install

# Start development server
npm start
# or
ng serve

# Build for production
npm run build
# or
ng build

# Run unit tests
npm test
# or
ng test

# Run lint check
npm run lint

# Generate new Angular components/services
ng generate component component-name
ng generate service service-name

# Run a specific test file
ng test --include='**/specific.component.spec.ts'
```

## Architecture & Code Structure

### Backend Architecture

The backend follows a modular architecture with clear separation of concerns:

1. **Module-based Structure**: Each feature (auth, posts, users, etc.) has its own module with:
   - `.controller.js` - Request/response handling and business logic
   - `.service.js` - Reusable business logic and data operations
   - `.routes.js` - Express route definitions
   - `.model.js` - Mongoose schemas and models

2. **Core Services**:
   - MongoDB connection via Mongoose
   - Firebase Admin SDK for push notifications
   - Cloudinary for image/video storage
   - Multiple payment providers (Coinbase, NowPayments, Cryptomus)
   - JWT-based authentication
   - Email service via Nodemailer

3. **Middleware Stack**:
   - Authentication (`auth.middleware.js`)
   - Admin authorization (`admin.middleware.js`)
   - File uploads via Multer with Cloudinary integration
   - CORS configuration for frontend communication
   - Helmet for security headers

### Frontend Architecture

The Angular frontend uses standalone components with a modular service layer:

1. **Component Organization**:
   - Standalone components (no NgModules)
   - Shared components in `src/app/shared/components/`
   - Feature components at the app root level
   - SCSS styling with Bootstrap integration

2. **Service Layer** (`src/app/core/services/`):
   - Authentication service with JWT token management
   - HTTP interceptor for automatic token attachment
   - Route guards for protected routes
   - Feature-specific services (post, user, payment, chat, etc.)

3. **Routing**:
   - Centralized route definitions in `app.routes.ts`
   - Route constants in `core/constants/routes.constant.ts`
   - AuthGuard protecting authenticated routes

4. **State Management**:
   - Service-based state management using RxJS
   - Local storage for authentication tokens
   - Firebase integration for real-time features

## Key Technical Details

### API Communication
- Backend API runs on `http://localhost:5000`
- Frontend expects `/api/*` routes
- CORS configured for `localhost:3000` and `blunr.com`
- JWT tokens stored in localStorage as `token`

### Authentication Flow
1. User registers/logs in via `/api/auth/` endpoints
2. Backend returns JWT token
3. Frontend stores token and includes in all API requests via interceptor
4. Protected routes check token validity via AuthGuard

### File Upload System
- Images/videos uploaded to Cloudinary via backend
- Multer middleware handles multipart form data
- Support for multiple file uploads in posts
- Sharp library for image processing

### Payment Integration
- Multiple cryptocurrency payment providers
- Webhook endpoints for payment confirmations
- Raw body parsing for webhook signature verification
- Transaction tracking in MongoDB

### Real-time Features
- Firebase Cloud Messaging for push notifications
- Service worker (`firebase-messaging-sw.js`) for background notifications
- Chat/messaging system with real-time updates

## Environment Variables

Backend requires `.env` file with:
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)
- Firebase, Cloudinary, payment provider credentials
- JWT secret and email service configuration

Frontend environment configuration in `src/envs/index.ts`

## Testing Approach

- Frontend: Karma/Jasmine for unit tests (`.spec.ts` files)
- Run frontend tests with `ng test`
- Backend: No test framework configured yet

## Important Patterns

1. **Error Handling**: Controllers use try-catch blocks with standardized error responses
2. **Authentication**: All protected endpoints require auth middleware
3. **File Structure**: Consistent module pattern across all features
4. **API Responses**: Standardized JSON response format
5. **Component Communication**: Services as singleton state managers
6. **Route Protection**: AuthGuard checks token before route activation

## Deployment & Infrastructure

### Production Deployment

The project uses PM2 for process management and nginx as a reverse proxy:

#### Backend Deployment with PM2
```bash
# Deploy backend changes
git add .
git commit -m "Your commit message"
git push origin main

# On production server
git pull origin main
npm install  # if dependencies changed
pm2 restart blunr-backend  # or pm2 reload for zero-downtime
pm2 status  # check process status
```

#### Frontend Deployment
Frontend is served through nginx configuration at `/nginx.conf` which:
- Serves static Angular files from `/usr/share/nginx/html`
- Proxies `/api/*` requests to `https://backend.blunr.com`
- Handles Angular routing with `try_files` fallback

### Infrastructure Setup
- **Backend**: Deployed at `backend.blunr.com` (managed via PM2)
- **Frontend**: Served via nginx at `blunr.com`
- **Domain**: Uses Cloudflare for DNS and CDN
- **Database**: MongoDB (connection via `MONGO_URI` environment variable)
- **File Storage**: Cloudinary for images/videos

### CORS Configuration
⚠️ **Important**: CORS headers should be managed by either nginx OR the Node.js application, not both:
- Current setup: Node.js handles CORS with `origin: true` for all origins
- If using nginx for CORS, disable CORS middleware in Node.js to prevent duplicate headers
- Common issue: `Access-Control-Allow-Origin` header contains multiple values

## Key Features & Business Logic

### Subscription System
The platform supports both free and paid subscriptions:

#### Free Accounts (Permanent Follows)
- When `subscriptionPrice` for all durations is 0, users can follow permanently
- No expiration date (`expiresAt: null`) for free subscriptions
- Frontend shows "FOLLOW THIS CREATOR" instead of subscription pricing
- Implementation: `subscription.model.js` has optional `expiresAt` field

#### Paid Subscriptions
- 1, 3, or 6-month subscription options
- Pricing set by creators for each duration
- Expiration dates calculated based on duration
- Automatic renewal logic handles both free and paid subscriptions

#### Key Files:
- `subscription.model.js` - Optional `expiresAt` for permanent follows
- `subscription.controller.js` - Logic for free vs paid subscription handling
- `user.controller.js` - Check for both null and future expiration dates
- `static-profile.component.html` - Conditional UI for free vs paid accounts

## Common Issues & Solutions

### CORS Issues
- **Problem**: Duplicate `Access-Control-Allow-Origin` headers
- **Cause**: Both nginx and Node.js setting CORS headers
- **Solution**: Use only one layer for CORS (currently Node.js with `origin: true`)
- **Debug**: Check headers with curl or browser dev tools

### Deployment Issues
- **PM2 Process Management**: Use `pm2 restart` or `pm2 reload` after code changes
- **Cache**: Clear Cloudflare cache after frontend deployments
- **Environment Variables**: Ensure production `.env` file is properly configured

### Authentication Issues
- **JWT Token**: Stored in localStorage, included via HTTP interceptor
- **CORS**: Ensure `credentials: true` for cookie/token handling
- **Backend**: Verify JWT secret is consistent across deployments

## Common Development Tasks

### Adding a New Backend Module
1. Create module folder in `src/modules/[module-name]/`
2. Add model, controller, service, and routes files following existing patterns
3. Import routes in `index.js` and add to Express app
4. Apply auth middleware for protected endpoints

### Adding a New Frontend Component
1. Generate component: `ng generate component [component-name]`
2. Component will be created as standalone by default
3. Add route in `app.routes.ts` with appropriate guards
4. Create corresponding service in `core/services/` if needed
5. Use existing interceptor for API calls (automatically adds base URL and auth token)

### Working with Payment Providers
- Webhooks require raw body parsing (configured in index.js)
- Signature verification is critical for security
- Multiple providers supported: Coinbase, NowPayments, Cryptomus
- Test webhooks locally using ngrok or similar tools

### Debugging API Issues
- Check CORS configuration in backend (currently allows all origins)
- Verify JWT token in localStorage/sessionStorage
- API routes expect `/api/` prefix
- Check auth middleware for protected routes
- Use browser DevTools Network tab to inspect requests/responses

## Development Best Practices

1. **Always test CORS configuration** after backend changes
2. **Use absolute URLs** in frontend environment configuration (`src/envs/index.ts`)
3. **Handle both free and paid subscriptions** in subscription logic
4. **Validate webhook signatures** for payment security
5. **Use PM2 for production deployment** rather than direct node commands
6. **Monitor nginx logs** for proxy and routing issues
7. **Keep environment variables secure** and out of version control
8. **ES6 Modules**: Backend uses `"type": "module"` in package.json
9. **Raw Body Parsing**: Required for webhook signature verification