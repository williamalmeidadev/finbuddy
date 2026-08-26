import { ExecutionContext } from '@nestjs/common';

import { getCurrentUser } from './current-user.decorator';

describe('CurrentUser', () => {
  it('should return the authenticated user from the request', () => {
    const user = {
      id: 'user-id',
      email: 'test@finbuddy.dev',
    };

    const request = {
      user,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    const result = getCurrentUser(context);

    expect(result).toEqual(user);
  });
});
