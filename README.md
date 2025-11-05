# Snappie API

REST API untuk aplikasi Snappie - platform discovery tempat makan dengan sistem reward dan gamifikasi.

## 🚀 Fitur

- **Autentikasi JWT**: Login/register dengan Google OAuth
- **Manajemen Places**: CRUD operations untuk tempat makan
- **Database PostgreSQL**: Dengan Sequelize ORM
- **Middleware**: Authentication dan validation
- **Environment Configuration**: Konfigurasi yang fleksibel

## 📋 Prerequisites

- Node.js (v14 atau lebih tinggi)
- PostgreSQL database
- npm atau yarn

## 🛠️ Installation

1. Clone repository ini:
```bash
git clone <repository-url>
cd snappie-api
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

4. Konfigurasi file `.env`:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_CONNECTION=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
```

5. Jalankan server:
```bash
npm run dev
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login dengan Google OAuth
- `POST /api/v1/auth/register` - Register user baru

### Places
- `GET /api/v1/places` - Ambil daftar places (dengan pagination)
- `POST /api/v1/places` - Buat place baru (requires auth)
- `PUT /api/v1/places/:id` - Update place (requires auth)
- `DELETE /api/v1/places/:id` - Hapus place (requires auth)

### Health Check
- `GET /api/v1/health` - Status kesehatan API

## 🗄️ Database Schema

### Users Table
- `id` (Primary Key)
- `email` (Unique)
- `name`
- `username` (Unique)
- `imageUrl`
- `provider` (google, facebook, etc.)
- `providerId`
- `createdAt`
- `updatedAt`

### Places Table
- `id` (Primary Key)
- `name`
- `description`
- `latitude`
- `longitude`
- `imageUrls` (JSON Array)
- `coinReward`
- `expReward`
- `minPrice`
- `maxPrice`
- `avgRating`
- `totalReview`
- `totalCheckin`
- `status` (Boolean)
- `partnershipStatus` (Boolean)
- `additionalInfo` (JSON Object)
- `createdAt`
- `updatedAt`

## 🔐 Authentication

API menggunakan JWT (JSON Web Token) untuk autentikasi. Setiap request yang memerlukan autentikasi harus menyertakan header:

```
Authorization: Bearer <your-jwt-token>
```

## 📝 Request/Response Examples

### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "username": "johndoe",
  "imageUrl": "https://example.com/avatar.jpg",
  "provider": "google",
  "providerId": "google123"
}
```

### Create Place
```bash
POST /api/v1/places
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Warung Makan Sederhana",
  "description": "Warung makan dengan menu tradisional Indonesia",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "imageUrls": ["https://example.com/image1.jpg"],
  "coinReward": 50,
  "expReward": 25,
  "minPrice": 15000,
  "maxPrice": 50000,
  "status": true,
  "partnershipStatus": true,
  "additionalInfo": {
    "placeDetail": {
      "address": "Jl. Sudirman No. 123, Jakarta",
      "phone": "021-12345678",
      "openingHours": "08:00-22:00"
    }
  }
}
```

## 🧪 Testing

Untuk menjalankan tests:
```bash
npm test
```

## 📁 Project Structure

```
snappie-api/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── placeController.js   # Places CRUD logic
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   └── validation.js       # Request validation middleware
├── models/
│   ├── User.js             # User model
│   └── Place.js            # Place model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── places.js           # Places routes
│   └── health.js           # Health check routes
├── utils/
│   └── jwt.js              # JWT utilities
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
└── server.js               # Main application entry point
```

## 🤝 Contributing

1. Fork repository ini
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

Project Link: [https://github.com/yourusername/snappie-api](https://github.com/yourusername/snappie-api)