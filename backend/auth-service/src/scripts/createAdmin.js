import { User, sequelize } from '../models/User.js';
import bcrypt from 'bcryptjs';

const createAdminUser = async () => {
  try {
    // Veritabanı bağlantısını test et
    await sequelize.authenticate();
    console.log('Veritabanına başarıyla bağlandı');

    // Tabloları senkronize et
    await sequelize.sync();

    // Admin kullanıcısının var olup olmadığını kontrol et
    const adminExists = await User.findOne({
      where: {
        roles: ['admin']
      }
    });

    if (adminExists) {
      console.log('Admin kullanıcısı zaten mevcut');
      process.exit(0);
    }

    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!@#', salt);

    // Yeni admin kullanıcısı oluştur
    await User.create({
      username: 'admin',
      email: 'admin@xcord.com',
      password: hashedPassword,
      roles: ['admin'],
      isActive: true
    });

    console.log('Admin kullanıcısı başarıyla oluşturuldu');

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createAdminUser();