import { Injectable } from '../../../core/decorators/Injectable';

@Injectable()
export class UserService {
  private users = [{ id: 1, name: 'John Doe' }];

  findAll() {
    return this.users;
  }
}