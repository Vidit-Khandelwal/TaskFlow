# Deployment Instructions

## Backend Deployment (Vercel)

1. **Environment Variables:**
   ```
   MONGO_URL=mongodb+srv://delta-student1:Asdfgh1000@cluster0.ovilz.mongodb.net/task_manager?retryWrites=true&w=majority
   SESSION_SECRET=your-random-secret-string-here
   NODE_ENV=production
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

2. **Vercel Configuration:**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Output Directory: (leave empty)

## Frontend Deployment (Vercel)

1. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://task-flow-six-beta.vercel.app
   ```

2. **Vercel Configuration:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

## Update CORS

After deploying frontend, update the CORS in `backend/server.js` with your actual frontend URL:

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-url.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));
```
