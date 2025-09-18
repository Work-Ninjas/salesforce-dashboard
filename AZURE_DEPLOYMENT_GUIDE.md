# Azure App Service Deployment Guide for Salesforce Dashboard

## Complete Solution for HTTP 500.1001 IISNode Errors

### Issue Summary
Your Node.js application works locally but fails on Azure App Service with HTTP 500.1001 errors due to IISNode routing issues.

### Root Causes
1. **Incorrect web.config URL rewrite rules** - IISNode needs specific routing configuration
2. **Missing or incorrect port configuration** - Azure dynamically assigns ports via `process.env.PORT`
3. **IISNode handler misconfiguration** - Handler path must match your main file exactly
4. **Static file serving issues** - Express static middleware conflicts with IIS static file handling

## Solution Components

### 1. Fixed Files Created
- **web.config** - Properly configured IISNode handler and URL rewrite rules
- **iisnode.yml** - Enhanced logging and error handling configuration
- **web.config.httpplatform** - Alternative configuration using HTTP Platform Handler
- **deploy.cmd** - Custom deployment script for Azure
- **startup.cmd** - Startup script for manual configuration
- **deploy-to-azure.ps1** - PowerShell deployment automation script

### 2. Required Azure App Service Settings

Configure these in Azure Portal > App Service > Configuration > Application settings:

```
NODE_ENV=production
WEBSITES_PORT=8080
WEBSITE_NODE_DEFAULT_VERSION=~20
SCM_DO_BUILD_DURING_DEPLOYMENT=true

# Database settings (from your .env file)
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_SERVER=sfdc-backup.database.windows.net
DB_DATABASE=Commission
```

### 3. Step-by-Step Deployment Process

#### Option A: Using PowerShell Script (Recommended)

1. Open PowerShell as Administrator
2. Navigate to your project directory:
   ```powershell
   cd "C:\Users\Ever\Documents\Leads Salesforce"
   ```

3. Run the deployment script:
   ```powershell
   # To deploy to existing App Service
   .\deploy-to-azure.ps1

   # To create new resources and deploy
   .\deploy-to-azure.ps1 -CreateNew
   ```

#### Option B: Manual Deployment via Azure Portal

1. **Prepare deployment package:**
   ```cmd
   # Remove node_modules
   rmdir /s /q node_modules

   # Create ZIP file with all files except node_modules, .git, .env
   ```

2. **Deploy via Azure Portal:**
   - Go to App Service > Deployment Center
   - Choose "Local Git" or "ZIP Deploy"
   - Upload your ZIP file

3. **Configure App Settings:**
   - Go to Configuration > Application settings
   - Add all environment variables listed above
   - Save and restart the app

#### Option C: Using Azure CLI

```bash
# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription "<subscription-id>"

# Deploy using ZIP
az webapp deployment source config-zip \
  --resource-group rg-salesforce-dashboard \
  --name salesforce-dashboard-wn \
  --src deploy.zip

# Configure Node version
az webapp config set \
  --resource-group rg-salesforce-dashboard \
  --name salesforce-dashboard-wn \
  --node-version "20-lts"

# Set startup command
az webapp config set \
  --resource-group rg-salesforce-dashboard \
  --name salesforce-dashboard-wn \
  --startup-file "node server.js"
```

### 4. Troubleshooting Steps

#### Check Logs
```bash
# Stream logs
az webapp log tail \
  --resource-group rg-salesforce-dashboard \
  --name salesforce-dashboard-wn

# Download logs
az webapp log download \
  --resource-group rg-salesforce-dashboard \
  --name salesforce-dashboard-wn \
  --log-file logs.zip
```

#### Access Kudu Console
1. Navigate to: https://salesforce-dashboard-wn.scm.azurewebsites.net
2. Go to Debug Console > CMD
3. Navigate to `D:\home\site\wwwroot`
4. Check for:
   - web.config exists
   - node_modules folder exists
   - iisnode folder exists (for logs)

#### Common Issues and Fixes

**Issue: "The iisnode module is unable to start the node.exe process"**
- **Fix:** Ensure `server.js` exists and has correct permissions
- Check web.config handler path matches your main file

**Issue: "Cannot GET /"**
- **Fix:** Check Express static middleware configuration
- Verify public folder exists with index.html

**Issue: "ECONNREFUSED" database errors**
- **Fix:** Add Azure App Service outbound IP to SQL Server firewall
- Verify database connection string environment variables

**Issue: Port binding errors**
- **Fix:** Use `process.env.PORT` not hardcoded port
- Don't set PORT in web.config, let Azure assign it

### 5. Alternative Approach: Container Deployment

If IISNode continues to cause issues, consider containerizing the application:

1. **Create Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

2. **Deploy to Azure Container Instances or App Service for Containers:**
```bash
# Build and push to Azure Container Registry
az acr build --registry <registry-name> --image salesforce-dashboard:v1 .

# Deploy to App Service
az webapp create --resource-group rg-salesforce-dashboard \
  --plan asp-salesforce-dashboard \
  --name salesforce-dashboard-container \
  --deployment-container-image-name <registry-name>.azurecr.io/salesforce-dashboard:v1
```

### 6. Performance Optimization

Once deployed, optimize your App Service:

1. **Scale up to B1 or higher** (Free tier has limitations)
2. **Enable Always On** (prevents cold starts)
3. **Configure Auto-scaling** (handle traffic spikes)
4. **Enable Application Insights** (monitoring and diagnostics)
5. **Use Azure CDN** for static assets

### 7. Verification Steps

After deployment, verify everything works:

1. **Test API endpoint:**
   ```bash
   curl https://salesforce-dashboard-wn.azurewebsites.net/api
   ```

2. **Check specific endpoints:**
   - `/api/division-summary`
   - `/api/lead-summary`
   - `/api/opportunity-detail`

3. **Monitor Application Insights** for errors and performance

### 8. Rollback Procedure

If deployment fails:

1. **Via Portal:**
   - Go to Deployment Center > Deployment slots
   - Swap back to previous version

2. **Via CLI:**
   ```bash
   az webapp deployment slot swap \
     --resource-group rg-salesforce-dashboard \
     --name salesforce-dashboard-wn \
     --slot staging \
     --target-slot production
   ```

## Security Considerations

1. **Never commit .env file** to source control
2. **Use Azure Key Vault** for sensitive configurations
3. **Enable HTTPS only** in App Service settings
4. **Configure CORS** appropriately for your domain
5. **Use Managed Identity** for Azure SQL connection (recommended)

## Support and Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [IISNode Configuration](https://github.com/azure/iisnode)
- [Node.js on Azure](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)
- [Troubleshooting Guide](https://docs.microsoft.com/azure/app-service/troubleshoot-http-502-http-503)

## Contact Azure Support

If issues persist:
1. Go to Azure Portal > Help + Support
2. Create a support ticket with:
   - Resource: salesforce-dashboard-wn
   - Issue type: Technical
   - Problem type: Node.js application errors
   - Include IISNode logs from Kudu console