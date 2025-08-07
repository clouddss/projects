# Backend Deployment Checklist

## Pre-deployment
1. Ensure all environment variables are set in production
2. Test CORS configuration locally
3. Commit all changes

## Deployment Steps
1. Push to your git repository
2. Deploy to your hosting service
3. Restart the Node.js server
4. Clear any CDN/Cloudflare cache

## Post-deployment Verification
1. Test CORS headers:
   ```bash
   curl -I -X OPTIONS https://backend.blunr.com/api/auth/login \
     -H "Origin: https://blunr.com" \
     -H "Access-Control-Request-Method: POST"
   ```

2. Check that only ONE Access-Control-Allow-Origin header is returned

## Cloudflare Configuration
If using Cloudflare:
1. Go to your domain in Cloudflare dashboard
2. Navigate to Rules > Transform Rules
3. Ensure no rules are adding CORS headers
4. Check Page Rules for any CORS modifications

## Common Issues
- Multiple CORS headers: Check infrastructure settings
- 404 errors: Ensure routes are properly configured
- Authentication failures: Verify JWT secret is set