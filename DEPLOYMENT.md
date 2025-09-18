# Deployment Instructions - Azure App Service

## Option 1: Azure App Service (Recommended)

### Prerequisites
- Azure account (free tier available)
- Git installed on your computer
- Azure CLI (optional but recommended)

### Steps to Deploy:

#### 1. Create Azure App Service
1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → "Web App"
3. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `your-app-name` (must be unique)
   - **Runtime stack**: Node 18 LTS
   - **Operating System**: Windows
   - **Region**: Same as your database (for better performance)
   - **Plan**: Free F1 or Basic B1

#### 2. Configure Application Settings
In Azure Portal → Your App Service → Configuration → Application settings, add:
```
DB_USER=claude2
DB_PASSWORD=Roofsquad$2025
DB_SERVER=sfdc-backup.database.windows.net
DB_DATABASE=Commission
PORT=8080
```

#### 3. Deploy Using Git

Option A: Deploy from Local Git
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Add Azure remote
git remote add azure https://<your-app-name>.scm.azurewebsites.net/<your-app-name>.git

# Deploy
git push azure master
```

Option B: Deploy using GitHub Actions
1. Push code to GitHub repository
2. In Azure Portal → Deployment Center → GitHub
3. Authorize and select your repository
4. Azure will create GitHub Actions workflow automatically

#### 4. Access Your App
Your app will be available at: `https://your-app-name.azurewebsites.net`

---

## Option 2: Alternative Free Hosting Options

### Railway.app (Easiest)
1. Go to [Railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Render.com
1. Go to [Render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Add environment variables
5. Deploy (free tier available)

### Heroku (If you have existing account)
1. Install Heroku CLI
2. Create Procfile: `web: node server.js`
3. Deploy:
```bash
heroku create your-app-name
heroku config:set DB_USER=claude2
heroku config:set DB_PASSWORD=Roofsquad$2025
heroku config:set DB_SERVER=sfdc-backup.database.windows.net
heroku config:set DB_DATABASE=Commission
git push heroku master
```

---

## Security Notes
- **IMPORTANT**: Never commit database credentials to Git
- Use environment variables for all sensitive data
- Configure IP restrictions in Azure SQL if needed
- Consider adding authentication to the dashboard

## Database Firewall
Make sure to add the Azure App Service IP to your Azure SQL firewall:
1. Azure SQL Database → Firewalls and virtual networks
2. Add "Allow Azure services" = ON
3. Or add specific outbound IPs from your App Service

## Troubleshooting
- Check logs in Azure Portal → App Service → Log Stream
- Verify database connection from Azure App Service console
- Ensure all npm packages are in package.json
- Check Node.js version compatibility