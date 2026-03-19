import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as request from 'supertest';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { ObjectStorageService } from '../src/modules/files/object-storage.service';
import {
  FileRecordEntity,
  FileStatus,
} from '../src/modules/files/file-record.entity';
import { UserEntity } from '../src/modules/user/user.entity';
import { Product } from '../src/modules/products/products.entity';

dotenv.config({ path: resolve(__dirname, '../.env') });

/**
 * Integration/e2e: presign → complete без PUT у S3.
 * ObjectStorageService мокається як «об’єкта ще нема» (як після presign без upload).
 * Потрібні: PostgreSQL з накатаними міграціями та змінні з .env (DB_*).
 */
describe('Files complete without S3 upload (e2e)', () => {
  let app: INestApplication;
  let jwt: string;
  let productId: string;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    const objectStorageMock = {
      createPresignedUploadUrl: jest
        .fn()
        .mockResolvedValue('http://localhost:9000/fake-presigned-put'),
      objectExists: jest.fn().mockResolvedValue(false),
      getFileViewUrl: jest.fn().mockReturnValue('http://localhost:9000/view'),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ObjectStorageService)
      .useValue(objectStorageMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(UserEntity);
    const productRepo = dataSource.getRepository(Product);

    const adminEmail = 'e2e-files-admin@test.local';
    let admin = await userRepo.findOne({ where: { email: adminEmail } });
    if (!admin) {
      admin = await userRepo.save(
        userRepo.create({
          name: 'E2E Files Admin',
          email: adminEmail,
          passwordHash: await bcrypt.hash('e2e-pass-123', 10),
          roles: ['admin'],
          scopes: [],
        }),
      );
    } else if (!admin.roles?.includes('admin')) {
      admin.roles = [...(admin.roles ?? []), 'admin'];
      await userRepo.save(admin);
    }

    const sku = 'E2E-FILES-SKU';
    let product = await productRepo.findOne({ where: { sku } });
    if (!product) {
      product = await productRepo.save(
        productRepo.create({
          name: 'E2E product for files',
          sku,
          description: 'e2e',
          price: 1,
          stock: 1,
          isActive: true,
        }),
      );
    }
    productId = product.id;

    const jwtService = app.get(JwtService);
    jwt = await jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      roles: admin.roles ?? ['admin'],
      scopes: admin.scopes ?? [],
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('presign then complete without PUT → 4xx and DB stays pending', async () => {
    const presignRes = await request(app.getHttpServer())
      .post('/api/files/presign')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        productId,
        fileName: 'e2e-no-upload.jpg',
        contentType: 'image/jpeg',
        fileSize: 100,
      })
      .expect(201);

    const fileId = presignRes.body.fileId as string;
    expect(fileId).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/files/complete')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ fileId })
      .expect((res) => {
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
      });

    const dataSource = app.get(DataSource);
    const fileRepo = dataSource.getRepository(FileRecordEntity);
    const row = await fileRepo.findOne({ where: { id: fileId } });
    expect(row).not.toBeNull();
    expect(row!.status).toBe(FileStatus.PENDING);
  });
});
