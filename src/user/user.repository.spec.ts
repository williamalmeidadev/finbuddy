import { Test, TestingModule } from '@nestjs/testing';

import { DatabaseService } from '../database/database.service';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const data = {
        email: 'test@finbuddy.dev',
        passwordHash: 'hashed-password',
      };

      const createdUser = {
        id: 'user-id',
        ...data,
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.create.mockResolvedValue(createdUser);

      const result = await repository.create(data);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data,
      });

      expect(result).toEqual(createdUser);
    });
  });

  describe('findById', () => {
    it('should return the user found by id', async () => {
      const user = {
        id: 'user-id',
        email: 'test@finbuddy.dev',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await repository.findById(user.id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id },
      });

      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return the user found by email', async () => {
      const user = {
        id: 'user-id',
        email: 'test@finbuddy.dev',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await repository.findByEmail(user.email);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: user.email },
      });

      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@finbuddy.dev');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@finbuddy.dev' },
      });

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const id = 'user-id';

      const data = {
        email: 'updated@finbuddy.dev',
      };

      const updatedUser = {
        id,
        email: data.email,
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await repository.update(id, data);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });

      expect(result).toEqual(updatedUser);
    });
  });
});
