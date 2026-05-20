# MongoDB Setup Guide for Pest Control System

## Current Status
The Pest Control System is configured to connect to MongoDB at: `mongodb://localhost:27017/pestcontrol`

The server is currently running in **limited mode** without MongoDB connection. This means:
- The server starts successfully
- Frontend is accessible
- API endpoints are available
- Database operations will fail with appropriate error messages

## MongoDB Installation

### Windows

#### Option 1: Using MongoDB Installer (Recommended)
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. Choose "Complete" installation
4. Install MongoDB Compass (optional GUI tool)
5. Complete the installation

#### Option 2: Using Chocolatey
```powershell
choco install mongodb
```

#### Option 3: Using Manual Installation
1. Download MongoDB ZIP archive
2. Extract to a folder (e.g., C:\mongodb)
3. Create data directory: `C:\data\db`
4. Create log directory: `C:\data\log`

### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

## Starting MongoDB

### Windows

#### Method 1: As a Service (Recommended)
```powershell
# Start MongoDB service
net start MongoDB

# Stop MongoDB service
net stop MongoDB

# Check service status
sc query MongoDB
```

#### Method 2: Manual Start
```powershell
# Navigate to MongoDB bin directory
cd C:\Program Files\MongoDB\Server\7.0\bin

# Start MongoDB
mongod --dbpath "C:\data\db"
```

#### Method 3: Using Configuration File
Create `mongod.cfg`:
```yaml
systemLog:
  destination: file
  path: C:\data\log\mongod.log
  logAppend: true
storage:
  dbPath: C:\data\db
net:
  port: 27017
  bindIp: 127.0.0.1
```

Start with config:
```powershell
mongod --config "C:\Program Files\MongoDB\Server\7.0\mongod.cfg"
```

### Linux
```bash
# Start MongoDB service
sudo systemctl start mongod

# Stop MongoDB service
sudo systemctl stop mongod

# Restart MongoDB service
sudo systemctl restart mongod

# Check service status
sudo systemctl status mongod
```

### macOS
```bash
# Start MongoDB service
brew services start mongodb-community

# Stop MongoDB service
brew services stop mongodb-community

# Check service status
brew services list
```

## Verifying MongoDB Installation

### Check MongoDB Version
```bash
mongod --version
mongo --version
```

### Test Connection
```bash
# Using MongoDB Shell
mongo

# Or using our provided script
node check-mongodb.js
```

### Check if MongoDB is Running
```bash
# Windows
netstat -an | findstr 27017

# Linux/macOS
lsof -i :27017
# or
netstat -an | grep 27017
```

## MongoDB Configuration

### Default Configuration
- **Port**: 27017
- **Data Directory**: 
  - Windows: `C:\data\db`
  - Linux: `/var/lib/mongodb`
  - macOS: `/usr/local/var/mongodb`
- **Log Directory**:
  - Windows: `C:\data\log`
  - Linux: `/var/log/mongodb`
  - macOS: `/usr/local/var/log/mongodb`

### Changing Default Port
If you need to use a different port, update the `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/pestcontrol
# Change 27017 to your desired port
```

### Remote MongoDB Connection
If using MongoDB Atlas or remote server:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pestcontrol
```

## Troubleshooting

### Issue: "MongoDB Connection Timeout"
**Solution**: 
- Ensure MongoDB service is running
- Check if port 27017 is not blocked by firewall
- Verify MongoDB is listening on correct IP

### Issue: "ECONNREFUSED 127.0.0.1:27017"
**Solution**:
- MongoDB is not running
- Start MongoDB service using the methods above
- Check MongoDB logs for errors

### Issue: "Access Denied" when starting service (Windows)
**Solution**:
- Run command prompt as Administrator
- Check if MongoDB service exists: `sc query MongoDB`
- If service doesn't exist, run MongoDB manually

### Issue: Port Already in Use
**Solution**:
```bash
# Find process using port 27017
# Windows
netstat -ano | findstr :27017
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :27017
kill -9 <PID>
```

### Issue: Data Directory Not Found
**Solution**:
```bash
# Windows
mkdir C:\data\db
mkdir C:\data\log

# Linux
sudo mkdir -p /var/lib/mongodb
sudo mkdir -p /var/log/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
```

## Testing MongoDB Connection

### Using Provided Script
```bash
npm run check-mongodb
```

### Using MongoDB Shell
```bash
mongo
> use pestcontrol
> db.test.insertOne({test: "data"})
> db.test.find()
```

### Using Application Health Endpoint
```bash
# Start the server
npm start

# Check health endpoint
curl http://localhost:5000/api/health
```

Expected response when MongoDB is connected:
```json
{
  "status": "ok",
  "database": {
    "state": "connected",
    "connected": true,
    "host": "localhost"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## MongoDB GUI Tools (Optional)

### MongoDB Compass
- Download from: https://www.mongodb.com/try/download/compass
- Connect to: `mongodb://localhost:27017`
- View and manage data visually

### Studio 3T
- Download from: https://studio3t.com/
- Professional MongoDB GUI
- Advanced features for database management

## Security Recommendations

### For Development
- Use default localhost connection
- No authentication required
- Suitable for local development

### For Production
- Enable authentication
- Use strong passwords
- Configure IP whitelisting
- Enable SSL/TLS
- Regular backups
- Monitor database performance

### Enable Authentication
1. Create admin user:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "strong_password",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})
```

2. Update connection string:
```env
MONGODB_URI=mongodb://admin:strong_password@localhost:27017/pestcontrol?authSource=admin
```

## Backup and Restore

### Backup Database
```bash
mongodump --db pestcontrol --out backup/
```

### Restore Database
```bash
mongorestore --db pestcontrol backup/pestcontrol/
```

## Next Steps

1. Install MongoDB using the appropriate method for your OS
2. Start MongoDB service
3. Run `npm run check-mongodb` to verify connection
4. Restart the Pest Control server: `npm start`
5. Access health endpoint: `http://localhost:5000/api/health`
6. Verify database connection status

## Support

If you encounter issues:
1. Check MongoDB logs:
   - Windows: `C:\data\log\mongod.log`
   - Linux: `/var/log/mongodb/mongod.log`
   - macOS: `/usr/local/var/log/mongodb/mongo.log`
2. Run `npm run check-mongodb` for detailed error information
3. Refer to MongoDB documentation: https://docs.mongodb.com/
