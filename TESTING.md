# 🧪 Panduan Testing - Snappie API

## Persiapan

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Buat file `.env` berdasarkan `.env.example`:
```bash
cp .env.example .env
```

Pastikan konfigurasi database dan JWT secret sudah benar di file `.env`.

### 3. Setup Database (Opsional untuk Mock Test)
Jika ingin menjalankan test dengan database real:
```bash
# Buat database test
createdb snappie_test

# Jalankan migrasi (jika ada)
npm run migrate:test
```

## Cara Menjalankan Test

### 🚀 Perintah Dasar

#### Menjalankan Semua Test
```bash
npm test
```

#### Menjalankan Test dengan Output Detail
```bash
npm run test:verbose
```

#### Menjalankan Test dengan Coverage Report
```bash
npm run test:coverage
```

#### Menjalankan Test dalam Watch Mode (Auto-reload)
```bash
npm run test:watch
```

### 🎯 Menjalankan Test Spesifik

#### Test Berdasarkan File
```bash
# Test authentication
npx jest tests/auth.test.js

# Test health endpoint
npx jest tests/health.test.js

# Test users
npx jest tests/users.test.js

# Test places
npx jest tests/places.test.js

# Test social features
npx jest tests/social.test.js

# Test gamification
npx jest tests/gamification.test.js

# Test upload
npx jest tests/upload.test.js

# Test articles
npx jest tests/articles.test.js

# Test leaderboard
npx jest tests/leaderboard.test.js
```

#### Test Berdasarkan Pattern
```bash
# Test semua yang mengandung "auth"
npx jest --testNamePattern="auth"

# Test semua yang mengandung "login"
npx jest --testNamePattern="login"

# Test semua endpoint GET
npx jest --testNamePattern="GET"
```

### 📊 Test dengan Options Tambahan

#### Menjalankan Test dengan Debug Info
```bash
npx jest --verbose --detectOpenHandles
```

#### Menjalankan Test Tanpa Cache
```bash
npx jest --no-cache
```

#### Menjalankan Test dengan Timeout Custom
```bash
npx jest --testTimeout=15000
```

## 📁 Struktur Test Files

```
tests/
├── setup.js              # Global test setup
├── auth.test.js          # Authentication endpoints
├── users.test.js         # User management
├── places.test.js        # Places & locations
├── social.test.js        # Social media features
├── gamification.test.js  # Gamification system
├── upload.test.js        # File upload
├── articles.test.js      # Article management
├── leaderboard.test.js   # Leaderboard system
└── health.test.js        # Health check
```

## 🔧 Konfigurasi Test

### Jest Configuration (`jest.config.js`)
- **Test Environment**: Node.js
- **Test Pattern**: `**/tests/**/*.test.js`
- **Timeout**: 10 seconds
- **Coverage**: Controllers, middleware, models, routes, utils

### Environment Variables untuk Test
```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
DB_HOST=localhost
DB_PORT=5432
DB_NAME=snappie_test
DB_USER=postgres
DB_PASS=password
```

## 📈 Coverage Report

Setelah menjalankan `npm run test:coverage`, Anda akan mendapatkan:

1. **Terminal Output**: Coverage summary
2. **HTML Report**: `coverage/lcov-report/index.html`
3. **LCOV File**: `coverage/lcov.info`

## 🐛 Troubleshooting

### Test Gagal dengan Database Error
```bash
# Pastikan database test tersedia
createdb snappie_test

# Atau gunakan mock database dalam test
```

### Test Timeout
```bash
# Jalankan dengan timeout lebih besar
npx jest --testTimeout=20000
```

### Memory Issues
```bash
# Jalankan dengan memory limit
node --max-old-space-size=4096 ./node_modules/.bin/jest
```

### Open Handles Warning
```bash
# Jalankan dengan detect open handles
npx jest --detectOpenHandles --forceExit
```

## 📝 Tips Testing

1. **Jalankan test spesifik** saat development untuk feedback cepat
2. **Gunakan watch mode** untuk auto-reload saat coding
3. **Check coverage** secara berkala untuk memastikan test coverage
4. **Mock external dependencies** untuk test yang lebih cepat dan reliable
5. **Gunakan descriptive test names** untuk memudahkan debugging

## 🎯 Test Categories

### Unit Tests
- Model validation
- Utility functions
- Middleware logic

### Integration Tests
- API endpoints
- Database operations
- Authentication flow

### End-to-End Tests
- Complete user workflows
- Multi-endpoint interactions
- Real-world scenarios

---

**Happy Testing! 🚀**