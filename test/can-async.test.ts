import stateMachine from '../src';

interface User {
  state: 'inactive' | 'active' | 'banned';
}

const sm = stateMachine({
  states: ['inactive', 'active', 'banned'] as const,
  transitions: {
    activate: { from: 'inactive', to: 'active' },
    deactivate: { from: 'active', to: 'inactive' },
    ban: { from: ['inactive', 'active'], to: 'banned' },
  },
  getState: (user: User) => new Promise<User['state']>((resolve) => {
    setTimeout(() => {
      resolve(user.state);
    });
  }),
  setState: (user: User, state) => new Promise<void>((resolve) => {
    setTimeout(() => {
      user.state = state;
      resolve();
    });
  }),
});

describe('stateMachine.can (async)', () => {
  test('returns true for a valid transition', async () => {
    const user: User = {
      state: 'inactive',
    };
    const result = sm.can('activate', user);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toStrictEqual(true);
  });

  test('returns true for a valid transition where "from" supports multiple states', async () => {
    const user: User = {
      state: 'active',
    };
    const result = sm.can('ban', user);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toStrictEqual(true);
  });

  test('should return false on invalid transition', async () => {
    const user: User = {
      state: 'active',
    };
    const result = sm.can('activate', user);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toStrictEqual(false);
  });

  test('should return false on invalid transition when "from" supports multiple states', async () => {
    const user: User = {
      state: 'banned',
    };
    const result = sm.can('ban', user);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toStrictEqual(false);
  });
});