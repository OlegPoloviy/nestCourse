import { Injectable } from '../../../core/decorators/Injectable';

@Injectable()
export class UserService {
  private users = [{ id: 1, name: 'John Doe' }];

  findAll() {
    return this.users;
  }

  findById(id: number){
    return this.users.find(user => user.id === id);
  }
  create(user: any) {
    this.users.push(user);
    return user;
  }
}