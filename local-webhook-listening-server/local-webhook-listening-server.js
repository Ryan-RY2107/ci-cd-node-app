const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const repoDir = '/Users/renyi/Desktop/Efrei/efrei/S8/DevOps_and_MLOps/ci-cd-node-app';
const repoUrl = 'https://github.com/Ryan-RY2107/ci-cd-node-app.git';

const repoName = path.basename(repoUrl, '.git');
const fullPath = path.join(repoDir, repoName);

app.post('/webhook', (req, res) => {
  console.log('✅ Webhook received');

  try {
    console.log('📁 Checking repoDir...');
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
      console.log('✅ Created repoDir');
    }

    process.chdir(repoDir);

    console.log('📁 Cloning or pulling repo...');
    if (!fs.existsSync(fullPath)) {
      execSync(`git clone ${repoUrl}`);
      console.log('✅ Repository cloned');
    }

    process.chdir(fullPath);
    execSync('git checkout main');
    execSync('git pull origin main');
    console.log('✅ Repo updated to latest main');

    console.log('🐳 Stopping containers...');
    try {
      execSync('docker compose down', { stdio: 'inherit' });
      console.log('✅ Containers stopped');
    } catch (e) {
      console.warn('⚠️ docker-compose down failed (maybe no containers running)');
    }

    console.log('🧹 Removing old images...');
    const services = execSync('docker compose config --services').toString().trim().split('\n');
    services.forEach(service => {
      try {
        const image = execSync(`docker compose config | awk '/${service}:/{flag=1;next}/image:/{if(flag){print $2;flag=0}}'`).toString().trim();
        if (image) {
          execSync(`docker rmi -f ${image}`);
          console.log(`✅ Removed image ${image}`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to remove image for ${service}`);
      }
    });

    console.log('📥 Pulling new images...');
    execSync('docker compose pull', { stdio: 'inherit' });

    console.log('🚀 Starting containers...');
    execSync('docker compose up -d', { stdio: 'inherit' });

    console.log('✅ Deployment completed');
    res.status(200).send('Deployment completed');
  } catch (err) {
    console.error('❌ Deployment failed:', err.message);
    res.status(500).send('Deployment failed');
  }
});

app.listen(8000, () => {
  console.log('🚀 Server listening on port 8000');
});
