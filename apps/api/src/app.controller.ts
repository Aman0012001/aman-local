import { Controller, Get, Post, Header, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getRoot(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business SaaS API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .status {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-bottom: 30px;
        }
        .section {
            margin: 30px 0;
        }
        h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.5em;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .endpoint {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }
        .method {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 0.85em;
            margin-right: 10px;
        }
        .get { background: #10b981; color: white; }
        .post { background: #3b82f6; color: white; }
        .put { background: #f59e0b; color: white; }
        .delete { background: #ef4444; color: white; }
        .path {
            font-family: 'Courier New', monospace;
            color: #667eea;
            font-weight: bold;
        }
        .description {
            color: #666;
            margin-top: 5px;
            font-size: 0.95em;
        }
        .info-box {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-box h3 {
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #555;
        }
        .value {
            color: #667eea;
            font-family: 'Courier New', monospace;
        }
        a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }
        a:hover {
            text-decoration: underline;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Business SaaS API</h1>
        <span class="status">✅ OPERATIONAL</span>
        
        <div class="info-box">
            <h3>📊 System Information</h3>
            <div class="info-item">
                <span class="label">Database:</span>
                <span class="value">PostgreSQL (webapp)</span>
            </div>
            <div class="info-item">
                <span class="label">Status:</span>
                <span class="value">Connected ✅</span>
            </div>
            <div class="info-item">
                <span class="label">Port:</span>
                <span class="value">3000</span>
            </div>
            <div class="info-item">
                <span class="label">Environment:</span>
                <span class="value">Development</span>
            </div>
        </div>

        <div class="section">
            <h2>📡 Available Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path"><a href="/api/v1/users">/api/v1/users</a></span>
                <div class="description">Get all users (returns JSON array)</div>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/v1/users/:id</span>
                <div class="description">Get a specific user by ID</div>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/v1/users</span>
                <div class="description">Create a new user</div>
            </div>
            
            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/v1/users/:id</span>
                <div class="description">Update an existing user</div>
            </div>
            
            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <span class="path">/api/v1/users/:id</span>
                <div class="description">Delete a user</div>
            </div>
        </div>

        <div class="section">
            <h2>📚 Documentation</h2>
            <p>For detailed API documentation and setup guides, check the <code>/docs</code> folder in your project.</p>
            <ul style="margin-top: 15px; padding-left: 20px; color: #666;">
                <li>DATABASE_CONNECTION_COMPLETE.md - Full setup guide</li>
                <li>API_TESTING_GUIDE.md - Testing commands</li>
                <li>STATUS.txt - Quick reference</li>
            </ul>
        </div>

        <div class="footer">
            <p>Business SaaS Platform API v1.0 | Built with NestJS & PostgreSQL</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
