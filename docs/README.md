# 📚 Business SaaS Platform - Documentation

Welcome to the documentation for the Business SaaS Platform!

## 📋 Table of Contents

### Getting Started
1. **[DATABASE_CONNECTION_COMPLETE.md](./DATABASE_CONNECTION_COMPLETE.md)** - Complete database setup guide
   - Database configuration
   - Schema details
   - Seed data information
   - TypeORM configuration

2. **[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)** - ⭐ **NEW!** Complete API integration
   - User, Vendor, Admin endpoints
   - Frontend integration
   - React hooks usage
   - Testing instructions

3. **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)** - ⭐ **NEW!** System architecture
   - Visual diagrams
   - Data flow
   - User type flows
   - File structure

4. **[RESET_PASSWORD_GUIDE.md](./RESET_PASSWORD_GUIDE.md)** - PostgreSQL password reset guide
   - Step-by-step password reset
   - Common issues and solutions

5. **[QUICKSTART.txt](./QUICKSTART.txt)** - Quick reference card
   - Essential commands
   - Quick troubleshooting

### API Documentation
6. **[API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)** - API testing and usage
   - Endpoint testing commands
   - Database queries
   - Sample data creation

7. **[API_SPECIFICATION.md](./API_SPECIFICATION.md)** - API specifications
   - Endpoint details
   - Request/response formats

### Status & Reference
8. **[API_LINKING_COMPLETE.txt](./API_LINKING_COMPLETE.txt)** - ⭐ **NEW!** Integration status
   - User, Vendor, Admin linking complete
   - Feature summary
   - Quick reference

9. **[STATUS.txt](./STATUS.txt)** - Current system status
   - Database metrics
   - Running services
   - Quick commands

---

## 🚀 Quick Start

### 1. Database Connection
```powershell
# Test database connection
$env:PGPASSWORD = "5432"
psql -h localhost -p 5432 -U postgres -d webapp
```

### 2. Start API
```bash
cd apps/api
npm run start:dev
```

### 3. Access API
- **Web Interface:** https://local-business-listing-directctory-production.up.railway.app
- **Users Endpoint:** https://local-business-listing-directctory-production.up.railway.app/api/v1/users

---

## 📊 System Overview

### Database
- **Name:** webapp
- **Host:** localhost:5432
- **User:** postgres
- **Password:** 5432
- **Tables:** 36

### API
- **Port:** 3001 (Local) / Railway Managed (Prod)
- **Status:** Running
- **Framework:** NestJS
- **Database:** TypeORM + PostgreSQL
- **Production URL:** https://local-business-listing-directctory-production.up.railway.app

---

## 🗄️ Database Tables

| Category | Tables |
|----------|--------|
| **Users & Auth** | users, vendors, affiliates, referrals, follows |
| **Business** | businesses, business_hours, business_amenities, categories, amenities, listing_views, favorites |
| **Engagement** | reviews, review_helpful_votes, review_replies, leads, job_leads, job_lead_responses, comments, comment_replies |
| **Subscriptions** | subscription_plans, pricing_plans, active_plans, subscriptions, transactions, payouts |
| **System** | notifications, notification_logs, search_logs, system_settings, offer_events, promotion_bookings, promotion_pricing_rules |

---

## 🔗 Useful Links

- **Production API Root:** https://local-business-listing-directctory-production.up.railway.app/api/v1
- **Local API Root:** http://process.env.NEXT_PUBLIC_API_URL/api/v1
- **Swagger Docs:** https://local-business-listing-directctory-production.up.railway.app/api/docs

---

## 📝 Documentation Files

All documentation files are organized in this `/docs` folder:

```
docs/
├── README.md                           (this file)
├── DATABASE_CONNECTION_COMPLETE.md     (complete setup guide)
├── API_TESTING_GUIDE.md                (API testing)
├── RESET_PASSWORD_GUIDE.md             (password reset)
├── QUICKSTART.txt                      (quick reference)
├── HOW_TO_RESET_PASSWORD.txt           (password reset steps)
└── STATUS.txt                          (system status)
```

---

## 🆘 Need Help?

1. **Database Issues:** See [DATABASE_CONNECTION_COMPLETE.md](./DATABASE_CONNECTION_COMPLETE.md)
2. **API Testing:** See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)
3. **Password Reset:** See [RESET_PASSWORD_GUIDE.md](./RESET_PASSWORD_GUIDE.md)
4. **Quick Reference:** See [STATUS.txt](./STATUS.txt)

---

## ✅ System Status

- ✅ PostgreSQL 18 - Running
- ✅ Database 'webapp' - Connected
- ✅ Simple API (Port 3001) - Running
- ✅ 36 Tables Created
- ✅ Seed Data Inserted

---

**Last Updated:** 2026-05-03 08:15 IST  
**Status:** ✅ OPERATIONAL
