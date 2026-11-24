# Clay Clay Deployment Guide

## Quick Deploy to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from Git (connect your GitHub/GitLab/Bitbucket)
4. Select the clay-clay-platform repository
5. Keep default build settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
6. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Build Verification

The project builds successfully with:
- ✅ All pages statically generated
- ✅ TypeScript compilation passes
- ✅ No build errors or warnings

## Environment Variables

For production with API integration:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Booking API endpoint | For real bookings |
| `HITPAY_API_KEY` | HitPay payment key | For payments |
| `SENDGRID_API_KEY` | Email service key | For notifications |

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test booking flow end-to-end
- [ ] Configure custom domain in Vercel
- [ ] Set up SSL certificate (automatic with Vercel)
- [ ] Add environment variables for API integration
- [ ] Test mobile responsiveness
- [ ] Verify GSAP animations work in production
- [ ] Set up analytics (Vercel Analytics or Google Analytics)
- [ ] Configure email notifications
- [ ] Test payment gateway integration

## Custom Domain

1. Go to Vercel Project Settings
2. Navigate to "Domains"
3. Add your domain (e.g., clayclay.sg)
4. Configure DNS records as instructed
5. SSL is automatically provisioned

## Monitoring

- **Vercel Analytics:** Built-in performance monitoring
- **Vercel Logs:** Real-time deployment logs
- **Error Tracking:** Automatic error reporting

## Rollback

If issues occur:
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

## Performance

Current build metrics:
- Static page generation: ~1s
- TypeScript compilation: ~9s
- Total build time: ~15s

All pages are statically generated for optimal performance.
