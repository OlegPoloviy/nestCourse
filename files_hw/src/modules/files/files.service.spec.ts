import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from './files.service';
import {
  FileRecordEntity,
  FileStatus,
  FileVisibility,
} from './file-record.entity';
import { Product } from '../products/products.entity';
import { ObjectStorageService } from './object-storage.service';

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('FilesService', () => {
  let service: FilesService;
  let fileRepository: MockRepo<FileRecordEntity>;
  let objectStorageService: {
    objectExists: jest.Mock;
    getFileViewUrl: jest.Mock;
    createPresignedUploadUrl: jest.Mock;
  };

  beforeEach(async () => {
    fileRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    objectStorageService = {
      objectExists: jest.fn(),
      getFileViewUrl: jest.fn(),
      createPresignedUploadUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(FileRecordEntity),
          useValue: fileRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {},
        },
        {
          provide: ObjectStorageService,
          useValue: objectStorageService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('rejects completeUpload when object is absent in storage', async () => {
    const fileRecord: FileRecordEntity = {
      id: 'file-id',
      ownerId: 'owner-id',
      productId: 'product-id',
      key: 'products/product-id/file.webp',
      contentType: 'image/webp',
      size: 100,
      status: FileStatus.PENDING,
      visibility: FileVisibility.PUBLIC,
      owner: undefined as never,
      product: undefined as never,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    fileRepository.findOne?.mockResolvedValue(fileRecord);
    objectStorageService.objectExists.mockResolvedValue(false);

    await expect(
      service.completeUpload({ fileId: 'file-id' }, 'owner-id'),
    ).rejects.toThrow(BadRequestException);
    expect(fileRepository.save).not.toHaveBeenCalled();
  });
});
