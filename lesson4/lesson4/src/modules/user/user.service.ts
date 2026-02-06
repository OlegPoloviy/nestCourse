import { Injectable } from '@nestjs/common';
import { CreateUserDtoV1 } from './v1/dto/create-user.dto.v1';
import { UserEntity } from './user.entity';
import { UserDtoV2 } from './v2/dto/user.dto.v2';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from './profile.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profilesRepository: Repository<ProfileEntity>,
  ) {}

  async getAll(limit?: number) {
    const data =
      limit !== undefined && limit >= 0
        ? await this.usersRepository.find({ take: limit })
        : await this.usersRepository.find();

    const count = await this.usersRepository.count();

    return { count, data };
  }

  async addUserV1(dto: CreateUserDtoV1) {
    const newUser = this.usersRepository.create({
      ...dto,
    } as Partial<UserEntity>);

    return await this.usersRepository.save(newUser);
  }

  async deleteUser(id: string) {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      return { ok: false, message: 'User not found' };
    }
    return { ok: true };
  }

  async addUserV2(dto: UserDtoV2) {
    let profileEntity: ProfileEntity | undefined;

    if (dto.profile) {
      // Create profile entity from DTO and save it first so we have its id
      profileEntity = this.profilesRepository.create(
        dto.profile as Partial<ProfileEntity>,
      );
      profileEntity = await this.profilesRepository.save(profileEntity);
    }

    const newUser = this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      profile: profileEntity ?? null,
    } as Partial<UserEntity>);

    return await this.usersRepository.save(newUser);
  }
}
