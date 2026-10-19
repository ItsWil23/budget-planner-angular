import { Injectable, signal } from '@angular/core';
import { User } from '../models/user';
import { MOCK_USER } from '../mocks/mock-user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly _user = signal<User>(MOCK_USER);

  readonly user = this._user.asReadonly();
}
