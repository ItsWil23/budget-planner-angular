import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from './user';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should expose the mocked user name and email', () => {
    expect(service.user().name).toBe('John Doe');
    expect(service.user().email).toBe('budgetplanner.user@example.com');
  });

  it('should not expose a write method on the user signal', () => {
    expect('set' in service.user).toBe(false);
  });
});
